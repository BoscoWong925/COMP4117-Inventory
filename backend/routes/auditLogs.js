const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', authorize('admin', 'operator', 'user'), auditLogController.getAllLogs);
router.delete('/', authorize('admin'), auditLogController.deleteLogs);

module.exports = router;
