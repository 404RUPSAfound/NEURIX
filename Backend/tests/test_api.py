import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add Backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.database import Base, engine, init_db
init_db()  # Ensure all tables (including sos_events) exist in SQLite

from api import app

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
