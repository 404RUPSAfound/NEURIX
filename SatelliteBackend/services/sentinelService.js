const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const pRetry = require('p-retry');

class SentinelService {
  constructor() {
    this.accessToken = null;
    this.expiresAt = null;
  }

  /**
   * Manages OAuth 2.0 token lifecycle.
   */
  async getAccessToken() {
    if (!config.sentinel.clientId || !config.sentinel.clientSecret) {
      logger.warn('⚠️  Sentinel Hub: Credentials missing. Activating Placeholder Mode.');
      return 'MOCK_TOKEN';
    }

    if (this.accessToken && this.accessToken !== 'MOCK_TOKEN' && Date.now() < this.expiresAt) {
      return this.accessToken;
    }
    
    try {
      const response = await axios({
        method: 'post',
        url: config.sentinel.authUrl,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: `grant_type=client_credentials&client_id=${config.sentinel.clientId}&client_secret=${config.sentinel.clientSecret}`
      });

      this.accessToken = response.data.access_token;
      this.expiresAt = Date.now() + (response.data.expires_in * 1000) - 60000;
      return this.accessToken;
    } catch (error) {
      logger.error(`Sentinel OAuth Failure: ${error.message}. Returning MOCK session.`);
      this.accessToken = 'MOCK_TOKEN';
      return 'MOCK_TOKEN';
    }
  }

  /**
   * Fetches an XYZ tile from Sentinel Hub WMTS service.
   */
  async getTile(type, z, x, y) {
    const token = await this.getAccessToken();
    if (token === 'MOCK_TOKEN') {
       // Return a mission-safe placeholder if credentials are missing
       return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEW0vL7e9X67AAAANklEQVR4AewaftAAAAAB3RJTUUH5A8MDRUAAAAAAAoAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAA8C8eGgABXfU7SAAAAABJRU5ErkJggg==', 'base64');
    }

    const layer = type === 'ndvi' ? 'NDVI' : 'TRUE_COLOR';
    const instanceId = config.sentinel.instanceId;
    const url = `${config.sentinel.baseUrl}/${instanceId}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&FORMAT=image/png&TILEMATRIXSET=PopularWebMercator512&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;

    const fetchTask = async () => {
      const response = await axios({
        method: 'get',
        url: url,
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'arraybuffer'
      });
      return response.data;
    };

    try {
      return await pRetry(fetchTask, { retries: 1 });
    } catch (error) {
      logger.warn(`Sentinel Fetch failed: ${error.message}. Returning Placeholder.`);
      return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEW0vL7e9X67AAAANklEQVR4AewaftAAAAAB3RJTUUH5A8MDRUAAAAAAAoAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAA8C8eGgABXfU7SAAAAABJRU5ErkJggg==', 'base64');
    }
  }

  async getMetadata() {
    return {
      service: 'Copernicus Sentinel-2 Hub',
      capabilities: ['Truecolor', 'NDVI', 'NDWI'],
      projection: 'EPSG:3857 (PopularWebMercator512)',
      attribution: 'Copernicus Sentinel Hub / ESA'
    };
  }
}

module.exports = new SentinelService();
