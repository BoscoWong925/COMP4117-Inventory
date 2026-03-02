const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/users/:id
 * Get user by userId (excluding password).
 */
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ userId: req.params.id }).select('-password');
  if (!user) {
    return next(ApiError.notFound(`User ${req.params.id} not found`));
  }

  res.status(200).json({
    success: true,
    user: {
      id: user.userId,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    }
  });
});
