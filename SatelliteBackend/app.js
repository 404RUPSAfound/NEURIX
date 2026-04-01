const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');
const tileRoutes = require('./routes/tileRoutes');

const app = express();

// ─────────────────────────────────────────────
// MISSION-CRITICAL SECURITY MIDDLEWARE
// ─────────────────────────────────────────────

app.use(helmet({ 
  contentSecurityPolicy: false, // Allow tile loading from external sources
  crossOriginResourcePolicy: false // Allow cross-origin requests for map tiles
}));
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// ─────────────────────────────────────────────
// PERFORMANCE: RATE LIMITING & CACHING
// ─────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.use('/tiles', limiter);

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.use('/api/v1', tileRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'operational', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.url} - ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      id: req.id
    }
  });
});

// ─────────────────────────────────────────────
// SERVER INITIALIZATION
// ─────────────────────────────────────────────

app.listen(config.port, () => {
  logger.info(`🚀  NEURIX SATELLITE TILE SERVICE LIVE ON PORT: ${config.port}`);
  logger.info(`🛰️  Mode: ${config.env}`);
});

module.exports = app;
