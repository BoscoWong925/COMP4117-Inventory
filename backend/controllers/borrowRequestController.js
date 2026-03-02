const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const User = require('../models/User');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Generate next request ID
 */
const getNextRequestId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'requestId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `REQ-${String(counter.seq).padStart(3, '0')}`;
};

/**
 * Helper: populate item name and borrower name on requests (batched for performance)
 */
const populateRequests = async (requests) => {
  if (!requests || requests.length === 0) return [];

  // Collect unique IDs
  const itemIds = [...new Set(requests.map(r => (r.toObject ? r.toObject() : r).itemID))];
  const userIds = [...new Set(requests.map(r => (r.toObject ? r.toObject() : r).borrowerID))];

  // Batch fetch items and users
  const [items, users] = await Promise.all([
    Item.find({ itemId: { $in: itemIds } }).lean(),
    User.find({ userId: { $in: userIds } }).lean()
  ]);

  // Build lookup maps
  const itemMap = {};
  items.forEach(i => { itemMap[i.itemId] = i.name; });
  const userMap = {};
  users.forEach(u => { userMap[u.userId] = u.name; });

  return requests.map(req => {
    const reqObj = req.toObject ? req.toObject() : { ...req };
    reqObj.itemName = itemMap[reqObj.itemID] || 'Unknown';
    reqObj.borrowerName = userMap[reqObj.borrowerID] || reqObj.borrowerID;
    reqObj.id = reqObj.requestId;
    return reqObj;
  });
};

/**
 * GET /api/borrow-requests
 * All requests with filtering, sorting, pagination (admin/operator).
 */
exports.getAllRequests = catchAsync(async (req, res) => {
  const {
    status, borrowerId, search,
    requestDateFrom, requestDateTo,
    approvalDateFrom, approvalDateTo,
    returnDateFrom, returnDateTo,
    returnedDateFrom, returnedDateTo,
    page = 1, pageSize = 10,
    sortBy = 'requestDate', sortDir = 'desc'
  } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (borrowerId) filter.borrowerID = borrowerId;

  // Date range filters
  if (requestDateFrom || requestDateTo) {
    filter.requestDate = {};
    if (requestDateFrom) filter.requestDate.$gte = new Date(requestDateFrom);
    if (requestDateTo) filter.requestDate.$lte = new Date(requestDateTo);
  }
  if (approvalDateFrom || approvalDateTo) {
    filter.approvalDate = {};
    if (approvalDateFrom) filter.approvalDate.$gte = new Date(approvalDateFrom);
    if (approvalDateTo) filter.approvalDate.$lte = new Date(approvalDateTo);
  }
  if (returnDateFrom || returnDateTo) {
    filter.returnDate = {};
    if (returnDateFrom) filter.returnDate.$gte = new Date(returnDateFrom);
    if (returnDateTo) filter.returnDate.$lte = new Date(returnDateTo);
  }
  if (returnedDateFrom || returnedDateTo) {
    filter.returnedDate = {};
    if (returnedDateFrom) filter.returnedDate.$gte = new Date(returnedDateFrom);
    if (returnedDateTo) filter.returnedDate.$lte = new Date(returnedDateTo);
  }

  // Text search: search across requestId, item name, borrower name/ID
  let searchFilter = null;
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    // Search in request fields
    searchFilter = {
      $or: [
        { requestId: searchRegex },
        { borrowerID: searchRegex },
        { itemID: searchRegex }
      ]
    };
  }

  // Combine filters
  const combinedFilter = searchFilter
    ? { $and: [filter, searchFilter] }
    : filter;

  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);

  const [total, requests] = await Promise.all([
    BorrowRequest.countDocuments(combinedFilter),
    BorrowRequest.find(combinedFilter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  const populated = await populateRequests(requests);

  res.status(200).json({
    success: true,
    requests: populated,
    total,
    page: parseInt(page),
    pageSize: limit
  });
});

/**
 * GET /api/borrow-requests/pending
 * Get pending requests + top-level count for notification badge.
 */
exports.getPendingRequests = catchAsync(async (req, res) => {
  const [requests, topLevelCount] = await Promise.all([
    BorrowRequest.find({ status: 'Pending' }).sort({ requestDate: -1 }).lean(),
    BorrowRequest.countDocuments({ status: 'Pending', parentRequestId: null })
  ]);

  const populated = await populateRequests(requests);

  res.status(200).json({
    success: true,
    requests: populated,
    total: requests.length,
    count: topLevelCount
  });
});

/**
 * GET /api/borrow-requests/pending-count
 * Lightweight endpoint: returns only the pending count for notification badge.
 */
exports.getPendingCount = catchAsync(async (req, res) => {
  const count = await BorrowRequest.countDocuments({ status: 'Pending', parentRequestId: null });
  res.status(200).json({ success: true, count });
});

/**
 * GET /api/borrow-requests/my
 * Current user's requests (user role).
 */
exports.getMyRequests = catchAsync(async (req, res) => {
  const { status, page = 1, pageSize = 10, sortBy = 'requestDate', sortDir = 'desc' } = req.query;

  const filter = { borrowerID: req.user.userId };
  if (status) filter.status = status;

  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);

  const [total, requests] = await Promise.all([
    BorrowRequest.countDocuments(filter),
    BorrowRequest.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  const populated = await populateRequests(requests);

  res.status(200).json({
    success: true,
    requests: populated,
    total,
    page: parseInt(page),
    pageSize: limit
  });
});

/**
 * GET /api/borrow-requests/:id
 * Single request.
 */
exports.getRequestById = catchAsync(async (req, res, next) => {
  const request = await BorrowRequest.findOne({ requestId: req.params.id }).lean();
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  // Users can only see their own requests
  if (req.user.role === 'user' && request.borrowerID !== req.user.userId) {
    return next(ApiError.forbidden('You can only view your own requests'));
  }

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0]
  });
});

/**
 * POST /api/borrow-requests
 * Create a new borrow request (auto-creates child requests for components).
 */
exports.createRequest = catchAsync(async (req, res, next) => {
  const { itemID, reason } = req.body;
  const borrowerID = req.user.userId;

  // Validate item exists and is available
  const item = await Item.findOne({ itemId: itemID });
  if (!item) {
    return next(ApiError.notFound(`Item ${itemID} not found`));
  }
  if (item.status !== 'Available') {
    return next(ApiError.badRequest(`Item ${itemID} is not available for borrowing (current status: ${item.status})`));
  }

  // Create parent request
  const parentRequestId = await getNextRequestId();
  const parentRequest = await BorrowRequest.create({
    requestId: parentRequestId,
    itemID,
    borrowerID,
    status: 'Pending',
    requestDate: new Date(),
    reason,
    notes: '',
    parentRequestId: null
  });

  // Handle file attachments
  if (req.files && req.files.length > 0) {
    parentRequest.attachments = req.files.map(file => ({
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));
    await parentRequest.save();
  }

  await addAuditLog(borrowerID, 'BORROW_REQUEST_CREATED', `Request created for item ${itemID}`, itemID);

  // Auto-create child requests for fixed components — optimized with batch insert
  let childRequests = [];
  if (item.fixedComponents && item.fixedComponents.length > 0) {
    // Verify which components exist
    const componentItems = await Item.find({ itemId: { $in: item.fixedComponents } }).lean();
    const validComponentIds = componentItems.map(c => c.itemId);

    if (validComponentIds.length > 0) {
      // Batch-generate request IDs
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'requestId' },
        { $inc: { seq: validComponentIds.length } },
        { new: true, upsert: true }
      );
      const startSeq = counter.seq - validComponentIds.length + 1;

      const childRequestDocs = validComponentIds.map((componentId, idx) => ({
        requestId: `REQ-${String(startSeq + idx).padStart(3, '0')}`,
        itemID: componentId,
        borrowerID,
        status: 'Pending',
        requestDate: new Date(),
        reason: `Auto-created with parent request ${parentRequestId}`,
        notes: '',
        parentRequestId: parentRequestId
      }));

      childRequests = await BorrowRequest.insertMany(childRequestDocs);

      // Fire-and-forget child audit logs
      const auditPromises = childRequests.map(c =>
        addAuditLog(borrowerID, 'BORROW_REQUEST_CREATED',
          `Child request created for component ${c.itemID} (parent: ${parentRequestId})`, c.itemID)
      );
      Promise.all(auditPromises).catch(err => console.error('Audit log error:', err.message));
    }
  }

  res.status(201).json({
    success: true,
    request: parentRequest,
    childRequests,
    componentCount: childRequests.length
  });
});

/**
 * PUT /api/borrow-requests/:id/approve
 * Approve a request (cascades to children) — optimized with bulk updates.
 */
exports.approveRequest = catchAsync(async (req, res, next) => {
  const { returnDate, location, remark } = req.body;

  const request = await BorrowRequest.findOne({ requestId: req.params.id });
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  if (request.status !== 'Pending') {
    return next(ApiError.badRequest(`Request is already ${request.status}`));
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const parsedReturnDate = returnDate ? new Date(returnDate) : null;

  // Update parent request
  request.status = 'Approved';
  request.approvalDate = now;
  request.approvedBy = req.user.userId;
  request.returnDate = parsedReturnDate;
  if (remark) request.notes = remark;

  // Fetch child requests in parallel with parent save
  const [, childRequests] = await Promise.all([
    request.save(),
    BorrowRequest.find({ parentRequestId: req.params.id, status: 'Pending' }).lean()
  ]);

  // Build bulk update for child requests
  const childUpdateData = {
    status: 'Approved',
    approvalDate: now,
    approvedBy: req.user.userId,
    returnDate: parsedReturnDate
  };
  if (remark) childUpdateData.notes = remark;

  // Collect all item IDs to update (parent + children)
  const allItemIds = [request.itemID, ...childRequests.map(c => c.itemID)];
  const itemUpdateData = {
    status: 'In-use',
    currentBorrower: request.borrowerID,
    lastUpdate: today
  };
  if (location) itemUpdateData.location = location;

  // Execute bulk updates in parallel
  const bulkOps = [
    Item.updateMany({ itemId: { $in: allItemIds } }, { $set: itemUpdateData })
  ];
  if (childRequests.length > 0) {
    bulkOps.push(
      BorrowRequest.updateMany(
        { parentRequestId: req.params.id, status: 'Pending' },
        { $set: childUpdateData }
      )
    );
  }
  await Promise.all(bulkOps);

  // Fire-and-forget audit logs
  const auditPromises = [
    addAuditLog(req.user.userId, 'BORROW_REQUEST_APPROVED', `Request approved for item ${request.itemID}`, request.itemID),
    ...childRequests.map(c =>
      addAuditLog(req.user.userId, 'BORROW_REQUEST_APPROVED', `Child request auto-approved with parent ${req.params.id}`, c.itemID)
    )
  ];
  Promise.all(auditPromises).catch(err => console.error('Audit log error:', err.message));

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0]
  });
});

/**
 * PUT /api/borrow-requests/:id/reject
 * Reject a request (cascades to children) — optimized with bulk update.
 */
exports.rejectRequest = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const request = await BorrowRequest.findOne({ requestId: req.params.id });
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  if (request.status !== 'Pending') {
    return next(ApiError.badRequest(`Request is already ${request.status}`));
  }

  const now = new Date();
  request.status = 'Rejected';
  request.notes = reason || 'Rejected';
  request.approvalDate = now;
  request.approvedBy = req.user.userId;

  // Fetch children in parallel with parent save
  const [, childRequests] = await Promise.all([
    request.save(),
    BorrowRequest.find({ parentRequestId: req.params.id, status: 'Pending' }).lean()
  ]);

  // Bulk reject all children
  if (childRequests.length > 0) {
    await BorrowRequest.updateMany(
      { parentRequestId: req.params.id, status: 'Pending' },
      {
        $set: {
          status: 'Rejected',
          notes: `Auto-rejected with parent: ${reason || 'No reason'}`,
          approvalDate: now,
          approvedBy: req.user.userId
        }
      }
    );
  }

  // Fire-and-forget audit logs
  const auditPromises = [
    addAuditLog(req.user.userId, 'BORROW_REQUEST_REJECTED', `Request rejected: ${reason || 'No reason provided'}`, request.itemID),
    ...childRequests.map(c =>
      addAuditLog(req.user.userId, 'BORROW_REQUEST_REJECTED', `Child request auto-rejected with parent ${req.params.id}: ${reason}`, c.itemID)
    )
  ];
  Promise.all(auditPromises).catch(err => console.error('Audit log error:', err.message));

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0]
  });
});

/**
 * PUT /api/borrow-requests/:id/return
 * Return an item (cascades to children) — optimized with bulk updates.
 */
exports.returnRequest = catchAsync(async (req, res, next) => {
  const { location } = req.body;

  const request = await BorrowRequest.findOne({ requestId: req.params.id });
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  if (request.status !== 'Approved') {
    return next(ApiError.badRequest(`Cannot return a request with status: ${request.status}`));
  }

  // Users can only return their own items
  if (req.user.role === 'user' && request.borrowerID !== req.user.userId) {
    return next(ApiError.forbidden('You can only return your own borrowed items'));
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Update parent request
  request.status = 'Returned';
  request.returnedDate = now;

  // Fetch item and child requests in parallel with parent save
  const [, item, childRequests] = await Promise.all([
    request.save(),
    Item.findOne({ itemId: request.itemID }),
    BorrowRequest.find({ parentRequestId: req.params.id, status: 'Approved' }).lean()
  ]);

  // Collect all item IDs to reset (parent + components + children)
  const allItemIds = [request.itemID];
  if (item && item.fixedComponents && item.fixedComponents.length > 0) {
    allItemIds.push(...item.fixedComponents);
  }
  childRequests.forEach(c => {
    if (!allItemIds.includes(c.itemID)) allItemIds.push(c.itemID);
  });

  const itemUpdateData = {
    status: 'Available',
    currentBorrower: null,
    lastUpdate: today
  };
  if (location) itemUpdateData.location = location;

  // Bulk update all items and child requests in parallel
  const bulkOps = [
    Item.updateMany({ itemId: { $in: allItemIds } }, { $set: itemUpdateData })
  ];
  if (childRequests.length > 0) {
    bulkOps.push(
      BorrowRequest.updateMany(
        { parentRequestId: req.params.id, status: 'Approved' },
        { $set: { status: 'Returned', returnedDate: now } }
      )
    );
  }
  await Promise.all(bulkOps);

  // Fire-and-forget audit logs
  const auditPromises = [
    addAuditLog(req.user.userId, 'ITEM_RETURNED', `Item returned: ${request.itemID}`, request.itemID),
    ...childRequests.map(c =>
      addAuditLog(req.user.userId, 'ITEM_RETURNED', `Child item auto-returned with parent ${req.params.id}`, c.itemID)
    )
  ];
  Promise.all(auditPromises).catch(err => console.error('Audit log error:', err.message));

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0]
  });
});

/**
 * POST /api/borrow-requests/:id/attachments
 * Upload attachments to an existing request.
 */
exports.uploadAttachments = catchAsync(async (req, res, next) => {
  const request = await BorrowRequest.findOne({ requestId: req.params.id });
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  if (!req.files || req.files.length === 0) {
    return next(ApiError.badRequest('No files uploaded'));
  }

  const newAttachments = req.files.map(file => ({
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path
  }));

  request.attachments = [...(request.attachments || []), ...newAttachments];
  await request.save();

  res.status(200).json({
    success: true,
    files: newAttachments
  });
});
