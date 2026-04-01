const Alert = require('../models/Alert');
const logger = require('../utils/logger');

/**
 * Intelligent Risk Detection System
 * Analyzes telemetry and generates human-readable alerts with action steps.
 */
const analyzeRisk = async (telemetry) => {
  const { weather, earthquakes, lat, lon } = telemetry;
  
  let risk_level = 'LOW';
  let disaster_type = 'None';
  let message = 'Conditions are currently stable.';
  let action_steps = [];

  // 1. Flood Risk Analysis
  // If rainfall > 80mm/hour -> Flood Risk HIGH
  if (weather && weather.rain_1h >= 80) {
    risk_level = 'HIGH';
    disaster_type = 'Flood';
    message = `Critical Flood Warning: Extreme rainfall detected (${weather.rain_1h}mm/h). Flash flooding is imminent.`;
    action_steps = [
      'Immediately move to higher ground.',
      'Do not attempt to walk or drive through flood waters.',
      'Prepare emergency kits and evacuate if local authorities mandate.'
    ];
  } else if (weather && weather.rain_1h >= 30) {
    risk_level = 'MEDIUM';
    disaster_type = 'Flood';
    message = `Heavy rainfall detected (${weather.rain_1h}mm/h). Potential for localized flooding.`;
    action_steps = [
      'Monitor local news and weather updates.',
      'Clear gutters and drainage areas if safe to do so.'
    ];
  }

  // 2. Storm Risk Analysis
  // Wind speed > 25 m/s (~90km/h) -> Storm Alert
  if (weather && weather.wind_speed >= 25 && risk_level !== 'HIGH') {
    risk_level = 'HIGH';
    disaster_type = 'Storm';
    message = `Severe Storm Alert: Damaging winds detected at ${weather.wind_speed} m/s.`;
    action_steps = [
      'Seek shelter indoors away from windows.',
      'Secure loose outdoor objects.',
      'Prepare for potential power outages.'
    ];
  }

  // 3. Earthquake Risk Analysis (Highest Priority if recent & nearby)
  if (earthquakes && earthquakes.length > 0) {
    const primaryQuake = earthquakes[0]; // Sort by time desc in service
    // Is it recent? (within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    if (primaryQuake.time >= twoHoursAgo) {
      if (primaryQuake.mag >= 6.0) {
        risk_level = 'HIGH';
        disaster_type = 'Earthquake';
        message = `Critical Seismic Alert: Magnitude ${primaryQuake.mag} earthquake detected nearby. Expect severe aftershocks.`;
        action_steps = [
          'Drop, Cover, and Hold On.',
          'Evacuate immediately if you smell gas or notice structural damage.',
          'Move away from buildings if outside.'
        ];
      } else if (primaryQuake.mag >= 4.5 && risk_level === 'LOW') {
        risk_level = 'MEDIUM';
        disaster_type = 'Earthquake';
        message = `Moderate Seismic Alert: Magnitude ${primaryQuake.mag} earthquake detected locally.`;
        action_steps = [
          'Check for structural damage.',
          'Monitor for potential aftershocks.'
        ];
      }
    }
  }

  // Generate an Alert log if risk is MEDIUM or HIGH
  if (risk_level !== 'LOW') {
    // Check if we already created an alert for this location in the last 6 hours
    const recentAlert = await Alert.findOne({
      disaster_type,
      risk_level,
      timestamp: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
    });

    if (!recentAlert) {
      const newAlert = new Alert({
        risk_level,
        disaster_type,
        message,
        action_steps,
        loc: { type: 'Point', coordinates: [lon, lat] },
        metadata: { weather, earthquakes }
      });
      await newAlert.save();
      logger.info(`🚨 NEW CRITICAL ALERT GENERATED: [${risk_level}] ${disaster_type} at [${lat}, ${lon}]`);
      
      // Twilio / In-App Notification Hook can be triggered here
    }
  }

  return { risk_level, disaster_type, message, action_steps };
};

module.exports = { analyzeRisk };
