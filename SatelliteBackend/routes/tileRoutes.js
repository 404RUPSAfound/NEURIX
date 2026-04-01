const express = require('express');
const router = express.Router();
const nasaService = require('../services/nasaService');
const sentinelService = require('../services/sentinelService');
const { cacheMiddleware } = require('../utils/cacheUtil');
const logger = require('../utils/logger');

/**
 * GET /tiles/nasa
 * Normalized XYZ tile from NASA GIBS
 */
router.get('/nasa/:z/:x/:y', cacheMiddleware, async (req, res) => {
  const { z, x, y } = req.params;
  const { layer, date } = req.query;

  try {
    const tile = await nasaService.getTile(layer, z, x, y, date);
    res.set('Content-Type', 'image/jpeg');
    res.status(200).send(tile);
  } catch (error) {
    logger.error(`NASA Route Error: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve NASA tile.' });
  }
});

/**
 * GET /tiles/sentinel
 * Normalized XYZ tile from Sentinel Hub
 */
router.get('/sentinel/:z/:x/:y', cacheMiddleware, async (req, res) => {
  const { z, x, y } = req.params;
  const { type } = req.query;

  try {
    const tile = await sentinelService.getTile(type, z, x, y);
    res.set('Content-Type', 'image/png');
    res.status(200).send(tile);
  } catch (error) {
    logger.error(`Sentinel Route Error: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve Sentinel tile.' });
  }
});

/**
 * GET /metadata
 * Global reconnaissance satellite metadata
 */
router.get('/metadata', async (req, res) => {
  const nMetadata = await nasaService.getMetadata();
  const sMetadata = await sentinelService.getMetadata();
  res.status(200).json({ nasa: nMetadata, sentinel: sMetadata });
});

module.exports = router;
