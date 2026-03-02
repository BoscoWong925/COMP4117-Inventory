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
    pendingRequests,
    returnedRequests,
    approvedRequests,
    rejectedRequests
  ] = await Promise.all([
    Item.countDocuments(),
    Item.countDocuments({ status: 'Available' }),
    Item.countDocuments({ status: 'In-use' }),
    BorrowRequest.countDocuments({ status: 'Pending' }),
    BorrowRequest.countDocuments({ status: 'Returned' }),
    BorrowRequest.countDocuments({ status: 'Approved' }),
    BorrowRequest.countDocuments({ status: 'Rejected' })
  ]);

  res.status(200).json({
    success: true,
    totalItems,
    availableItems,
    lentOutItems,
    pendingRequests,
    returnedRequests,
    approvedRequests,
    rejectedRequests
  });
});
