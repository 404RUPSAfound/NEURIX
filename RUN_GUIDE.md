# NEURIX — Run Guide

This guide contains the actual commands required to run the NEURIX platform locally.

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.10 or higher)
- **Git**
- **Ollama** (Optional, for offline AI fallback)

## 2. Clone the Repository
```bash
git clone https://github.com/404RUPSAfound/NEURIX.git
cd NEURIX
```

## 3. Install Dependencies & Environment Setup
The project has three separate parts that require setup.

**Frontend:**
```bash
npm install
cp .env.example .env
```
*Edit `.env` to set your EXPO_PUBLIC_API_URL if testing on a physical device.*

**FastAPI Backend:**
```bash
cd Backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ..
```
*Edit `Backend/.env` to configure your API keys (Gemini, SMTP, Maps).*

**Satellite Service (Node.js):**
```bash
cd SatelliteBackend
npm install
cp .env.example .env
cd ..
```

## 4. Database Setup
The SQLite database (`neurix.db`) will be automatically created and initialized by SQLAlchemy when you start the FastAPI backend for the first time. No manual setup is required.

## 5. Startup Commands
You will need three separate terminal windows to run the full stack.

### Backend Startup (Terminal 1)
```bash
cd Backend
# Windows
venv\Scripts\activate
# Mac/Linux
# source venv/bin/activate
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```
API Docs will be available at: http://127.0.0.1:8000/docs

### API / Satellite Startup (Terminal 2)
```bash
cd SatelliteBackend
npm start
```
Satellite backend will be available at: http://localhost:3001

### Frontend Startup (Terminal 3)
```bash
# In the project root
npx expo start
```
- Press **w** to open the web version.
- Press **a** to run on Android emulator.
- Press **i** to run on iOS simulator.

### Windows One-Click Start (Alternative)
On Windows, you can simply run the provided batch script from the root directory to open all three services:
```bash
start_neurix.bat
```

## 6. Offline AI Setup (Optional)
To test the offline AI feature:
1. Install [Ollama](https://ollama.ai)
2. Run `ollama pull qwen2.5:0.5b`
3. Run `ollama serve`

## 7. Build Instructions (APK / IPA)
To build the app for production using EAS (Expo Application Services):
```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

## 8. Troubleshooting & Common Errors
- **Network Request Failed (Android/iOS):** If running on a physical device or emulator, `http://127.0.0.1:8000` might not resolve to your computer. Change `EXPO_PUBLIC_API_URL` in `.env` to your computer's local IP address (e.g., `http://192.168.1.5:8000`).
- **Python Module Not Found:** Ensure your virtual environment is activated before running `uvicorn`.
- **Port In Use (8000/3001/8082):** Kill any existing node or python processes running on these ports, or change the port in the respective `.env` files.
- **SQLite Locking Errors:** If multiple processes try to write to `neurix.db`, you may get locking errors. Stop the backend and start it again.
- **Expo clear cache:** If frontend changes aren't reflecting, run `npx expo start -c`.
