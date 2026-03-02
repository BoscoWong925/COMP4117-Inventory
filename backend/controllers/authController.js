const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. Please set it in your .env file.');
  }
  return jwt.sign(
    {
      id: user._id,
      userId: user.userId,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

/**
 * POST /api/auth/login
 */
exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(ApiError.badRequest('Please provide username and password'));
  }

  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) {
    return next(ApiError.unauthorized('Invalid credentials'));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(ApiError.unauthorized('Invalid credentials'));
  }

  const token = generateToken(user);

  await addAuditLog(user.userId, 'LOGIN', `User ${user.name} logged in`, null);

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user.userId,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      username: user.username
    }
  });
});

/**
 * POST /api/auth/logout
 */
exports.logout = catchAsync(async (req, res) => {
  await addAuditLog(req.user.userId, 'LOGOUT', `User ${req.user.name} logged out`, null);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/me
 */
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ userId: req.user.userId });

  if (!user) {
    return next(ApiError.notFound('User not found. Account may have been deleted.'));
  }

  res.status(200).json({
    success: true,
    user: {
      id: user.userId,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      username: user.username
    }
  });
});
