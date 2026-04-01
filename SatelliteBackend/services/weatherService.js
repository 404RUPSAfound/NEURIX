const axios = require('axios');
const WeatherData = require('../models/WeatherData');
const logger = require('../utils/logger');

/**
 * Fetch and store real-time weather data for a specific location using Open-Meteo (No API Key Required).
 */
const fetchWeatherForLocation = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    const current = data.current;

    // Map Open-Meteo WMO weather codes to human-readable strings
    let condition = 'Clear';
    if (current.weather_code >= 45 && current.weather_code <= 48) condition = 'Fog';
    if (current.weather_code >= 51 && current.weather_code <= 67) condition = 'Rain';
    if (current.weather_code >= 71 && current.weather_code <= 86) condition = 'Snow';
    if (current.weather_code >= 95) condition = 'Storm';

    const weatherEntry = new WeatherData({
      lat,
      lon,
      temp: current.temperature_2m,
      feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind_speed: current.wind_speed_10m / 3.6, // Convert km/h to m/s for riskEngine
      rain_1h: current.rain || current.precipitation || 0,
      condition: condition,
    });

    await weatherEntry.save();
    return weatherEntry;

  } catch (error) {
    logger.error(`Open-Meteo Fetch Error for [${lat}, ${lon}]: ${error.message}`);
    return null;
  }
};

/**
 * Get the latest weather data for a location (within last 15 minutes)
 */
const getLatestWeather = async (lat, lon) => {
  const margin = 0.1; // roughly 10km
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const localData = await WeatherData.findOne({
    lat: { $gte: lat - margin, $lte: lat + margin },
    lon: { $gte: lon - margin, $lte: lon + margin },
    timestamp: { $gte: fifteenMinsAgo }
  }).sort({ timestamp: -1 });

  if (localData) return localData;

  const freshData = await fetchWeatherForLocation(lat, lon);
  return freshData;
};

module.exports = { fetchWeatherForLocation, getLatestWeather };
