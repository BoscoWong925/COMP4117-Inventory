const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');
const { sendWelcomeEmail, sendAccountDeactivatedEmail, sendAccountActivatedEmail, sendRoleChangedEmail } = require('../utils/emailService');

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
  subRole: user.subRole || 'student',
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
    role, subRole, displayRole, isActive, search,
    page = 1, pageSize = 10,
    sortBy = 'createdAt', sortDir = 'desc'
  } = req.query;

  const filter = {};

  // displayRole maps user-facing roles to internal role+subRole
  if (displayRole) {
    if (displayRole === 'admin') { filter.role = 'admin'; }
    else if (displayRole === 'operator') { filter.role = 'operator'; }
    else if (displayRole === 'teacher') { filter.role = 'user'; filter.subRole = 'teacher'; }
    else if (displayRole === 'student') { filter.role = 'user'; filter.$or = [{ subRole: 'student' }, { subRole: { $exists: false } }, { subRole: null }]; }
  } else {
    if (role) filter.role = role;
    if (subRole) filter.subRole = subRole;
  }

  if (isActive !== undefined) filter.isActive = isActive === 'true';

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    const searchOr = [
      { userId: searchRegex },
      { username: searchRegex },
      { name: searchRegex },
      { email: searchRegex }
    ];
    // If $or already exists (from displayRole=student), combine with $and
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
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
    subRole: req.body.subRole || (role === 'user' ? 'student' : undefined),
    department,
    isActive: true
  });

  // Log to audit
  await addAuditLog(req.user.userId, 'USER_CREATED', `User ${user.name} (${user.userId}) created`, user.userId);

  // Email: send welcome email
  try {
    await sendWelcomeEmail({ user, createdBy: req.user });
  } catch (emailErr) {
    await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Welcome email failed for ${user.userId}: ${emailErr.message}`, user.userId);
  }

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

  // Track role change for email notification
  const oldRole = user.role + (user.subRole ? ` (${user.subRole})` : '');

  // Update allowed fields
  if (name) user.name = name;
  if (email) user.email = email.toLowerCase();
  if (department) user.department = department;
  const roleChanged = (role && req.user.role === 'admin' && role !== user.role) ||
                      (req.body.subRole && req.user.role === 'admin' && req.body.subRole !== user.subRole);
  if (role && req.user.role === 'admin') user.role = role;
  if (req.body.subRole && req.user.role === 'admin') user.subRole = req.body.subRole;

  // Password change (admin can change anyone's, users can change their own)
  if (req.body.password) {
    if (req.user.role === 'admin' || req.user.userId === userId) {
      user.password = req.body.password;
    }
  }

  await user.save();

  // Log to audit
  await addAuditLog(req.user.userId, 'USER_UPDATED', `User ${user.name} (${user.userId}) updated`, user.userId);

  // Email: notify user if role changed
  if (roleChanged) {
    const newRole = user.role + (user.subRole ? ` (${user.subRole})` : '');
    try {
      await sendRoleChangedEmail({ user, oldRole, newRole });
    } catch (emailErr) {
      await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Role change email failed for ${user.userId}: ${emailErr.message}`, user.userId);
    }
  }

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
  await addAuditLog(req.user.userId, 'USER_DELETED', `User ${user.name} (${user.userId}) deleted`, user.userId);

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
  await addAuditLog(
    req.user.userId,
    isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    `User ${user.name} (${user.userId}) ${isActive ? 'activated' : 'deactivated'}`,
    user.userId
  );

  // Email: notify user about account status change
  try {
    if (isActive) {
      await sendAccountActivatedEmail({ user });
    } else {
      await sendAccountDeactivatedEmail({ user });
    }
  } catch (emailErr) {
    await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Account status email failed for ${user.userId}: ${emailErr.message}`, user.userId);
  }

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

/**
 * GET /api/users/teachers
 * Get all teacher users (for owner dropdowns).
 */
exports.getTeachers = catchAsync(async (req, res) => {
  const teachers = await User.find({ role: 'user', subRole: 'teacher', isActive: true })
    .select('-password')
    .lean();

  teachers.sort((a, b) => {
    const aName = String(a?.name || '').toLowerCase();
    const bName = String(b?.name || '').toLowerCase();
    if (aName < bName) return -1;
    if (aName > bName) return 1;
    return 0;
  });

  res.status(200).json({
    success: true,
    users: teachers.map(formatUserResponse)
  });
});

/**
 * POST /api/users/send-email
 * Send a custom email to a user (admin/operator/teacher).
 */
exports.sendEmailToUser = catchAsync(async (req, res, next) => {
  const { recipientId, subject, message } = req.body;

  // Only admin, operator, or teacher can send
  const isTeacher = req.user.role === 'user' && req.user.subRole === 'teacher';
  if (req.user.role !== 'admin' && req.user.role !== 'operator' && !isTeacher) {
    return next(ApiError.forbidden('You do not have permission to send emails'));
  }

  if (!recipientId || !subject || !message) {
    return next(ApiError.badRequest('recipientId, subject, and message are required'));
  }

  const recipient = await User.findOne({ userId: recipientId }).lean();
  if (!recipient) {
    return next(ApiError.notFound(`User ${recipientId} not found`));
  }
  if (!recipient.email) {
    return next(ApiError.badRequest('Recipient has no email address'));
  }

  const { sendCustomEmail } = require('../utils/emailService');
  const result = await sendCustomEmail({
    to: recipient.email,
    subject,
    message,
    senderName: req.user.name || req.user.userId
  });

  if (result.skipped) {
    return res.status(200).json({ success: false, message: result.reason });
  }

  if (!result.sent) {
    return next(ApiError.internal(`Email sending failed: ${result.error || 'Unknown error'}`));
  }

  await addAuditLog(
    req.user.userId,
    'EMAIL_SENT',
    `Custom email sent to ${recipient.name} (${recipient.userId}): ${subject}`,
    recipient.userId
  );

  res.status(200).json({
    success: true,
    message: 'Email sent successfully'
  });
});
