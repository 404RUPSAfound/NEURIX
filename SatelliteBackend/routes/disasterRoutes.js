const express = require('express');
const router = express.Router();
const { getLatestWeather } = require('../services/weatherService');
const { getNearbyEarthquakes } = require('../services/earthquakeService');
const { analyzeRisk } = require('../services/riskEngine');
const { handleTacticalChat } = require('../services/openaiService');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');

// GET /api/disaster/live?lat=X&lon=Y
router.get('/disaster/live', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates provided.' });
    }

    const weather = await getLatestWeather(lat, lon);
    const earthquakes = await getNearbyEarthquakes(lat, lon, 500); // within ~500km

    // Perform live risk synthesis for the telemetry
    const risk = await analyzeRisk({ lat, lon, weather, earthquakes });

    res.json({
      success: true,
      data: {
        weather,
        earthquakes,
        risk
      }
    });
  } catch (error) {
    logger.error(`/disaster/live Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/disaster/risk
router.get('/disaster/risk', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      // Return global active alerts if no coordinates given
      const activeAlerts = await Alert.find({ status: 'ACTIVE' }).sort({ timestamp: -1 }).limit(20);
      return res.json({ success: true, alerts: activeAlerts });
    }

    // Return localized active alerts
    const margin = 100 / 111; // roughly 100 km radius
    const localAlerts = await Alert.find({
      status: 'ACTIVE',
      loc: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lon, lat] },
          $maxDistance: 100000 // meters -> 100km
        }
      }
    }).sort({ timestamp: -1 }).limit(10);

    // Also inject a live snapshot
    const weather = await getLatestWeather(lat, lon);
    const earthquakes = await getNearbyEarthquakes(lat, lon, 100);
    const currentRisk = await analyzeRisk({ lat, lon, weather, earthquakes });

    res.json({
      success: true,
      current_risk: currentRisk,
      active_alerts: localAlerts
    });
  } catch (error) {
    logger.error(`/disaster/risk Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history, location } = req.body;
    let localTelemetry = { lat: 28.6139, lon: 77.2090, risk_level: 'LOW' }; // Default to Delhi if missing

    if (location && location.lat && location.lon) {
      const weather = await getLatestWeather(location.lat, location.lon);
      const earthquakes = await getNearbyEarthquakes(location.lat, location.lon, 100);
      const currentRisk = await analyzeRisk({
        lat: location.lat,
        lon: location.lon,
        weather,
        earthquakes
      });
      
      localTelemetry = {
        lat: location.lat,
        lon: location.lon,
        ...currentRisk,
        weather
      };
    }

    const aiResponse = await handleTacticalChat(message, history || [], localTelemetry);
    res.json({ success: true, response: aiResponse.reply });
  } catch (error) {
    logger.error(`/chat Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
