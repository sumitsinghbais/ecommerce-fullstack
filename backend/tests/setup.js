const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables FIRST and override existing ones
dotenv.config({ 
  path: path.join(__dirname, '..', '.env.test'),
  override: true 
});

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

// Mock nodemailer
// ... (lines 13-19)
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn((callback) => callback(null, true)),
  }),
}));

let mongoServer;

/**
 * Connect to the test database before running tests.
 * Uses MongoDB Memory Server with Replica Set for Transactions.
 */
const connectTestDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    if (!mongoServer) {
      mongoServer = await MongoMemoryReplSet.create({ 
        replSet: { count: 1 },
        instanceOpts: [{ storageEngine: 'wiredTiger' }]
      });
    }

    const mongoURI = mongoServer.getUri();
    const dbName = `test_db_${process.pid}`;
    await mongoose.connect(mongoURI, { dbName });
    console.log(`✅ Connected to MongoDB Memory ReplicaSet [DB: ${dbName}]`);
  } catch (error) {
    console.error('❌ Test DB Connection Error:', error.message);
    throw error;
  }
};

/**
 * Disconnect from the test database after tests are done.
 */
const disconnectTestDB = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
    console.log('✅ Test Database cleaned up and disconnected');
  } catch (error) {
    console.error('❌ Failed to clean up test DB:', error.message);
  }
};

/**
 * Clear all collections between test suites.
 */
const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = { connectTestDB, disconnectTestDB, clearTestDB };
