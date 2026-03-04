const ApiError = require('../utils/ApiError');

/**
 * Centralized error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }

  // Mongoose bad ObjectId / CastError
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    error = ApiError.badRequest(`Duplicate value for field: ${field}`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = ApiError.badRequest(messages.join('. '));
  }

  // JWT errors
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token has expired');
  }
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = ApiError.badRequest('File too large. Maximum size is 10MB.');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = ApiError.badRequest('Unexpected file field.');
  }

  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const response = {
    success: false,
    error: message
  };

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
