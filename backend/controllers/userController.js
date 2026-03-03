const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');

/**
 * Helper: Format user response (exclude password)
 */
const formatUserResponse = (user) => ({
  id: user.userId,
  userId: user.userId,
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

/**
 * GET /api/users
 * List all users with pagination and filtering (admin/operator).
 */
exports.getAllUsers = catchAsync(async (req, res) => {
  const {
    role, isActive, search,
    page = 1, pageSize = 10,
    sortBy = 'createdAt', sortDir = 'desc'
  } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { userId: searchRegex },
      { username: searchRegex },
      { name: searchRegex },
      { email: searchRegex }
    ];
  }

  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));

  res.status(200).json({
    success: true,
    users: users.map(formatUserResponse),
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * POST /api/users
 * Create new user (admin only).
 */
exports.createUser = catchAsync(async (req, res, next) => {
  const { userId, username, password, name, email, role, department } = req.body;

  // Validate required fields
  if (!userId || !username || !password || !name || !email || !role || !department) {
    return next(ApiError.badRequest('Missing required fields'));
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ userId }, { username }, { email }]
  });

  if (existingUser) {
    const field = existingUser.userId === userId ? 'userId' :
                  existingUser.username === username ? 'username' : 'email';
    return next(ApiError.conflict(`User with this ${field} already exists`));
  }

  // Create user
  const user = await User.create({
    userId,
    username: username.toLowerCase(),
    password,
    name,
    email: email.toLowerCase(),
    role,
    department,
    isActive: true
  });

  // Log to audit
  await addAuditLog({
    action: 'USER_CREATED',
    details: `User ${user.name} (${user.userId}) created`,
    userID: req.user.userId,
    affectedItemID: user.userId
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: formatUserResponse(user)
  });
});

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
    user: formatUserResponse(user)
  });
});

/**
 * PUT /api/users/:id
 * Update user details (admin can update anyone, users update themselves).
 */
exports.updateUser = catchAsync(async (req, res, next) => {
  const { name, email, department, role } = req.body;
  const userId = req.params.id;

  const user = await User.findOne({ userId });
  if (!user) {
    return next(ApiError.notFound(`User ${userId} not found`));
  }

  // Regular users can only update themselves
  if (req.user.role === 'user' && req.user.userId !== userId) {
    return next(ApiError.forbidden('You can only update your own profile'));
  }

  // Only admins can change role
  if (role && req.user.role !== 'admin') {
    return next(ApiError.forbidden('Only admins can change user roles'));
  }

  // Update allowed fields
  if (name) user.name = name;
  if (email) user.email = email.toLowerCase();
  if (department) user.department = department;
  if (role && req.user.role === 'admin') user.role = role;

  await user.save();

  // Log to audit
  await addAuditLog({
    action: 'USER_UPDATED',
    details: `User ${user.name} (${user.userId}) updated`,
    userID: req.user.userId,
    affectedItemID: user.userId
  });

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    user: formatUserResponse(user)
  });
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only).
 */
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findOneAndDelete({ userId: req.params.id });
  if (!user) {
    return next(ApiError.notFound(`User ${req.params.id} not found`));
  }

  // Log to audit
  await addAuditLog({
    action: 'USER_DELETED',
    details: `User ${user.name} (${user.userId}) deleted`,
    userID: req.user.userId,
    affectedItemID: user.userId
  });

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * PUT /api/users/:id/status
 * Toggle user active status (admin only).
 */
exports.toggleUserStatus = catchAsync(async (req, res, next) => {
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return next(ApiError.badRequest('isActive must be a boolean'));
  }

  const user = await User.findOne({ userId: req.params.id });
  if (!user) {
    return next(ApiError.notFound(`User ${req.params.id} not found`));
  }

  const previousStatus = user.isActive;
  user.isActive = isActive;
  await user.save();

  // Log to audit
  await addAuditLog({
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    details: `User ${user.name} (${user.userId}) ${isActive ? 'activated' : 'deactivated'}`,
    userID: req.user.userId,
    affectedItemID: user.userId
  });

  res.status(200).json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    user: formatUserResponse(user)
  });
});

/**
 * GET /api/users/search/:query
 * Search users by name, email, or userId.
 */
exports.searchUsers = catchAsync(async (req, res) => {
  const { query } = req.params;
  const { limit = 10 } = req.query;

  const searchRegex = new RegExp(query, 'i');
  const users = await User.find({
    $or: [
      { userId: searchRegex },
      { username: searchRegex },
      { name: searchRegex },
      { email: searchRegex }
    ]
  })
    .select('-password')
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    users: users.map(formatUserResponse),
    count: users.length
  });
});
