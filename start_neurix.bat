@echo off
echo 🚀 NEURIX Tactical AI Platform - Multi-Service Bootstrapper
echo ---------------------------------------------------------

:: 1. Start Main Backend (Python/FastAPI)
echo [1/3] Starting Main Backend on Port 8000...
start "NEURIX-Backend" cmd /k "cd Backend && venv\Scripts\activate 2>nul || python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt & uvicorn api:app --reload --port 8000"

:: 2. Start Satellite Backend (Node.js/Express)
echo [2/3] Starting Satellite Backend on Port 3000...
start "NEURIX-Satellite" cmd /k "cd SatelliteBackend && npm install && npm start"

:: 3. Start Frontend (React Native/Expo)
echo [3/3] Starting Mission Control Frontend...
start "NEURIX-Frontend" cmd /k "npm install && npx expo start"

echo ---------------------------------------------------------
echo ✅ All services are booting up in separate windows.
echo ---------------------------------------------------------
pause
