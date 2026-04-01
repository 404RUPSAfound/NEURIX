const axios = require('axios');
const EarthquakeData = require('../models/EarthquakeData');
const logger = require('../utils/logger');

/**
 * Fetch and store recent earthquake data from USGS.
 * USGS feed updates every minute. We can poll for M2.5+ or M4.5+ globally.
 */
const fetchRecentEarthquakes = async () => {
  try {
    // 2.5 magnitude and above for the past day
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const response = await axios.get(url, { timeout: 15000 });
    const features = response.data.features;

    let newRecords = 0;

    for (const feature of features) {
      const { id, properties, geometry } = feature;
      const { mag, place, time, updated } = properties;
      const [lon, lat, depth] = geometry.coordinates;

      // Determine severity
      let severity = 'LOW';
      if (mag >= 4.5 && mag < 6.0) severity = 'MEDIUM';
      else if (mag >= 6.0) severity = 'HIGH';

      // Uptade or insert
      const existing = await EarthquakeData.findOne({ usgs_id: id });
      if (!existing) {
        await EarthquakeData.create({
          usgs_id: id,
          mag,
          place,
          time: new Date(time),
          updated: new Date(updated),
          lat,
          lon,
          depth,
          severity
        });
        newRecords++;
      } else if (existing.updated < new Date(updated)) {
        // Earthquake data gets updated sometimes (e.g. magnitude revised)
        existing.mag = mag;
        existing.updated = new Date(updated);
        existing.severity = severity;
        await existing.save();
      }
    }

    if (newRecords > 0) {
      logger.info(`✅ Synchronized ${newRecords} new USGS earthquake records.`);
    }
  } catch (error) {
    logger.error(`Earthquake Fetch Error: ${error.message}`);
  }
};

/**
 * Get nearby recent earthquakes 
 */
const getNearbyEarthquakes = async (lat, lon, radiusKm = 1000) => {
  // Simple bounding box query to find nearby earthquakes within the last 24h
  const margin = radiusKm / 111; // roughly 1 degree per 111km
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const quakes = await EarthquakeData.find({
    lat: { $gte: lat - margin, $lte: lat + margin },
    lon: { $gte: lon - margin, $lte: lon + margin },
    time: { $gte: oneDayAgo }
  }).sort({ time: -1 }).limit(10);

  return quakes;
};

module.exports = { fetchRecentEarthquakes, getNearbyEarthquakes };
