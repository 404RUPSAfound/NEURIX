const mongoose = require('mongoose');

const EarthquakeSchema = new mongoose.Schema({
  usgs_id: { type: String, unique: true },
  mag: Number,
  place: String,
  time: Date,
  updated: Date,
  lat: Number,
  lon: Number,
  depth: Number,
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EarthquakeData', EarthquakeSchema);
