# NEURIX — Quick Start Guide

This project runs three services simultaneously. Each requires its own terminal window.

---

## 1. FastAPI Backend (Python)

```bash
cd Backend
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

- **API Docs**: http://127.0.0.1:8000/docs
- **Health**: http://127.0.0.1:8000/

---

## 2. Satellite Tile Service (Node.js)

```bash
cd SatelliteBackend
npm install
npm start
```

- **Health**: http://localhost:3001/health
- Runs on port **3001** by default (configurable via `SatelliteBackend/.env`)

---

## 3. Frontend (React Native / Expo)

```bash
# From the project root
npm install
npx expo start
```

- Press **`w`** to open in browser
- Scan QR code with **Expo Go** app (Android/iOS)
- Web runs on: http://localhost:8082

---

## Windows One-Click Start

```bash
start_neurix.bat
```

Opens all three services in separate terminal windows.

---

## Environment Files

Before starting, set up your environment:

```bash
# Frontend
cp .env.example .env

# Backend
cp Backend/.env.example Backend/.env

# Satellite backend
cp SatelliteBackend/.env.example SatelliteBackend/.env
```

Edit each `.env` with your actual values. See `README.md` for details.

---

## Optional: Offline AI (Ollama)

To enable the on-device AI chat feature, install [Ollama](https://ollama.ai) and run:

```bash
ollama pull qwen2.5:0.5b
ollama serve
```

The backend will automatically detect and use Ollama when available.
