const mongoose = require('mongoose');

let mongoServer = null;

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // If no valid URI is configured, use in-memory MongoDB
    if (!uri || uri === 'mongodb://localhost:27017/comp4117_inventory') {
      console.log('No external MongoDB configured. Starting in-memory MongoDB...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      console.log(`In-memory MongoDB started at: ${uri}`);
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Get the mongod server instance (needed for graceful shutdown)
const getMongoServer = () => mongoServer;

// Disconnect function for graceful shutdown
const disconnectDB = async () => {
  try {
    if (mongoServer) {
      await mongoServer.stop();
      console.log('In-memory MongoDB stopped');
    }
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error.message);
  }
};

const seedInMemoryDB = async () => {
  if (!mongoServer) {
    console.log('External MongoDB in use. Skipping auto-seed.');
    return;
  }

  const User = require('../models/User');
  const Item = require('../models/Item');
  const BorrowRequest = require('../models/BorrowRequest');
  const AuditLog = require('../models/AuditLog');
  const Counter = require('../models/Counter');

  // Check if data already exists
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Database is empty and ready for use. Create data through API endpoints.');
};

module.exports = connectDB;
module.exports.getMongoServer = getMongoServer;
module.exports.disconnectDB = disconnectDB;
