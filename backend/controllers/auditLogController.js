const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');

/**
 * GET /api/audit-logs
 * All logs with filtering and pagination.
 */
exports.getAllLogs = catchAsync(async (req, res) => {
  const { action, actions, search, page = 1, pageSize = 10, timeRange, dateFrom, dateTo, userID, itemID, sortField = 'timestamp', sortDir = 'desc' } = req.query;

  const filter = {};

  // Single action filter
  if (action) filter.action = action;

  // Multiple actions filter (comma-separated)
  if (actions) {
    const actionList = actions.split(',').map(a => a.trim());
    filter.action = { $in: actionList };
  }

  // Time range filter
  if (timeRange && timeRange !== 'all') {
    const now = new Date();
    const rangeMs = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '4w': 28 * 24 * 60 * 60 * 1000,
      '6M': 183 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
      '2y': 730 * 24 * 60 * 60 * 1000
    };
    if (rangeMs[timeRange]) {
      filter.timestamp = { $gte: new Date(now.getTime() - rangeMs[timeRange]) };
    }
  }

  // Date range filter
  if (dateFrom || dateTo) {
    filter.timestamp = filter.timestamp || {};
    if (dateFrom) {
      filter.timestamp.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filter.timestamp.$lte = to;
    }
  }

  // User ID filter
  if (userID) {
    filter.userID = new RegExp(userID, 'i');
  }

  // Item ID filter
  if (itemID) {
    filter.affectedItemID = new RegExp(itemID, 'i');
  }

  // Text search (across multiple fields)
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { userID: searchRegex },
      { details: searchRegex },
      { affectedItemID: searchRegex }
    ];
  }

  // Sorting
  const sortObj = {};
  sortObj[sortField] = sortDir === 'asc' ? 1 : -1;

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .sort(sortObj)
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
