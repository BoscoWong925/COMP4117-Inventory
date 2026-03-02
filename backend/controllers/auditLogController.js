const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

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
