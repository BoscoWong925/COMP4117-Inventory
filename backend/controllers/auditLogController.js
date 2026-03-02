const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/audit-logs
 * All logs with filtering and pagination.
 */
exports.getAllLogs = catchAsync(async (req, res) => {
  const { action, search, page = 1, pageSize = 10 } = req.query;

  const filter = {};

  if (action) filter.action = action;

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { userID: searchRegex },
      { details: searchRegex },
      { affectedItemID: searchRegex }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  // Map logId to id for frontend compatibility
  const mappedLogs = logs.map(log => {
    log.id = log.logId;
    return log;
  });

  res.status(200).json({
    success: true,
    logs: mappedLogs,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});
