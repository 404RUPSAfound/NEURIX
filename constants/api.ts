import { Platform } from 'react-native';

/**
 * Backend base URL (FastAPI :8001).
 * - Android emulator: 10.0.2.2 → host machine.
 * - iOS simulator / web dev: localhost.
 * - Physical phone: set USE_DEVICE_LAN true and LAN_HOST to your PC’s Wi‑Fi IP (ipconfig).
 */
const LAN_HOST = '192.168.1.100';
const USE_DEVICE_LAN = false;

export const API_BASE_URL = USE_DEVICE_LAN
  ? `http://${LAN_HOST}:8000`
  : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';
