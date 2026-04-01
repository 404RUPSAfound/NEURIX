const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  risk_level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true },
  disaster_type: { type: String, enum: ['Flood', 'Earthquake', 'Storm', 'Fire', 'Other'], required: true },
  message: String,
  action_steps: [String],
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED'], default: 'ACTIVE' },
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

AlertSchema.index({ loc: '2dsphere' });

module.exports = mongoose.model('Alert', AlertSchema);
