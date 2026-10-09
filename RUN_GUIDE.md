# NEURIX — Operational Run & Verification Guide

This guide contains the exact commands required to execute, test, and verify the complete NEURIX platform.

---

## 1. Environment Setup

### Environment Variables
Ensure the following `.env` files are in place:

1. **Root Directory (`.env`)**:
   ```env
   EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
   EXPO_PUBLIC_SATELLITE_API_URL=http://localhost:3001
   ```

2. **Backend Directory (`Backend/.env`)**:
   ```env
   PROJECT_NAME=NEURIX Tactical Intelligence
   VERSION=2.0.0
   SECRET_KEY=neurix-tactical-secure-key-2026-ndrf-xyz-abc
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_HOURS=72
   DATABASE_URL=sqlite:///./neurix.db
   ```

3. **Satellite Service (`SatelliteBackend/.env`)**:
   ```env
   PORT=3001
   NODE_ENV=development
   ```

---

## 2. Startup Instructions

### Step 1: Start FastAPI Backend (Terminal 1)
```bash
cd Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```
- Verify API Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/health`

### Step 2: Start Satellite Service (Terminal 2)
```bash
cd SatelliteBackend
npm start
```
- Health Endpoint: `http://localhost:3001/health`

### Step 3: Start Expo Mobile / Web App (Terminal 3)
```bash
# In the root directory
npm start
```
- Press **w** for Web bundle.
- Press **a** for Android emulator.

---

## 3. Automated Test Commands

### Backend Automated Test Suite
```bash
cd Backend
python -m pytest tests/test_api.py -v
```

### Frontend TypeScript Check
```bash
# In the root directory
npx tsc --noEmit
```

---

## 4. Verification Checklist

- [x] **Authentication Flow**: Registration generates OTP -> Verification issues JWT -> Login accepts verified user credentials.
- [x] **SOS Alert Protocol**: `/api/sos` and `/api/ops/sos` save `SOSEvent` to SQLite, locate nearest hospital, and trigger alert.
- [x] **Offline Data Sync**: `/offline/sync` ingests offline field records; `/sync/pull` delivers updated playbooks.
- [x] **Geospatial & Discovery**: Parallel Overpass proxy mirrors query nearby shops, pharmacies, and water points.
- [x] **TypeScript Validation**: `npx tsc --noEmit` runs with 0 compilation errors.
