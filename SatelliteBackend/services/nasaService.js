const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const pRetry = require('p-retry');

class NasaService {
  /**
   * Fetches an XYZ tile from NASA GIBS WMTS.
   * Maps Zoom/X/Y to TileMatrix/TileCol/TileRow.
   */
  async getTile(layer, z, x, y, date = null) {
    const time = date || new Date().toISOString().split('T')[0];
    const layerName = layer || config.nasa.defaultLayer;
    
    // NASA GIBS EPSG:3857 URL: /{Layer}/{Style}/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.{Format}
    const url = `${config.nasa.baseUrl}/${layerName}/default/${time}/${config.nasa.tileMatrixSet}/${z}/${y}/${x}.${config.nasa.format}`;
    
    logger.info(`🛰️  NASA GIBS Req: ${url}`);

    const fetchTask = async () => {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'Accept': 'image/*'
        }
      });
      return response.data;
    };

    try {
      return await pRetry(fetchTask, {
        retries: 3,
        onFailedAttempt: error => {
          logger.warn(`NASA Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      });
    } catch (error) {
      logger.error(`NASA GIBS Fetch Error: ${error.message}`);
      throw new Error(`Failed to fetch NASA tile: ${error.message}`);
    }
  }

  async getMetadata() {
    return {
      service: 'NASA GIBS',
      layers: [config.nasa.defaultLayer, 'MODIS_Aqua_CorrectedReflectance_TrueColor'],
      projection: 'EPSG:3857 (Web Mercator)',
      attribution: 'NASA Earthdata / GIBS'
    };
  }
}

module.exports = new NasaService();
