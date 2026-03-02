const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

/**
 * Verify JWT token and attach user to request.
 * Uses JWT payload directly to avoid a DB query on every request.
 * The JWT already contains userId, username, name, role, department.
 */
const authenticate = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(ApiError.unauthorized('No token provided. Please log in.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Use JWT payload directly — no DB round-trip per request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      name: decoded.name,
      role: decoded.role,
      department: decoded.department,
      _id: decoded.userId // compatibility alias
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired. Please log in again.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token. Please log in again.'));
    }
    next(error);
  }
};

/**
 * Restrict access to specific roles.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
