require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',
  nasa: {
    baseUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best',
    defaultLayer: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    format: 'jpg',
    tileMatrixSet: 'GoogleMapsCompatible_Level9'
  },
  sentinel: {
    clientId: process.env.SENTINEL_CLIENT_ID,
    clientSecret: process.env.SENTINEL_CLIENT_SECRET,
    authUrl: 'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
    baseUrl: 'https://services.sentinel-hub.com/ogc/wmts',
    instanceId: process.env.SENTINEL_INSTANCE_ID
  },
  cache: {
    ttl: 3600 * 24, // 24 hours for tiles
    maxKeys: 1000  // Limit in-memory cache
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500 // Limit each IP to 500 requests per window
  }
};
