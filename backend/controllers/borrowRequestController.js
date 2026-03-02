const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const User = require('../models/User');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');

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
    const searchRegex = new RegExp(search, 'i');
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
  const total = await BorrowRequest.countDocuments(combinedFilter);
  const requests = await BorrowRequest.find(combinedFilter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));

  const populated = await populateRequests(requests);

  res.status(200).json({
    success: true,
    requests: populated,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * GET /api/borrow-requests/pending
 * Get pending requests + top-level count for notification badge.
 */
exports.getPendingRequests = catchAsync(async (req, res) => {
  const requests = await BorrowRequest.find({ status: 'Pending' }).sort({ requestDate: -1 });
  const populated = await populateRequests(requests);

  // Count only top-level (no parent) for badge
  const topLevelCount = await BorrowRequest.countDocuments({
    status: 'Pending',
    parentRequestId: null
  });

  res.status(200).json({
    success: true,
    requests: populated,
    total: requests.length,
    count: topLevelCount
  });
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
  const total = await BorrowRequest.countDocuments(filter);
  const requests = await BorrowRequest.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));

  const populated = await populateRequests(requests);

  res.status(200).json({
    success: true,
    requests: populated,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * GET /api/borrow-requests/:id
 * Single request.
 */
exports.getRequestById = catchAsync(async (req, res, next) => {
  const request = await BorrowRequest.findOne({ requestId: req.params.id });
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

  // Auto-create child requests for fixed components
  const childRequests = [];
  if (item.fixedComponents && item.fixedComponents.length > 0) {
    for (const componentId of item.fixedComponents) {
      const componentItem = await Item.findOne({ itemId: componentId });
      if (componentItem) {
        const childRequestId = await getNextRequestId();
        const childRequest = await BorrowRequest.create({
          requestId: childRequestId,
          itemID: componentId,
          borrowerID,
          status: 'Pending',
          requestDate: new Date(),
          reason: `Auto-created with parent request ${parentRequestId}`,
          notes: '',
          parentRequestId: parentRequestId
        });
        childRequests.push(childRequest);
        await addAuditLog(borrowerID, 'BORROW_REQUEST_CREATED',
          `Child request created for component ${componentId} (parent: ${parentRequestId})`, componentId);
      }
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
 * Approve a request (cascades to children).
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

  // Update parent request
  request.status = 'Approved';
  request.approvalDate = new Date();
  request.approvedBy = req.user.userId;
  request.returnDate = returnDate ? new Date(returnDate) : null;
  if (remark) request.notes = remark;
  await request.save();

  // Update parent item
  const item = await Item.findOne({ itemId: request.itemID });
  if (item) {
    item.status = 'In-use';
    item.currentBorrower = request.borrowerID;
    if (location) item.location = location;
    item.lastUpdate = new Date().toISOString().split('T')[0];
    await item.save();
  }

  await addAuditLog(req.user.userId, 'BORROW_REQUEST_APPROVED', `Request approved for item ${request.itemID}`, request.itemID);

  // Cascade: approve child requests
  const childRequests = await BorrowRequest.find({
    parentRequestId: req.params.id,
    status: 'Pending'
  });

  for (const childReq of childRequests) {
    childReq.status = 'Approved';
    childReq.approvalDate = new Date();
    childReq.approvedBy = req.user.userId;
    childReq.returnDate = returnDate ? new Date(returnDate) : null;
    if (remark) childReq.notes = remark;
    await childReq.save();

    const childItem = await Item.findOne({ itemId: childReq.itemID });
    if (childItem) {
      childItem.status = 'In-use';
      childItem.currentBorrower = childReq.borrowerID;
      if (location) childItem.location = location;
      childItem.lastUpdate = new Date().toISOString().split('T')[0];
      await childItem.save();
    }

    await addAuditLog(req.user.userId, 'BORROW_REQUEST_APPROVED',
      `Child request auto-approved with parent ${req.params.id}`, childReq.itemID);
  }

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0]
  });
});

/**
 * PUT /api/borrow-requests/:id/reject
 * Reject a request (cascades to children).
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

  request.status = 'Rejected';
  request.notes = reason || 'Rejected';
  request.approvalDate = new Date();
  request.approvedBy = req.user.userId;
  await request.save();

  await addAuditLog(req.user.userId, 'BORROW_REQUEST_REJECTED',
    `Request rejected: ${reason || 'No reason provided'}`, request.itemID);

  // Cascade: reject child requests
  const childRequests = await BorrowRequest.find({
    parentRequestId: req.params.id,
    status: 'Pending'
  });

  for (const childReq of childRequests) {
    childReq.status = 'Rejected';
    childReq.notes = `Auto-rejected with parent: ${reason || 'No reason'}`;
    childReq.approvalDate = new Date();
    childReq.approvedBy = req.user.userId;
    await childReq.save();

    await addAuditLog(req.user.userId, 'BORROW_REQUEST_REJECTED',
      `Child request auto-rejected with parent ${req.params.id}: ${reason}`, childReq.itemID);
  }

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0]
  });
});

/**
 * PUT /api/borrow-requests/:id/return
 * Return an item (cascades to children).
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

  // Update request
  request.status = 'Returned';
  request.returnedDate = new Date();
  await request.save();

  // Update item
  const item = await Item.findOne({ itemId: request.itemID });
  if (item) {
    item.status = 'Available';
    item.currentBorrower = null;
    if (location) item.location = location;
    item.lastUpdate = new Date().toISOString().split('T')[0];
    await item.save();

    // If mother item with fixed components, also reset components
    if (item.fixedComponents && item.fixedComponents.length > 0) {
      for (const componentId of item.fixedComponents) {
        const component = await Item.findOne({ itemId: componentId });
        if (component) {
          component.status = 'Available';
          component.currentBorrower = null;
          if (location) component.location = location;
          component.lastUpdate = new Date().toISOString().split('T')[0];
          await component.save();
        }
      }
    }
  }

  await addAuditLog(req.user.userId, 'ITEM_RETURNED', `Item returned: ${request.itemID}`, request.itemID);

  // Cascade: return child requests
  const childRequests = await BorrowRequest.find({
    parentRequestId: req.params.id,
    status: 'Approved'
  });

  for (const childReq of childRequests) {
    childReq.status = 'Returned';
    childReq.returnedDate = new Date();
    await childReq.save();

    const childItem = await Item.findOne({ itemId: childReq.itemID });
    if (childItem) {
      childItem.status = 'Available';
      childItem.currentBorrower = null;
      if (location) childItem.location = location;
      childItem.lastUpdate = new Date().toISOString().split('T')[0];
      await childItem.save();
    }

    await addAuditLog(req.user.userId, 'ITEM_RETURNED',
      `Child item auto-returned with parent ${req.params.id}`, childReq.itemID);
  }

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
