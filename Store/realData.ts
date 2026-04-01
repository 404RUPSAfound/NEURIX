// NEURIX Real-Time Data Service
// Uses FREE public APIs - no API keys needed, works offline with cache

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for tactical stability

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const BACKEND_URL = 'http://localhost:8000/api/ops/proxy';

async function cachedFetch(key: string, queryOrUrl: string, fallback: any = [], isOverpass: boolean = false) {
  // 🟢 MISSION-CRITICAL TACTICAL PROXY - Silences Browser Console Errors
  const service = isOverpass ? 'overpass' : queryOrUrl.includes('earthquake.usgs.gov') ? 'usgs' : queryOrUrl.includes('nominatim') ? 'nominatim' : null;
  
  const fetchPromise = (async () => {
    try {
      if (service) {
        // Redirection to local server proxy (avoids CORS/429/504 errors in browser console)
        const res = await fetch(BACKEND_URL, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             service,
             query: isOverpass ? queryOrUrl : undefined,
             url: !isOverpass ? queryOrUrl : undefined
           })
        });
        if (res.status === 200) {
           const data = await res.json();
           await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
           return data;
        }
      }

      // Universal fallback to direct fetch if proxy fails or service unknown
      const directRes = await fetch(isOverpass ? 'https://overpass-api.de/api/interpreter' : queryOrUrl, { 
        method: isOverpass ? 'POST' : 'GET',
        body: isOverpass ? `data=${encodeURIComponent(queryOrUrl)}` : undefined
      });
      const data = await directRes.json();
      await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
      return data;
    } catch (e) {
      console.warn(`[NEURIX] Tactical relay bypass. Falling back to local cache.`);
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) return JSON.parse(cached).data;
      } catch (_) {}
      return fallback;
    }
  })();

  return fetchPromise;
}

// ═══════════════════════════════════════════════════════════════
// 1. DISASTERS - Real earthquake data from USGS
// ═══════════════════════════════════════════════════════════════
export async function fetchRealDisasters() {
  const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
  const raw = await cachedFetch('disasters_cache', url, { features: [] });
  
  // Filter for South/Central Asia region (India focus)
  const indiaQuakes = (raw.features || [])
    .filter((f: any) => {
      const [lon, lat] = f.geometry.coordinates;
      return lat >= 5 && lat <= 40 && lon >= 65 && lon <= 100;
    })
    .map((f: any) => ({
      id: f.id,
      title: f.properties.place || 'Unknown Location',
      type: 'EARTHQUAKE',
      magnitude: f.properties.mag?.toFixed(1),
      severity: f.properties.mag >= 5.0 ? 'CRITICAL' : f.properties.mag >= 4.0 ? 'HIGH' : 'MEDIUM',
      time: new Date(f.properties.time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      timeAgo: getTimeAgo(f.properties.time),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2]?.toFixed(1),
      tsunami: f.properties.tsunami === 1,
      felt: f.properties.felt,
      url: f.properties.url,
      status: f.properties.status,
    }));

  // Also fetch global significant events
  const globalUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';
  const globalRaw = await cachedFetch('global_disasters', globalUrl, { features: [] });
  
  const globalQuakes = (globalRaw.features || [])
    .filter((f: any) => {
      // Exclude ones already in India list
      return !indiaQuakes.find((q: any) => q.id === f.id);
    })
    .slice(0, 5)
    .map((f: any) => ({
      id: f.id,
      title: f.properties.place || 'Unknown',
      type: 'EARTHQUAKE',
      magnitude: f.properties.mag?.toFixed(1),
      severity: 'CRITICAL',
      time: new Date(f.properties.time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      timeAgo: getTimeAgo(f.properties.time),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2]?.toFixed(1),
      tsunami: f.properties.tsunami === 1,
      felt: f.properties.felt,
      url: f.properties.url,
      status: f.properties.status,
      isGlobal: true,
    }));

  return { india: indiaQuakes, global: globalQuakes, total: indiaQuakes.length + globalQuakes.length };
}

// ═══════════════════════════════════════════════════════════════
// 2. HOSPITALS - Real hospitals from OpenStreetMap Overpass API
// ═══════════════════════════════════════════════════════════════
export async function fetchNearbyHospitals(lat: number, lng: number) {
  const radius = 15000; // 15km
  const query = `[out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      node["healthcare"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="doctors"](around:5000,${lat},${lng});
    );
    out body;>;out skel qt;`;
  
  const raw = await cachedFetch(`hospitals_${lat.toFixed(2)}_${lng.toFixed(2)}`, query, { elements: [] }, true);
  
  const hospitals = (raw.elements || [])
    .filter((e: any) => e.tags?.name)
    .map((e: any, i: number) => {
      const hLat = e.lat || e.center?.lat || lat;
      const hLng = e.lon || e.center?.lon || lng;
      const distance = getDistanceKm(lat, lng, hLat, hLng);
      return {
        id: e.id?.toString() || `h${i}`,
        name: e.tags.name,
        type: e.tags.amenity || e.tags.healthcare || 'medical',
        speciality: e.tags['healthcare:speciality'] || e.tags.speciality || 'General Medicine',
        phone: e.tags.phone || e.tags['contact:phone'] || e.tags['phone:emergency'] || null,
        website: e.tags.website || null,
        emergency: e.tags.emergency === 'yes' || e.tags.amenity === 'hospital',
        beds: e.tags.beds ? parseInt(e.tags.beds) : null,
        operator: e.tags.operator || e.tags['operator:type'] || null,
        address: e.tags['addr:full'] || e.tags['addr:street'] || e.tags['addr:city'] || null,
        hours: e.tags.opening_hours || '24/7 (Assumed)',
        lat: hLat,
        lng: hLng,
        distance: distance,
        distanceText: distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`,
      };
    })
    .sort((a: any, b: any) => a.distance - b.distance);

  return hospitals;
}

// ═══════════════════════════════════════════════════════════════
// 3. WEATHER ALERTS - Real weather from Open-Meteo
// ═══════════════════════════════════════════════════════════════
export async function fetchWeatherAlerts(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,precipitation,rain,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max&timezone=Asia/Kolkata&forecast_days=3`;
  
  const raw = await cachedFetch(`weather_${lat.toFixed(2)}_${lng.toFixed(2)}`, url, null);
  if (!raw || !raw.current) return null;

  const current = raw.current;
  const daily = raw.daily;
  
  const weatherCode = current.weather_code;
  const condition = getWeatherCondition(weatherCode);
  const alerts: any[] = [];

  // Generate alerts based on real weather data
  if (current.wind_speed_10m > 50) alerts.push({ type: 'CYCLONE_WARNING', severity: 'CRITICAL', detail: `Wind speed ${current.wind_speed_10m} km/h detected`, time: 'NOW' });
  if (current.wind_speed_10m > 30) alerts.push({ type: 'HIGH_WIND', severity: 'HIGH', detail: `Wind speed ${current.wind_speed_10m} km/h`, time: 'NOW' });
  if (current.rain > 10) alerts.push({ type: 'HEAVY_RAIN', severity: 'HIGH', detail: `Rainfall ${current.rain}mm/h`, time: 'NOW' });
  if (current.rain > 2) alerts.push({ type: 'RAIN_ALERT', severity: 'MEDIUM', detail: `Active rainfall ${current.rain}mm/h`, time: 'NOW' });
  if (current.temperature_2m > 42) alerts.push({ type: 'HEAT_WAVE', severity: 'CRITICAL', detail: `Temperature ${current.temperature_2m}°C`, time: 'NOW' });
  if (current.temperature_2m > 38) alerts.push({ type: 'HEAT_ADVISORY', severity: 'HIGH', detail: `Temperature ${current.temperature_2m}°C`, time: 'NOW' });
  if (current.relative_humidity_2m > 90) alerts.push({ type: 'HUMIDITY_WARNING', severity: 'MEDIUM', detail: `Humidity ${current.relative_humidity_2m}%`, time: 'NOW' });
  
  // Check forecast for upcoming alerts
  if (daily) {
    for (let i = 0; i < Math.min(3, daily.time?.length || 0); i++) {
      if (daily.precipitation_sum?.[i] > 50) alerts.push({ type: 'FLOOD_RISK', severity: 'CRITICAL', detail: `${daily.precipitation_sum[i]}mm rain expected on ${daily.time[i]}`, time: daily.time[i] });
      if (daily.wind_speed_10m_max?.[i] > 60) alerts.push({ type: 'STORM_WARNING', severity: 'CRITICAL', detail: `Max wind ${daily.wind_speed_10m_max[i]} km/h on ${daily.time[i]}`, time: daily.time[i] });
      if (daily.uv_index_max?.[i] > 10) alerts.push({ type: 'UV_EXTREME', severity: 'HIGH', detail: `UV Index ${daily.uv_index_max[i]} on ${daily.time[i]}`, time: daily.time[i] });
    }
  }

  // Always provide at least a status alert
  if (alerts.length === 0) {
    alerts.push({ type: 'ALL_CLEAR', severity: 'LOW', detail: `No active weather threats. ${condition}, ${current.temperature_2m}°C`, time: 'NOW' });
  }

  return {
    current: {
      temp: `${current.temperature_2m}°C`,
      feelsLike: `${current.apparent_temperature}°C`,
      condition,
      windSpeed: `${current.wind_speed_10m} km/h`,
      humidity: `${current.relative_humidity_2m}%`,
      pressure: `${current.surface_pressure} hPa`,
      rain: current.rain > 0 ? `${current.rain} mm/h` : 'None',
    },
    forecast: daily ? daily.time?.map((t: string, i: number) => ({
      date: t,
      maxTemp: daily.temperature_2m_max?.[i],
      minTemp: daily.temperature_2m_min?.[i],
      precipitation: daily.precipitation_sum?.[i],
      windMax: daily.wind_speed_10m_max?.[i],
      uvMax: daily.uv_index_max?.[i],
      condition: getWeatherCondition(daily.weather_code?.[i]),
    })) : [],
    alerts,
    alertCount: alerts.filter((a: any) => a.severity !== 'LOW').length,
  };
}

// ═══════════════════════════════════════════════════════════════
// 4. COMMUNITY / PEERS - Active disaster response community data
// ═══════════════════════════════════════════════════════════════
export async function fetchCommunityData(lat: number, lng: number) {
  // Fetch nearby emergency services from OpenStreetMap
  const query = `[out:json][timeout:10];(node["amenity"="fire_station"](around:15000,${lat},${lng});node["amenity"="police"](around:15000,${lat},${lng});node["amenity"="pharmacy"](around:5000,${lat},${lng});node["emergency"="ambulance_station"](around:15000,${lat},${lng}););out body;`;
  
  const raw = await cachedFetch(`community_${lat.toFixed(2)}_${lng.toFixed(2)}`, query, { elements: [] }, true);
  
  const services = (raw.elements || [])
    .filter((e: any) => e.tags?.name || e.tags?.amenity)
    .map((e: any) => {
      const dist = getDistanceKm(lat, lng, e.lat, e.lon);
      return {
        id: e.id,
        name: e.tags.name || e.tags.amenity?.toUpperCase(),
        type: e.tags.amenity || e.tags.emergency || 'service',
        phone: e.tags.phone || e.tags['contact:phone'] || null,
        lat: e.lat,
        lng: e.lon,
        distance: dist,
        distanceText: dist < 1 ? `${(dist * 1000).toFixed(0)}m` : `${dist.toFixed(1)}km`,
      };
    })
    .sort((a: any, b: any) => a.distance - b.distance);

  const fireStations = services.filter((s: any) => s.type === 'fire_station');
  const policeStations = services.filter((s: any) => s.type === 'police');
  const pharmacies = services.filter((s: any) => s.type === 'pharmacy');
  const ambulanceStations = services.filter((s: any) => s.type === 'ambulance_station');

  return {
    fireStations,
    policeStations,
    pharmacies,
    ambulanceStations,
    totalServices: services.length,
    all: services,
  };
}

// ═══════════════════════════════════════════════════════════════
// 5. GEOCODING - Robust reverse geocoding via Nominatim
// ═══════════════════════════════════════════════════════════════
export async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
  try {
    const raw = await cachedFetch(`geo_${lat.toFixed(2)}_${lng.toFixed(2)}`, url, { address: {} });
    if (raw && raw.address) {
      const city = raw.address.city || raw.address.town || raw.address.village || raw.address.suburb || 'Sector';
      const region = raw.address.state || raw.address.county || 'Region';
      return { city, region };
    }
  } catch (e) {
    console.error('[NEURIX] Geocoding failure:', e);
  }
  return { city: 'Tactical Sector', region: 'India' };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getWeatherCondition(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  if (code === 95) return 'Thunderstorm';
  if (code <= 99) return 'Thunderstorm + Hail';
  return 'Unknown';
}

// Dashboard stats aggregator
export async function fetchDashboardStats(lat: number, lng: number) {
  const [disasters, hospitals, weather, community] = await Promise.all([
    fetchRealDisasters().catch(() => ({ india: [], global: [], total: 0 })),
    fetchNearbyHospitals(lat, lng).catch(() => []),
    fetchWeatherAlerts(lat, lng).catch(() => ({ alerts: [], alertCount: 0 })),
    fetchCommunityData(lat, lng).catch(() => ({ totalServices: 0 })),
  ]);

  return {
    disasters: disasters.total,
    hospitals: hospitals.length,
    alerts: weather?.alertCount || 0,
    peers: community.totalServices,
  };
}

export async function fetchTacticalData(lat: number, lng: number) {
  const [disasters, hospitals, weather, community] = await Promise.all([
    fetchRealDisasters(),
    fetchNearbyHospitals(lat, lng),
    fetchWeatherAlerts(lat, lng),
    fetchCommunityData(lat, lng)
  ]);

  return {
    disasters: disasters.india,
    hospitals,
    alerts: weather?.alerts || [],
    community
  };
}
