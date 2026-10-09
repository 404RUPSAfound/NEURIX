from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import base64
import hashlib
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger
from cryptography.fernet import Fernet

from core.config import settings

import passlib.handlers.bcrypt
try:
    passlib.handlers.bcrypt.detect_wrap_bug = lambda *args, **kwargs: False
except Exception:
    pass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False) 

DEV_FALLBACK_SECRET = "neurix-tactical-secure-key-2026-ndrf-xyz-abc"

def derive_fernet_key(secret_str: str) -> bytes:
    h = hashlib.sha256(secret_str.encode()).digest()
    return base64.urlsafe_b64encode(h)

# Fernet Key Derivation
def get_encryption_key() -> bytes:
    """Derive a 32-byte key for Fernet from the ENCRYPTION_KEY."""
    return derive_fernet_key(settings.ENCRYPTION_KEY)

def encrypt_data(plain_text: str) -> str:
    if not plain_text: return ""
    f = Fernet(get_encryption_key())
    return f.encrypt(plain_text.encode()).decode()

def decrypt_data(cipher_text: str) -> str:
    if not cipher_text: return ""
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(cipher_text.encode()).decode()
    except Exception as exc:
        env_lower = (settings.ENVIRONMENT or "").lower().strip()
        if env_lower not in ["production", "prod"] and settings.ENCRYPTION_KEY != DEV_FALLBACK_SECRET:
            try:
                f_fallback = Fernet(derive_fernet_key(DEV_FALLBACK_SECRET))
                return f_fallback.decrypt(cipher_text.encode()).decode()
            except Exception:
                pass
        logger.error(f"Decryption failed: {exc}")
        return "[ENCRYPTED DATA]"

import bcrypt

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    if len(pwd_bytes) > 72:
        raise ValueError("Password exceeds 72-byte bcrypt limit.")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        if len(pwd_bytes) > 72:
            return False
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not credentials:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed (no token)")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as exc:
        logger.warning(f"JWT decode failed: {exc}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed (invalid token)")


def optional_verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """Same as verify_token but returns None when missing/invalid — for public-style flows like /analyze."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        logger.debug(f"optional_verify_token skip: {exc}")
        return None


ROLE_HIERARCHY: Dict[str, set] = {
    "admin": {"admin", "commander", "responder", "volunteer"},
    "commander": {"commander", "responder", "volunteer"},
    "responder": {"responder", "volunteer"},
    "volunteer": {"volunteer"}
}

def require_role(required_roles: Any):
    """Enforces Role-Based Access Control (RBAC) with explicit role hierarchy."""
    allowed_roles = {required_roles} if isinstance(required_roles, str) else set(required_roles)
    def role_checker(payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
        raw_role = payload.get("role")
        if not raw_role or not isinstance(raw_role, str):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: missing or invalid user role."
            )
        user_role = raw_role.lower().strip()
        if user_role not in ROLE_HIERARCHY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: missing or invalid user role."
            )
        user_permissions = ROLE_HIERARCHY.get(user_role, set())
        if not user_permissions.intersection(allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: insufficient role privileges. Required: {list(allowed_roles)}"
            )
        return payload
    return role_checker
