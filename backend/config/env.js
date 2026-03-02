/**
 * Environment Configuration Validator
 * Ensures all required environment variables are set before app starts
 */

const requiredVars = {
  MONGODB_URI: 'MongoDB connection string (e.g., mongodb://...)',
  JWT_SECRET: 'Secret key for JWT signing (generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")',
};

const optionalVars = {
  PORT: { default: 5001, description: 'Server port' },
  NODE_ENV: { default: 'development', description: 'Environment (development/staging/production)' },
  JWT_EXPIRES_IN: { default: '24h', description: 'JWT token expiration' },
  FRONTEND_PORT: { default: 3000, description: 'Frontend port (for logging)' },
  CORS_ORIGINS: { default: 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5001', description: 'Comma-separated CORS origins' },
};

/**
 * Validate and log environment configuration
 * @throws {Error} If required variables are missing
 */
const validateEnv = () => {
  const missingVars = [];
  const config = {};

  // Check required variables
  Object.entries(requiredVars).forEach(([key, description]) => {
    if (!process.env[key]) {
      missingVars.push(`  • ${key}: ${description}`);
    } else {
      config[key] = process.env[key];
    }
  });

  // Check optional variables with defaults
  Object.entries(optionalVars).forEach(([key, options]) => {
    config[key] = process.env[key] || options.default;
  });

  // If any required vars are missing, exit
  if (missingVars.length > 0) {
    console.error('\n❌ CONFIGURATION ERROR: Missing required environment variables!\n');
    console.error('The following variables must be set in backend/.env or environment:\n');
    missingVars.forEach(msg => console.error(msg));
    console.error('\n📋 Quick setup:');
    console.error('  1. Copy .env.example to backend/.env');
    console.error('  2. Update MONGODB_URI with your database connection string');
    console.error('  3. Update JWT_SECRET with a strong secret key\n');
    process.exit(1);
  }

  return config;
};

/**
 * Log environment configuration (safe, no secrets)
 */
const logConfig = (config) => {
  console.log('\n✅ Environment Configuration:');
  console.log(`   Node Environment: ${config.NODE_ENV}`);
  console.log(`   Server Port: ${config.PORT}`);
  console.log(`   MongoDB: ${config.MONGODB_URI.substring(0, 50)}...`);
  console.log(`   JWT Expires In: ${config.JWT_EXPIRES_IN}`);
  console.log(`   CORS Origins: ${config.CORS_ORIGINS}`);
  console.log(`   Frontend Port: ${config.FRONTEND_PORT}\n`);
};

module.exports = {
  validateEnv,
  logConfig,
};
