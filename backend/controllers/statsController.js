const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/stats
 * Dashboard statistics for admin/operator.
 */
exports.getStats = catchAsync(async (req, res) => {
  const [
    totalItems,
    availableItems,
    lentOutItems,
    missingItems,
    disposedItems,
    pendingRequests,
    returnedRequests,
    approvedRequests,
    rejectedRequests
  ] = await Promise.all([
    Item.countDocuments(),
    Item.countDocuments({ status: 'Available' }),
    Item.countDocuments({ status: 'In-use' }),
    Item.countDocuments({ status: 'Missing' }),
    Item.countDocuments({ status: 'Dispose' }),
    BorrowRequest.countDocuments({ status: { $in: ['Pending', 'Pending Check-Out'] }, parentRequestId: null }),
    BorrowRequest.countDocuments({ status: 'Returned' }),
    BorrowRequest.countDocuments({ status: 'Approved' }),
    BorrowRequest.countDocuments({ status: 'Rejected' })
  ]);

  res.status(200).json({
    success: true,
    totalItems,
    availableItems,
    lentOutItems,
    missingItems,
    disposedItems,
    pendingRequests,
    returnedRequests,
    approvedRequests,
    rejectedRequests
  });
});
