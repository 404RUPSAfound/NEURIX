const cron = require('node-cron');
const logger = require('../utils/logger');
const { fetchRecentEarthquakes } = require('./earthquakeService');
const { fetchWeatherForLocation } = require('./weatherService');
const { analyzeRisk } = require('./riskEngine');
const EarthquakeData = require('../models/EarthquakeData');
const WeatherData = require('../models/WeatherData');

// List of target coordinates to consistently monitor (e.g. key cities, active deployment zones)
const TARGET_ZONES = [
  { name: 'Delhi NCR', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Guwahati / Assam Hub', lat: 26.1445, lon: 91.7362 } // High flood risk zone
];

const startScheduler = () => {
  logger.info('⏱️  INTEL_SCHEDULER: INITIALIZING BACKGROUND WORKERS...');

  // 1. EARTHQUAKE POLLING (runs every 5 minutes)
  // USGS updates frequently, so we poll to catch sudden seismic anomalies
  cron.schedule('*/5 * * * *', async () => {
    logger.info('⏱️  INTEL_SCHEDULER: Polling USGS Seismic Network...');
    await fetchRecentEarthquakes();
  });

  // 2. WEATHER & RISK POLLING (runs every 10 minutes)
  // Poll OpenWeatherMap for predefined primary zones and analyze risk immediately
  cron.schedule('*/10 * * * *', async () => {
    logger.info('⏱️  INTEL_SCHEDULER: Polling OpenWeatherMap for Target Zones...');
    for (const zone of TARGET_ZONES) {
      await fetchWeatherForLocation(zone.lat, zone.lon);
      
      // Perform local synthesis to see if this zone is in danger
      const latestWeather = await WeatherData.findOne({ lat: zone.lat, lon: zone.lon }).sort({ timestamp: -1 });
      
      // Check for recent earthquakes within 500km
      const margin = 500 / 111; 
      const recentQuakes = await EarthquakeData.find({
        lat: { $gte: zone.lat - margin, $lte: zone.lat + margin },
        lon: { $gte: zone.lon - margin, $lte: zone.lon + margin },
        time: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ time: -1 });

      const telemetry = {
        lat: zone.lat,
        lon: zone.lon,
        weather: latestWeather,
        earthquakes: recentQuakes
      };

      // The risk Engine will automatically log Critical events to MongoDB
      await analyzeRisk(telemetry);
    }
  });

  logger.info('✅  INTEL_SCHEDULER: WORKERS ACTIVE.');
};

module.exports = { startScheduler };
