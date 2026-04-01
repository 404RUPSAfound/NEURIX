const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Try connecting to a standard local MongoDB first
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/neurix_intel', {
      serverSelectionTimeoutMS: 2000 // Only wait 2 seconds before failing over
    });
    logger.info(`💾  MONGODB_CONNECTED: ${conn.connection.host}`);
  } catch (error) {
    logger.warn(`⚠️  MONGODB Standard Connection Failed: ${error.message}`);
    logger.info('🔄  Booting In-Memory MongoDB Fallback Engine...');

    try {
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      const memConn = await mongoose.connect(mongoUri);
      logger.info(`💾  OFFLINE_MODE DB_CONNECTED: In-Memory Engine Active (${memConn.connection.host})`);
    } catch (memError) {
      logger.error(`❌  FATAL DB ERROR: Could not start In-Memory Engine: ${memError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
