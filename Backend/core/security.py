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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False) 

# Fernet Key Derivation
def get_encryption_key() -> bytes:
    """Derive a 32-byte key for Fernet from the SECRET_KEY."""
    h = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(h)

def encrypt_data(plain_text: str) -> str:
    if not plain_text: return ""
    f = Fernet(get_encryption_key())
    return f.encrypt(plain_text.encode()).decode()

def decrypt_data(cipher_text: str) -> str:
    if not cipher_text: return ""
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(cipher_text.encode()).decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return "[ENCRYPTED DATA]"

def get_password_hash(password: str) -> str:
    # bcrypt (passlib) has a 72-byte limit. 
    # Truncate here to avoid ValueError and maintain standard bcrypt behavior.
    return pwd_context.hash(password[:72])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password[:72], hashed_password)
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
