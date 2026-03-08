const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('admin', 'operator'), auditLogController.getAllLogs);
router.delete('/by-time', authorize('admin'), auditLogController.deleteByTimeRange);

module.exports = router;
