const mongoose = require('mongoose');

// MongoDB connection string must be provided via environment variable
if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set.');
  console.error('Please set MONGODB_URI in your .env file or environment variables.');
  process.exit(1);
}

const connectDB = async () => {
  try {
  
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
