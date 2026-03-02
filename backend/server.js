const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Validate environment configuration before anything else
const { validateEnv, logConfig } = require('./config/env');
const config = validateEnv();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

// Route imports
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const borrowRequestRoutes = require('./routes/borrowRequests');
const auditLogRoutes = require('./routes/auditLogs');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');

const app = express();

// Parse CORS origins from config (comma-separated string)
const corsOrigins = config.CORS_ORIGINS.split(',').map(origin => origin.trim());

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Compression - gzip all responses for faster transfer
app.use(compression({ level: 6, threshold: 1024 }));

// CORS - dynamically configured from environment
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Body parsers - increased limits for large Excel imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/borrow-requests', borrowRequestRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// 404 catch-all for undefined routes
app.use('*', (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
});

// Centralized error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;
const NODE_ENV = config.NODE_ENV;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  logConfig(config);
  if (NODE_ENV === 'development') {
    console.log(`📱 Frontend accessible at http://localhost:${config.FRONTEND_PORT}`);
    console.log(`📡 API accessible at http://localhost:${PORT}`);
    console.log('💡 Tip: Set NODE_ENV=production for production deployment\n');
  }
});

module.exports = app;
