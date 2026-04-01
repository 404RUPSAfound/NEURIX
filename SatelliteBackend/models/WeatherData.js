const mongoose = require('mongoose');

const WeatherSchema = new mongoose.Schema({
  lat: Number,
  lon: Number,
  temp: Number,
  feels_like: Number,
  humidity: Number,
  wind_speed: Number, // Storm detection
  rain_1h: { type: Number, default: 0 }, // Flood detection (> 80mm/h)
  condition: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WeatherData', WeatherSchema);
