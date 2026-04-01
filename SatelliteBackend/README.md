# NEURIX Satellite Reconnaissance Microservice (Node.js)

A high-performance, scalable geospatial backend service designed to normalize and serve satellite imagery tiles in XYZ format.

---

## 🛰️ Key Features

- **NASA GIBS Integration**: High-resolution VIIRS and MODIS truecolor imagery.
- **Copernicus Sentinel-2**: Cloud-free multispectral imagery (Truecolor/NDVI) via Sentinel Hub.
- **XYZ Normalization**: Automatic mapping of `z/x/y` coordinates to OGC WMTS standards.
- **High-Speed Caching**: In-memory binary buffer caching for low-latency map interactions.
- **Production Guardrails**: Rate limiting, automated retries (exponential backoff), and structured logging.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Environment Configuration
Copy the template and add your credentials:
```bash
cp .env.example .env
```
Edit `.env` with your **Sentinel Hub Client ID** and **Client Secret**. (NASA GIBS does not require a key for public layers).

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Service
```bash
# Development Mode
npm start
```
The service will live-load at: `http://localhost:3001`

---

## 📡 API Endpoints

### 🗺️ Imagery Tiles
Standard XYZ format compatible with Mapbox, Leaflet, and React Native Maps.

- **NASA GIBS**:
  `GET /api/v1/tiles/nasa/:z/:x/:y?layer=VIIRS_SNPP_CorrectedReflectance_TrueColor`
- **Sentinel Hub**:
  `GET /api/v1/tiles/sentinel/:z/:x/:y?type=truecolor`

### 🏗️ Global Metadata
Fetch service capability and attribution data.

- **Get Metadata**:
  `GET /api/v1/metadata`

---

## ⚙️ Architecture

- **App Core**: `app.js` (Security, Middleware, Scaling)
- **Services**: `services/` (Data fetching and OAuth flow)
- **Routes**: `routes/` (XYZ endpoint logic)
- **Caching**: `utils/cacheUtil.js` (In-memory tile management)
- **Logging**: `utils/logger.js` (Winston production logging)
