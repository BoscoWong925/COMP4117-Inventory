const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

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
 * DELETE /api/audit-logs/by-time
 * Delete audit log records older than a given time range.
 */
exports.deleteByTimeRange = catchAsync(async (req, res) => {
  const { timeRange } = req.body;

  if (!timeRange) {
    throw new ApiError('timeRange is required', 400);
  }

  const now = new Date();
  let cutoff;

  switch (timeRange) {
    case '15min':
      cutoff = new Date(now.getTime() - 15 * 60 * 1000);
      break;
    case '1hour':
      cutoff = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24hours':
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7days':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '4weeks':
      cutoff = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      cutoff = null;
      break;
    default:
      throw new ApiError('Invalid timeRange value', 400);
  }

  let result;
  if (cutoff) {
    result = await AuditLog.deleteMany({ timestamp: { $gte: cutoff } });
  } else {
    result = await AuditLog.deleteMany({});
  }

  res.status(200).json({
    success: true,
    deletedCount: result.deletedCount
  });
});
