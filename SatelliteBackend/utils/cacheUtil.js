const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('./logger');

const tileCache = new NodeCache({
  stdTTL: config.cache.ttl,
  checkperiod: 600,
  maxKeys: config.cache.maxKeys
});

const cacheMiddleware = (req, res, next) => {
  const cacheKey = req.originalUrl;
  const cachedResponse = tileCache.get(cacheKey);

  if (cachedResponse) {
    logger.info(`🛰️  Cache HIT for: ${cacheKey}`);
    res.set('Content-Type', 'image/png');
    return res.status(200).send(cachedResponse);
  }
  
  res.originalSend = res.send;
  res.send = (body) => {
    if (res.statusCode === 200) {
      tileCache.set(cacheKey, body);
    }
    res.originalSend(body);
  };
  next();
};

module.exports = { tileCache, cacheMiddleware };
