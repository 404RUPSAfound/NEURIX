import os
import sys
import pytest
from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient
from cryptography.fernet import Fernet

# Add Backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.database import Base, engine, init_db
init_db()  # Ensure all tables (including sos_events) exist in SQLite

from core.config import Settings, settings
from core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    encrypt_data,
    decrypt_data,
    derive_fernet_key,
    DEV_FALLBACK_SECRET
)
from api import app
from db import models, database

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NEURIX_ONLINE"

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

def test_security_production_validation():
    # 1. Default dev secret in production -> RuntimeError
    for env_variant in ["production", "prod", "PROD", "Production"]:
        prod_settings = Settings()
        prod_settings.ENVIRONMENT = env_variant
        prod_settings.SECRET_KEY = "neurix-tactical-secure-key-2026-ndrf-xyz-abc"
        with pytest.raises(RuntimeError, match="CRITICAL SECURITY ERROR"):
            prod_settings.validate_security()

    # 2. Short secret in production (<32 bytes) -> RuntimeError
    short_settings = Settings()
    short_settings.ENVIRONMENT = "production"
    short_settings.SECRET_KEY = "too-short"
    with pytest.raises(RuntimeError, match="at least 32 bytes"):
        short_settings.validate_security()

    # 3. Explicit empty secret in production -> RuntimeError
    empty_settings = Settings()
    empty_settings.ENVIRONMENT = "prod"
    empty_settings.SECRET_KEY = ""
    with pytest.raises(RuntimeError, match="CRITICAL SECURITY ERROR"):
        empty_settings.validate_security()

def test_password_hashing_and_limits():
    # 1. Normal password
    hashed = get_password_hash("ValidPass123!")
    assert verify_password("ValidPass123!", hashed) is True
    assert verify_password("WrongPass123!", hashed) is False

    # 2. Oversized password (> 72 bytes ASCII)
    oversized = "A" * 73
    with pytest.raises(ValueError, match="exceeds 72-byte"):
        get_password_hash(oversized)

    assert verify_password(oversized, hashed) is False

def test_password_multibyte_utf8_boundaries():
    # 1. Exactly 72 bytes UTF-8 (24 CJK characters x 3 bytes = 72 bytes)
    exact_72_bytes = "你好世界" * 6
    assert len(exact_72_bytes.encode('utf-8')) == 72
    hashed_72 = get_password_hash(exact_72_bytes)
    assert verify_password(exact_72_bytes, hashed_72) is True

    # 2. 75 bytes UTF-8 (25 CJK characters x 3 bytes = 75 bytes)
    over_72_bytes = "你好世界" * 6 + "你"
    assert len(over_72_bytes.encode('utf-8')) == 75
    with pytest.raises(ValueError, match="exceeds 72-byte"):
        get_password_hash(over_72_bytes)

    # 3. /auth/register endpoint returns HTTP 422 for overlong multibyte password
    reg_overlong = client.post("/auth/register", json={
        "name": "Multibyte User",
        "email": "multibyte_test@neurix.local",
        "password": over_72_bytes
    })
    assert reg_overlong.status_code == 422
    assert "exceeds 72-byte" in reg_overlong.json()["detail"]

def test_encryption_legacy_compatibility():
    # 1. Standard encryption/decryption with current settings
    pt = "Sensitive NDRF Tactical Intelligence"
    ct = encrypt_data(pt)
    assert ct != pt
    assert decrypt_data(ct) == pt

    # 2. Legacy ciphertext created with DEV_FALLBACK_SECRET
    dev_fernet = Fernet(derive_fernet_key(DEV_FALLBACK_SECRET))
    legacy_ciphertext = dev_fernet.encrypt(pt.encode()).decode()

    # Even if ENCRYPTION_KEY is different, legacy ciphertext decrypts via dev fallback
    assert decrypt_data(legacy_ciphertext) == pt

def test_authorization_boundaries():
    # 1. Missing Token -> 401
    resp_no_auth = client.post("/api/user/heartbeat?lat=28.6139&lon=77.2090")
    assert resp_no_auth.status_code == 401

    # 2. Invalid Token -> 401
    resp_bad_token = client.post("/api/user/heartbeat?lat=28.6139&lon=77.2090", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert resp_bad_token.status_code == 401

    # 3. Expired Token -> 401
    expired_payload = {
        "sub": "test_user",
        "exp": datetime.utcnow() - timedelta(hours=1),
        "role": "volunteer"
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    resp_expired = client.post("/api/user/heartbeat?lat=28.6139&lon=77.2090", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp_expired.status_code == 401

def test_rbac_role_hierarchy_and_escalation():
    vol_token = create_access_token({"sub": "vol_usr", "role": "volunteer"})
    resp_token = create_access_token({"sub": "resp_usr", "role": "responder"})
    cmd_token = create_access_token({"sub": "cmd_usr", "role": "commander"})
    admin_token = create_access_token({"sub": "admin_usr", "role": "admin"})

    # Invalid / Missing role payloads -> 403 Forbidden
    no_role_token = create_access_token({"sub": "norole_usr"})
    hacker_token = create_access_token({"sub": "hacker_usr", "role": "hacker"})

    # /sentinel/sync requires admin or commander
    r_vol = client.post("/sentinel/sync", headers={"Authorization": f"Bearer {vol_token}"})
    assert r_vol.status_code == 403

    r_norole = client.post("/sentinel/sync", headers={"Authorization": f"Bearer {no_role_token}"})
    assert r_norole.status_code == 403

    r_hacker = client.post("/sentinel/sync", headers={"Authorization": f"Bearer {hacker_token}"})
    assert r_hacker.status_code == 403

    r_cmd = client.post("/sentinel/sync", headers={"Authorization": f"Bearer {cmd_token}"})
    assert r_cmd.status_code == 200

    r_admin = client.post("/sentinel/sync", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_admin.status_code == 200

def test_idor_report_access_and_delete():
    # Setup test report for user_a
    db = next(database.get_db())
    rep_id = "SEC_TEST_RPT_001"
    existing = db.query(models.DisasterReport).filter(models.DisasterReport.id == rep_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    rpt = models.DisasterReport(
        id=rep_id,
        user_id="user_a",
        disaster_type="flood",
        severity="high",
        location="Sector 9",
        raw_summary="IDOR Protection Test Report"
    )
    db.add(rpt)
    db.commit()

    tok_a = create_access_token({"sub": "user_a", "role": "volunteer"})
    tok_b = create_access_token({"sub": "user_b", "role": "volunteer"})
    tok_cmd = create_access_token({"sub": "cmd_user", "role": "commander"})

    # 1. User B tries to download User A's report PDF -> 403 Forbidden
    pdf_b = client.get(f"/history/{rep_id}/pdf", headers={"Authorization": f"Bearer {tok_b}"})
    assert pdf_b.status_code == 403

    # 2. User A downloads own report PDF -> 200 OK
    pdf_a = client.get(f"/history/{rep_id}/pdf", headers={"Authorization": f"Bearer {tok_a}"})
    assert pdf_a.status_code == 200

    # 3. User B tries to delete User A's report -> 403 Forbidden
    del_b = client.delete(f"/history/{rep_id}", headers={"Authorization": f"Bearer {tok_b}"})
    assert del_b.status_code == 403

    # 4. Commander deletes User A's report -> 200 OK
    del_cmd = client.delete(f"/history/{rep_id}", headers={"Authorization": f"Bearer {tok_cmd}"})
    assert del_cmd.status_code == 200

def test_auth_workflow():
    contact = "test_operator_2026@neurix.org"
    
    # 1. Register / Request OTP
    reg_resp = client.post("/auth/register", json={
        "name": "Test Operator",
        "email": contact,
        "password": "TestPassword123"
    })
    assert reg_resp.status_code == 200
    assert reg_resp.json()["success"] is True

    # Check OTP in memory store
    from api import OTP_STORE
    assert contact in OTP_STORE
    otp = OTP_STORE[contact]["code"]

    # 2. Verify OTP
    ver_resp = client.post("/auth/verify-otp", json={
        "contact": contact,
        "otp": otp
    })
    assert ver_resp.status_code == 200
    ver_data = ver_resp.json()
    assert "token" in ver_data

    # 3. Login
    login_resp = client.post("/auth/login", json={
        "username": contact,
        "password": "TestPassword123"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "token" in login_data

def test_sos_protocol():
    sos_payload = {
        "lat": 28.6139,
        "lng": 77.2090,
        "trigger_type": "manual_sos",
        "blood_group": "O+",
        "allergies": "None",
        "battery": 85
    }
    
    resp = client.post("/api/sos", json=sos_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "sos_id" in data
    assert data["status"] == "TACTICAL_LINK_ESTABLISHED"

    # Test /api/ops/sos alias
    resp_alias = client.post("/api/ops/sos", json=sos_payload)
    assert resp_alias.status_code == 200
    assert resp_alias.json()["success"] is True

def test_offline_sync():
    pull_resp = client.get("/sync/pull")
    assert pull_resp.status_code == 200
    assert pull_resp.json()["success"] is True

    sync_payload = {
        "records": [
            {
                "id": "OFF_TEST_001",
                "data": {
                    "disaster_type": "flood",
                    "severity": "high",
                    "location": "Sector 4",
                    "description": "Flash flood near bridge"
                },
                "timestamp": "2026-10-09T12:00:00Z"
            }
        ]
    }
    sync_unauth = client.post("/offline/sync", json=sync_payload)
    assert sync_unauth.status_code == 401

def test_discovery_utilities():
    resp = client.get("/api/discovery/utilities?lat=28.6139&lng=77.2090&type=shop")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
