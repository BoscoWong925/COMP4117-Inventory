const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');

/**
 * GET /api/audit-logs
 * All logs with filtering and pagination.
 */
exports.getAllLogs = catchAsync(async (req, res) => {
  const { action, search, page = 1, pageSize = 10 } = req.query;

  const filter = {};

  if (action) filter.action = action;

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { userID: searchRegex },
      { details: searchRegex },
      { affectedItemID: searchRegex }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(pageSize));

  // Map logId to id for frontend compatibility
  const mappedLogs = logs.map(log => {
    const obj = log.toObject();
    obj.id = obj.logId;
    return obj;
  });

  res.status(200).json({
    success: true,
    logs: mappedLogs,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * DELETE /api/audit-logs
 * Delete specific audit logs by IDs (admin only).
 */
exports.deleteLogs = catchAsync(async (req, res) => {
  const { logIds } = req.body;

  if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
    return res.status(400).json({ success: false, error: 'logIds array is required' });
  }

  const result = await AuditLog.deleteMany({ logId: { $in: logIds } });

  await addAuditLog(
    req.user.userId,
    'AUDIT_LOGS_DELETED',
    `Deleted ${result.deletedCount} audit log(s)`,
    null
  );

  res.status(200).json({
    success: true,
    deletedCount: result.deletedCount,
    message: `${result.deletedCount} log(s) deleted successfully`
  });
});
