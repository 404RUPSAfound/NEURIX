# 🚀 NEURIX Tactical AI Platform: Quick Start Guide

This project consists of three main services that need to run in separate terminal windows.

## 🟢 1. Main Backend (Python/FastAPI)
- **Path**: `cd Backend`
- **Install Requirements**: `pip install -r requirements.txt`
- **Run**: `uvicorn api:app --reload --port 8000`

## 🟡 2. Satellite Backend (Node.js/Express)
- **Path**: `cd SatelliteBackend`
- **Install Dependencies**: `npm install`
- **Run**: `npm start`

## 🔵 3. Frontend / Mission Control (React Native / Expo)
- **Path**: (Root Project Folder)
- **Install Dependencies**: `npm install`
- **Run**: `npx expo start`
  - Press **'w'** for web browser.
  - Scan QR code with **Expo Go** app for mobile.

---

### ✅ Health Check URLs
Once running, verify each service:
- **Backend**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Satellite**: [http://localhost:3000/health](http://localhost:3000/health) (or check `app.js` for exact route)
- **Frontend**: `http://localhost:19006` (standard Expo web port)
