const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/users - List all users (admin/operator)
 */
router.get('/', authorize('admin', 'operator'), userController.getAllUsers);

/**
 * POST /api/users - Create new user (admin only — can create operator, teacher, student)
 */
router.post('/', authorize('admin'), userController.createUser);

/**
 * POST /api/users/send-email - Send custom email to a user (admin/operator/teacher)
 */
router.post('/send-email', userController.sendEmailToUser);

/**
 * GET /api/users/teachers - Get all teachers (for owner selection)
 */
router.get('/teachers', userController.getTeachers);

/**
 * GET /api/users/search/:query - Search users (admin/operator)
 */
router.get('/search/:query', authorize('admin', 'operator'), userController.searchUsers);

/**
 * GET /api/users/:id - Get user by ID (admin/operator or self)
 */
router.get('/:id', userController.getUserById);

/**
 * PUT /api/users/:id - Update user (admin or self for profile)
 */
router.put('/:id', userController.updateUser);

/**
 * DELETE /api/users/:id - Delete user (admin only)
 */
router.delete('/:id', authorize('admin'), userController.deleteUser);

/**
 * PUT /api/users/:id/status - Toggle user active status (admin only)
 */
router.put('/:id/status', authorize('admin'), userController.toggleUserStatus);

module.exports = router;
