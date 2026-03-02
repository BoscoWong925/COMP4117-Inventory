const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/:id', authorize('admin', 'operator'), userController.getUserById);

module.exports = router;
