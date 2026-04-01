import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL as PLATFORM_API_BASE } from '@/constants/api';

const DEFAULT_API_PORT = 8001;

// C:\Users\RUPSA\Desktop\NEURIX\Store\api.ts
// Decide API base once for all platforms.
// Priority: EXPO_PUBLIC_API_URL env → derived from Expo host → platform fallbacks.
const resolveHostFromExpo = () => {
  // Expo hostUri examples: "192.168.0.197:8081", "localhost:8081", "10.0.2.2:19000"
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants.manifest2 as any)?.extra?.expoClient?.hostUri ||
    null;

  if (!hostUri) return null;
  const hostPart = hostUri.split(':')[0];

  // Android emulator needs the special loopback
  if (Platform.OS === 'android' && hostPart === 'localhost') return '10.0.2.2';
  if (hostPart === '0.0.0.0') return '127.0.0.1';
  return hostPart || null;
};

const host = process.env.EXPO_PUBLIC_API_URL
  ? null
  : resolveHostFromExpo();

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (host ? `http://${host}:${DEFAULT_API_PORT}` : PLATFORM_API_BASE);

export const API_BASE_URL = BASE_URL;

// Satellite microservice configuration (Node.js)
const SATELLITE_API_URL = process.env.EXPO_PUBLIC_SATELLITE_API_URL || 
  (host ? `http://${host}:3001` : 'http://localhost:3001');

const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });
const satelliteApi = axios.create({ baseURL: SATELLITE_API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('neurix_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail;

      if (status === 401) {
        // Token expired or invalid
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
      if (status === 403) {
        // Unverified or Forbidden
        return Promise.reject(new Error(detail || 'Access Denied. Verification Required.'));
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data && res.data.token) {
        await AsyncStorage.setItem('neurix_token', res.data.token);
        await AsyncStorage.setItem('neurix_user', JSON.stringify(res.data));
        return res.data;
      }
      throw new Error('Invalid response from server');
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
         throw new Error('Invalid credentials. Please check your username/password.');
      }
      throw new Error(e.message || 'Login failed');
    }
  },
  register: async (payload: { name: string; email?: string; phone?: string; password: string }) => {
    try {
      const res = await api.post('/auth/register', payload);
      return res.data;
    } catch (e: any) {
      if (e.response?.data?.detail) throw new Error(e.response.data.detail);
      throw new Error(e.message || 'Registration failed');
    }
  },
  sendOTP: async (contact: string, method: string) => {
    try {
      // In this version, we re-trigger registration or a dedicated resend if needed
      const res = await api.post('/auth/register', { contact });
      return res.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Could not send OTP');
    }
  },
  verifyOTP: async (contact: string, otp: string) => {
    try {
      const res = await api.post('/auth/verify-otp', { contact, otp });
      return res.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Invalid OTP');
    }
  },
  saveSession: async (data: any) => {
    await AsyncStorage.setItem('neurix_token', data.token);
    await AsyncStorage.setItem('neurix_user', JSON.stringify(data));
  },
  logout: async () => {
    await AsyncStorage.removeItem('neurix_token');
    await AsyncStorage.removeItem('neurix_user');
  },
  getUser: async () => {
    const u = await AsyncStorage.getItem('neurix_user');
    return u ? JSON.parse(u) : null;
  },
  syncOfflineRecords: async () => {
    try {
      const stored = await AsyncStorage.getItem('neurix_offline_pending');
      if (!stored) return { synced: 0 };
      const records = JSON.parse(stored);
      if (records.length === 0) return { synced: 0 };
      
      const res = await api.post('/offline/sync', { records });
      if (res.data.success) {
        await AsyncStorage.removeItem('neurix_offline_pending');
        return { synced: res.data.synced_count };
      }
      return { synced: 0 };
    } catch (e) {
      return { synced: 0, error: true };
    }
  },
  saveTriageCache: async (data: any) => {
    try {
      await AsyncStorage.setItem('neurix_triage_cache', JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
    } catch (_) {}
  },
  loadTriageCache: async () => {
    try {
      const raw = await AsyncStorage.getItem('neurix_triage_cache');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
};

export const archiveAPI = {
  getArchive: async () => {
    try {
      const res = await api.get('/tactical/archive');
      if (res.data.success) {
        await AsyncStorage.setItem('neurix_archive_cache', JSON.stringify(res.data.archive));
        return res.data.archive;
      }
    } catch (e) {
      const cached = await AsyncStorage.getItem('neurix_archive_cache');
      return cached ? JSON.parse(cached) : [];
    }
  },
  getHistory: async () => {
     try {
       const res = await api.get('/history');
       if (res.data.success) {
         await AsyncStorage.setItem('neurix_history_cache', JSON.stringify(res.data.data));
         return res.data.data;
       }
     } catch (e) {
       const cached = await AsyncStorage.getItem('neurix_history_cache');
       return cached ? JSON.parse(cached) : [];
     }
  },
  offlineAnalyze: async (params: any) => {
     const text = (params.location + ' ' + (params.description || '')).toLowerCase();
     let type = 'default';
     if (text.includes('flood') || text.includes('water')) type = 'flood';
     else if (text.includes('quake') || text.includes('earth')) type = 'earthquake';
     else if (text.includes('fire')) type = 'fire';
     
     const mockResult = {
        success: true,
        situation: {
           title: (params.location || 'Unknown Zone') + ' - OFFLINE INTEL',
           severity: (params.severity || 'HIGH').toUpperCase(),
           description: params.description || 'Offline assessment generated based on local tactical cache.',
           stats: { affected: params.people_affected || 50, injured: 5, villages: 2, confidence: 65 }
        },
        action_cards: [
           { priority: 'URGENT', title: 'Life Safety Pack', detail: 'Deploy immediate life-saving supplies to coordinates.', time: 'Immediate', color: '#D32F2F' }
        ],
        timeline: [{ time: '0-1 hr', label: 'Local Deployment', active: true }],
        resources: [{ label: 'Personnel', value: '4', unit: 'Responder' }],
        isOfflineResult: true
     };

     // Store for later sync
     const pending = await AsyncStorage.getItem('neurix_offline_pending');
     const pArr = pending ? JSON.parse(pending) : [];
     pArr.push({ id: 'OFF_' + Date.now(), data: { ...params, disaster_type: type }, timestamp: new Date().toISOString() });
     await AsyncStorage.setItem('neurix_offline_pending', JSON.stringify(pArr));

     return mockResult;
  }
};

export const mapAPI = {
  getNearbyAssets: async (lat: number, lng: number, radius: number = 30) => {
    try {
      const res = await api.get('/api/map/nearby', { params: { lat, lng, radius } });
      return res.data;
    } catch (e) {
      return { success: false, assets: [] };
    }
  },
  live: async (lat?: number, lng?: number) => {
    try {
      const res = await api.get('/api/map/nearby', { params: { lat, lng } });
      return res.data;
    } catch (e) {
      return { success: false, assets: [], layers: { disasters: [], hospitals: [], pharmacies: [] } };
    }
  },
  markers: () => api.get('/map/markers').then((r) => r.data),
  triggerSOS: async (lat: number, lng: number, type: string = 'manual', extra: any = {}) => {
    try {
      const res = await api.post('/api/ops/sos', { lat, lng, type, ...extra });
      return res.data;
    } catch (e) {
      return { success: false, error: 'Link_Interrupted' };
    }
  },
  sentinelSync: () => api.post('/sentinel/sync').then((r) => r.data),
  reportBlockedRoad: (payload: {
    id?: string;
    name?: string;
    lat: number;
    lng: number;
    radius_m?: number;
    reason?: string;
    severity?: string;
  }) => api.post('/api/community/pins', { ...payload, type: 'roadblock' }).then((r) => r.data),

  // ── Offline Cache & Tactical Layering ──────────────────────────

  saveLiveLayers: async (layers: any, lat?: number, lng?: number) => {
    try {
      const payload = { layers, lat: lat ?? null, lng: lng ?? null, savedAt: new Date().toISOString() };
      await AsyncStorage.setItem('neurix_map_cache', JSON.stringify(payload));
    } catch (_) {}
  },

  loadCachedLayers: async () => {
    try {
      const raw = await AsyncStorage.getItem('neurix_map_cache');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },

  offlineCache: async (lat?: number, lng?: number) => {
    const r = await api.get('/map/offline_cache', { params: { lat: lat ?? 28.6139, lng: lng ?? 77.2090, radius_km: 80 } });
    return r.data;
  },

  // ── Community Tactical & Discovery ──────────────────────────

  createPin: (type: string, lat: number, lng: number, desc: string, photo?: string) =>
    api.post('/api/community/pins', { type, latitude: lat, longitude: lng, description: desc, photo_url: photo }).then((r) => r.data),

  getPins: (lat: number, lng: number, radius = 10) =>
    api.get('/api/community/pins', { params: { lat, lng, radius_km: radius } }).then((r) => r.data),
  
  getUpdates: (lat: number, lng: number, radius = 20) =>
    api.get('/api/community/updates', { params: { lat, lng, radius_km: radius } })
      .then((r) => r.data)
      .catch(() => ({ success: false, updates: [] })),

  createUpdate: (payload: any) =>
    api.post('/api/community/updates', payload).then((r) => r.data),

  discoverUtilities: (lat: number, lng: number, type: 'shop' | 'pharmacy' | 'water' | 'food' | 'police') =>
    api.get('/api/discovery/utilities', { params: { lat, lng, type } }).then((r) => r.data),

  reportBlock: (lat: number, lng: number, reason: string) =>
    api.post('/api/community/pins', { type: 'roadblock', latitude: lat, longitude: lng, description: reason }).then((r) => r.data),
  
  /** Dashboard Stats */
  getDashboardStats: (lat: number, lng: number, radius = 50) =>
    api.get('/api/dashboard/stats', { params: { lat, lng, radius } }).then((r) => r.data),

  // ── REAL MISSION INTELLIGENCE ──────────────────────────
  
  analyze: (location: string, description: string, people_affected = 0, severity = "MEDIUM") => 
    api.post('/analyze', { location, description, people_affected, severity }).then(r => r.data),

  getLiveUnits: () =>
    api.get('/api/ops/units').then((r) => r.data),

  updateUnitGPS: (id: string, lat: number, lng: number, battery?: number, status?: string) =>
    api.post('/api/ops/units/gps', { id, lat, lng, battery, status }).then((r) => r.data),

  getMedicalDispatch: (lat: number, lng: number, triage: string) =>
    api.get('/api/ops/dispatch/medical', { params: { lat, lng, triage } }).then((r) => r.data),

  getAARUrl: (disaster_id: string) =>
    `http://127.0.0.1:8001/api/ops/reports/aar?disaster_id=${disaster_id}`,

  scanDocument: async (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/api/scan/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  setSecureMode: (enabled: boolean) =>
    api.post('/api/ops/secure-mode', null, { params: { enabled } }).then(r => r.data),

  getSecureStatus: () =>
    api.get('/api/ops/secure-mode/status').then(r => r.data),

  getNDMASops: () =>
    api.get('/api/ops/sops').then(r => r.data),
};


export const analyzeAPI = {
  chat: async (message: string, history: Array<{role: string; text: string}> = []) => {
    const res = await api.post('/chat', { message, history });
    return res.data;
  },
  analyze: async (payload: { location: string; description: string; people_affected?: number; severity?: string }) => {
    const res = await api.post('/analyze', payload);
    return res.data;
  },
  replan: async (previousPlan: any, updateText: string) => {
    const res = await api.post('/replan', { previous_plan: previousPlan, update_text: updateText });
    return res.data;
  }
};

export const satelliteAPI = {
  getMetadata: () => satelliteApi.get('/api/v1/metadata').then(r => r.data),
  getTileUrl: (z: number, x: number, y: number, type = 'sentinel') => 
    `${SATELLITE_API_URL}/api/v1/${type}/${z}/${x}/${y}`,
  getSentinelUrl: (z: number, x: number, y: number, mode = 'truecolor') => 
    `${SATELLITE_API_URL}/api/v1/sentinel/${z}/${x}/${y}?type=${mode}`,
  getNasaUrl: (z: number, x: number, y: number, layer = 'VIIRS_SNPP_CorrectedReflectance_TrueColor') => 
    `${SATELLITE_API_URL}/api/v1/nasa/${z}/${x}/${y}?layer=${layer}`,
};


export const medicalAPI = {
  updateHospitalBeds: (payload: {
    hospital_id: string;
    name: string;
    lat: number;
    lng: number;
    address?: string;
    beds_available?: number;
    icu_available?: number;
    doctors_available?: number;
    specialization?: string;
  }) => api.post('/hospitals/update_beds', payload).then((r) => r.data),
  smartRoute: (payload: { lat: number; lng: number; triage_tag: 'RED' | 'YELLOW' | 'GREEN' }) =>
    api.post('/medical/route', payload).then((r) => r.data),
  ambulanceRoute: (payload: {
    victim_lat: number;
    victim_lng: number;
    target_hospital_lat: number;
    target_hospital_lng: number;
  }) => api.post('/routing/ambulance', payload).then((r) => r.data),
  ambulanceGpsUpdate: (payload: { id: string; lat: number; lng: number; status?: string; crew?: string }) =>
    api.post('/ambulances/gps_update', payload).then((r) => r.data),
  
  /** Field Triage Operations */
  getTriageList: () => api.get('/medical/triage').then((r) => r.data),
  submitTriage: (payload: any) => api.post('/medical/triage', payload).then((r) => r.data),
};

export const reconAPI = {
  updateUnitGps: (payload: {
    id: string;
    lat: number;
    lng: number;
    battery?: number;
    status?: string;
    unit_type?: string;
    label?: string;
  }) => api.post('/api/ops/units/gps', payload).then((r) => r.data),
  liveUnits: () => api.get('/api/ops/units').catch(() => Promise.resolve({ success: true, nodes: [
    { id: 'ALPHA_1', x: 25, y: 45 },
    { id: 'BETA_2', x: 60, y: 30 },
    { id: 'SIGMA_RES', x: 15, y: 80 }
  ] })),
  getSentinelData: () => api.get('/sentinel/metadata').then((r) => r.data),
};

export const opsAPI = {
  bootstrap: (zone: string) => api.post('/api/ops/bootstrap', { zone }).then((r) => r.data),
  triggerSentinel: () => api.post('/sentinel/sync').then((r) => r.data),
  dispatchRed: (lat: number, lng: number, type: string) => 
    api.post('/api/ops/dispatch-red', { latitude: lat, longitude: lng, incident_type: type }).then((r) => r.data),
  bootstrapUnits: () => api.post('/api/ops/bootstrap').then((r) => r.data),
  dispatchIncident: (payload: {
    incident_id?: string;
    victim_lat: number;
    victim_lng: number;
    triage_tag?: 'RED' | 'YELLOW' | 'GREEN';
  }) => api.post('/ops/dispatch_incident', payload).then((r) => r.data),
};

export const historyAPI = {
  get: () => api.get('/history').then(r => r.data.data),
  delete: (id: number) => api.delete(`/history/${id}`).then(r => r.data),
};

export const syncManager = {
  pushOfflineQueue: async () => {
    try {
      // Skip if we are not authenticated yet to avoid 401 spam at startup.
      const token = await AsyncStorage.getItem('neurix_token');
      if (!token) return;

      const queueData = await AsyncStorage.getItem('offline_history_queue');
      if (!queueData) return;
      
      const queue = JSON.parse(queueData);
      if (queue.length === 0) return;
      
      console.log(`[SYNC MANAGER] Pushing ${queue.length} offline records to HQ...`);
      const res = await api.post('/offline/sync', { records: queue });
      
      if (res.data && res.data.success) {
        console.log('[SYNC MANAGER] Push successful. Clearing local queue.');
        await AsyncStorage.removeItem('offline_history_queue');
      }
    } catch (e: any) {
      console.log('[SYNC MANAGER] Push failed, will retry later.', e.message);
    }
  },
  pullPlaybooks: async () => {
    // Fetches lightweight updates to offline Engine SOPs
    try {
      const res = await api.get('/sync/pull');
      if (res.data && res.data.success) {
        console.log(`[SYNC MANAGER] ${res.data.message}`);
      }
    } catch (e: any) {
      // Fail silently for pull requests to avoid console noise on launch
      if (e.message?.includes('Login Required') || e.message?.includes('Session expired')) {
         return;
      }
      console.log('[SYNC MANAGER] Playbook pull skipped (Offline/Unauthenticated).');
    }
  }
};

// Aliases for historical compatibility if needed
export const getHistory = historyAPI.get;
export const deleteAnalysis = historyAPI.delete;

export default api;
