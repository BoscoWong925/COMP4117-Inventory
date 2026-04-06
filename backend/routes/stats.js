const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard-queue', authorize('admin', 'operator', 'user'), statsController.getDashboardQueue);
router.get('/', authorize('admin', 'operator', 'user'), statsController.getStats);

module.exports = router;
