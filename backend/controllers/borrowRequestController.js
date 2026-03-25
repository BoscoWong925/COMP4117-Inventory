const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const User = require('../models/User');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');
const { sendApprovalEmail, sendRejectionEmail, sendNewRequestEmail, sendCheckoutEmail, sendCheckoutDeniedEmail, sendReturnEmail } = require('../utils/emailService');

/** Helper: get notification recipients for an item (owner + operators) */
const getItemNotifyRecipients = async (itemID) => {
  const item = await Item.findOne({ itemId: itemID }).lean();
  const recipients = [];
  // If item has an owner that is a teacher user, notify them
  if (item && item.owner && item.owner !== 'department') {
    const owner = await User.findOne({ userId: item.owner }).lean();
    if (owner?.email) recipients.push(owner);
  }
  // Always notify operators
  const operators = await User.find({ role: { $in: ['admin', 'operator'] }, isActive: true }).select('userId name email').lean();
  for (const op of operators) {
    if (op.email && !recipients.find(r => r.userId === op.userId)) {
      recipients.push(op);
    }
  }
  return recipients;
};

/**
 * Generate next request ID
 */
const getNextRequestId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'requestId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `REQ-${String(counter.seq).padStart(4, '0')}`;
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
    // Also search by item name: find matching item IDs first
    const matchingItems = await Item.find({ name: searchRegex }).select('itemId').lean();
    const matchingItemIds = matchingItems.map(i => i.itemId);
    // Also search by borrower name
    const matchingUsers = await User.find({ name: searchRegex }).select('userId').lean();
    const matchingUserIds = matchingUsers.map(u => u.userId);

    const orConditions = [
      { requestId: searchRegex },
      { borrowerID: searchRegex },
      { itemID: searchRegex }
    ];
    if (matchingItemIds.length > 0) {
      orConditions.push({ itemID: { $in: matchingItemIds } });
    }
    if (matchingUserIds.length > 0) {
      orConditions.push({ borrowerID: { $in: matchingUserIds } });
    }
    searchFilter = { $or: orConditions };
  }

  // Combine filters
  const combinedFilter = searchFilter
    ? { $and: [filter, searchFilter] }
    : filter;

  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;

  // We only paginate parent/top-level requests, then include their children 
  const parentFilter = { ...combinedFilter, parentRequestId: null };

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await BorrowRequest.countDocuments(parentFilter);
  const parentRequests = await BorrowRequest.find(parentFilter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));

  const parentIds = parentRequests.map(r => r.requestId);
  const childRequests = await BorrowRequest.find({ parentRequestId: { $in: parentIds } }).sort(sort);

  // Merge them (frontend handles grouping)
  const allRequests = [...parentRequests, ...childRequests];
  const populated = await populateRequests(allRequests);

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
  const { page = 1, pageSize = 10, status } = req.query;

  // We only count top-level (no parent) for badge
  const pendingCount = await BorrowRequest.countDocuments({
    status: 'Pending',
    parentRequestId: null
  });
  const checkoutCount = await BorrowRequest.countDocuments({
    status: 'Pending Check-Out',
    parentRequestId: null
  });
  
  // If no status is provided, default to both for backward compatibility
  const currentStatus = status ? status : { $in: ['Pending', 'Pending Check-Out'] };

  // Paginate parent requests
  const parentFilter = { status: currentStatus, parentRequestId: null };
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  
  const total = await BorrowRequest.countDocuments(parentFilter);
  const parentRequests = await BorrowRequest.find(parentFilter)
    .sort({ requestDate: -1 })
    .skip(skip)
    .limit(parseInt(pageSize));

  const parentIds = parentRequests.map(r => r.requestId);
  const childRequests = await BorrowRequest.find({ parentRequestId: { $in: parentIds } }).sort({ requestDate: -1 });

  const allRequests = [...parentRequests, ...childRequests];
  const populated = await populateRequests(allRequests);

  res.status(200).json({
    success: true,
    requests: populated,
    total,
    pendingCount,
    checkoutCount,
    count: pendingCount + checkoutCount
  });
});

/**
 * GET /api/borrow-requests/my
 * Current user's requests (user role).
 */
exports.getMyRequests = catchAsync(async (req, res) => {
  const { status, search, page = 1, pageSize = 10, sortBy = 'requestDate', sortDir = 'desc' } = req.query;

  const filter = { borrowerID: req.user.userId };
  if (status) filter.status = status;
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { requestId: searchRegex },
      { itemName: searchRegex },
      { itemID: searchRegex }
    ];
  }

  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;

  const parentFilter = { ...filter, parentRequestId: null };

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await BorrowRequest.countDocuments(parentFilter);
  const parentRequests = await BorrowRequest.find(parentFilter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));

  const parentIds = parentRequests.map(r => r.requestId);
  const childRequests = await BorrowRequest.find({ parentRequestId: { $in: parentIds } }).sort(sort);

  const allRequests = [...parentRequests, ...childRequests];
  const populated = await populateRequests(allRequests);

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

  // Block requests if item already has a Pending Check-Out request
  const existingPendingCheckout = await BorrowRequest.findOne({
    itemID,
    status: 'Pending Check-Out'
  });
  if (existingPendingCheckout) {
    return next(ApiError.badRequest(`Item ${itemID} is currently pending check-out and cannot receive new requests`));
  }

  // Also block if item status is not Available
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

  // Email: notify item owner + operators about new request
  try {
    const borrower = await User.findOne({ userId: borrowerID }).lean();
    const recipients = await getItemNotifyRecipients(itemID);
    const emailResult = await sendNewRequestEmail({ request: parentRequest, borrower, item, recipients });
    if (emailResult?.sent) {
      await addAuditLog(borrowerID, 'EMAIL_SENT', `New request email sent for ${parentRequestId}`, itemID);
    }
  } catch (emailErr) {
    await addAuditLog(borrowerID, 'EMAIL_FAILED', `New request email failed: ${emailErr.message}`, itemID);
  }

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

  // Teachers can only approve requests for items they own
  if (req.user.role === 'user' && req.user.subRole === 'teacher') {
    const item = await Item.findOne({ itemId: request.itemID });
    if (!item || item.owner !== req.user.userId) {
      return next(ApiError.forbidden('You can only approve requests for items you own'));
    }
  }

  // Auto-reject other pending requests for the same item(s)
  const itemIds = [request.itemID];
  // Also collect child item IDs from fixedComponents
  const parentItem = await Item.findOne({ itemId: request.itemID });
  if (parentItem && parentItem.fixedComponents && parentItem.fixedComponents.length > 0) {
    itemIds.push(...parentItem.fixedComponents);
  }

  const competingRequests = await BorrowRequest.find({
    itemID: { $in: itemIds },
    status: 'Pending',
    requestId: { $ne: request.requestId }
  });

  // Also reject child requests of competing parent requests
  const competingParentIds = [...new Set(competingRequests.filter(r => !r.parentRequestId).map(r => r.requestId))];
  const competingChildRequests = competingParentIds.length > 0
    ? await BorrowRequest.find({ parentRequestId: { $in: competingParentIds }, status: 'Pending' })
    : [];
  const allCompeting = [...competingRequests, ...competingChildRequests];
  // Deduplicate
  const seenIds = new Set();
  const uniqueCompeting = allCompeting.filter(r => {
    if (seenIds.has(r.requestId)) return false;
    seenIds.add(r.requestId);
    return true;
  });

  for (const comp of uniqueCompeting) {
    comp.status = 'Rejected';
    comp.notes = `Auto-rejected: another request (${request.requestId}) for the same item was approved`;
    comp.approvalDate = new Date();
    comp.approvedBy = req.user.userId;
    await comp.save();
    await addAuditLog(req.user.userId, 'BORROW_REQUEST_REJECTED',
      `Auto-rejected request ${comp.requestId} (item ${comp.itemID} approved for ${request.requestId})`, comp.itemID);
  }

  // Update parent request
  request.status = 'Pending Check-Out';
  request.approvalDate = new Date();
  request.approvedBy = req.user.userId;
  request.returnDate = returnDate ? new Date(returnDate) : null;
  if (remark) request.notes = remark;
  await request.save();

  // Do NOT change item status yet – item stays Available until physical checkout
  // But update location if provided
  const item = await Item.findOne({ itemId: request.itemID });
  if (item && location) {
    item.location = location;
    item.lastUpdate = new Date().toISOString().split('T')[0];
    await item.save();
  }

  await addAuditLog(req.user.userId, 'BORROW_REQUEST_APPROVED', `Request approved for item ${request.itemID} (pending check-out)`, request.itemID);

  if (!request.parentRequestId) {
    try {
      const borrower = await User.findOne({ userId: request.borrowerID }).lean();
      const emailItem = item || await Item.findOne({ itemId: request.itemID }).lean();
      const emailResult = await sendApprovalEmail({ request, borrower, item: emailItem, approver: req.user });
      if (emailResult?.sent) {
        await addAuditLog(req.user.userId, 'EMAIL_SENT', `Approval email sent for request ${request.requestId}`, request.itemID);
      } else if (emailResult?.skipped) {
        await addAuditLog(req.user.userId, 'EMAIL_SKIPPED', `Approval email skipped for request ${request.requestId}: ${emailResult.reason}`, request.itemID);
      }
    } catch (error) {
      await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Approval email failed for request ${request.requestId}: ${error.message}`, request.itemID);
    }
  }

  // Include auto-rejected count in response
  const autoRejectedCount = uniqueCompeting.length;

  // Cascade: approve child requests (set to Pending Check-Out)
  const childRequests = await BorrowRequest.find({
    parentRequestId: req.params.id,
    status: 'Pending'
  });

  for (const childReq of childRequests) {
    childReq.status = 'Pending Check-Out';
    childReq.approvalDate = new Date();
    childReq.approvedBy = req.user.userId;
    childReq.returnDate = returnDate ? new Date(returnDate) : null;
    if (remark) childReq.notes = remark;
    await childReq.save();

    const childItem = await Item.findOne({ itemId: childReq.itemID });
    if (childItem && location) {
      childItem.location = location;
      childItem.lastUpdate = new Date().toISOString().split('T')[0];
      await childItem.save();
    }

    await addAuditLog(req.user.userId, 'BORROW_REQUEST_APPROVED',
      `Child request auto-approved with parent ${req.params.id} (pending check-out)`, childReq.itemID);
  }

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0],
    autoRejectedCount
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

  // Teachers can only reject requests for items they own
  if (req.user.role === 'user' && req.user.subRole === 'teacher') {
    const item = await Item.findOne({ itemId: request.itemID });
    if (!item || item.owner !== req.user.userId) {
      return next(ApiError.forbidden('You can only reject requests for items you own'));
    }
  }

  request.status = 'Rejected';
  request.notes = reason || 'Rejected';
  request.approvalDate = new Date();
  request.approvedBy = req.user.userId;
  await request.save();

  await addAuditLog(req.user.userId, 'BORROW_REQUEST_REJECTED',
    `Request rejected: ${reason || 'No reason provided'}`, request.itemID);

  if (!request.parentRequestId) {
    try {
      const borrower = await User.findOne({ userId: request.borrowerID }).lean();
      const emailItem = await Item.findOne({ itemId: request.itemID }).lean();
      const emailResult = await sendRejectionEmail({ request, borrower, item: emailItem, approver: req.user, reason });
      if (emailResult?.sent) {
        await addAuditLog(req.user.userId, 'EMAIL_SENT', `Rejection email sent for request ${request.requestId}`, request.itemID);
      } else if (emailResult?.skipped) {
        await addAuditLog(req.user.userId, 'EMAIL_SKIPPED', `Rejection email skipped for request ${request.requestId}: ${emailResult.reason}`, request.itemID);
      }
    } catch (error) {
      await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Rejection email failed for request ${request.requestId}: ${error.message}`, request.itemID);
    }
  }

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
 * PUT /api/borrow-requests/:id/checkout
 * Mark a "Pending Check-Out" request as physically checked out ("Borrowed Out").
 * This sets request status to Approved and item status to In-use.
 * Cascades to child requests.
 */
exports.checkoutRequest = catchAsync(async (req, res, next) => {
  const request = await BorrowRequest.findOne({ requestId: req.params.id });
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  if (request.status !== 'Pending Check-Out') {
    return next(ApiError.badRequest(`Request must be in 'Pending Check-Out' status to checkout. Current: ${request.status}`));
  }

  // Teachers can only checkout items they own
  if (req.user.role === 'user' && req.user.subRole === 'teacher') {
    const item = await Item.findOne({ itemId: request.itemID });
    if (!item || item.owner !== req.user.userId) {
      return next(ApiError.forbidden('You can only checkout items you own'));
    }
  }

  // Update request status
  request.status = 'Approved';
  await request.save();

  // Now update item to In-use
  const item = await Item.findOne({ itemId: request.itemID });
  if (item) {
    item.status = 'In-use';
    item.currentBorrower = request.borrowerID;
    item.lastUpdate = new Date().toISOString().split('T')[0];
    await item.save();
  }

  await addAuditLog(req.user.userId, 'BORROW_CHECKED_OUT',
    `Item ${request.itemID} checked out to ${request.borrowerID}`, request.itemID);

  // Email: notify borrower about checkout
  if (!request.parentRequestId) {
    try {
      const borrower = await User.findOne({ userId: request.borrowerID }).lean();
      const emailResult = await sendCheckoutEmail({ request, borrower, item, operator: req.user });
      if (emailResult?.sent) {
        await addAuditLog(req.user.userId, 'EMAIL_SENT', `Checkout email sent for ${request.requestId}`, request.itemID);
      }
    } catch (emailErr) {
      await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Checkout email failed: ${emailErr.message}`, request.itemID);
    }
  }

  // Cascade: checkout child requests
  const childRequests = await BorrowRequest.find({
    parentRequestId: req.params.id,
    status: 'Pending Check-Out'
  });

  for (const childReq of childRequests) {
    childReq.status = 'Approved';
    await childReq.save();

    const childItem = await Item.findOne({ itemId: childReq.itemID });
    if (childItem) {
      childItem.status = 'In-use';
      childItem.currentBorrower = childReq.borrowerID;
      childItem.lastUpdate = new Date().toISOString().split('T')[0];
      await childItem.save();
    }

    await addAuditLog(req.user.userId, 'BORROW_CHECKED_OUT',
      `Child item ${childReq.itemID} auto-checked-out with parent ${req.params.id}`, childReq.itemID);
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
  const { location, condition, notes } = req.body;

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
  if (condition) request.condition = condition;
  if (notes) request.returnNotes = notes;
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

  // Email: notify owner/operators about return
  if (!request.parentRequestId) {
    try {
      const borrower = await User.findOne({ userId: request.borrowerID }).lean();
      const recipients = await getItemNotifyRecipients(request.itemID);
      const emailResult = await sendReturnEmail({ request, borrower, item, recipients });
      if (emailResult?.sent) {
        await addAuditLog(req.user.userId, 'EMAIL_SENT', `Return email sent for ${request.requestId}`, request.itemID);
      }
    } catch (emailErr) {
      await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Return email failed: ${emailErr.message}`, request.itemID);
    }
  }

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
 * PUT /api/borrow-requests/:id/declare-return
 * User declares intended return date (cannot be later than the set returnDate).
 */
exports.declareReturnDate = catchAsync(async (req, res, next) => {
  const { declaredReturnDate } = req.body;

  const request = await BorrowRequest.findOne({ requestId: req.params.id });
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  if (request.status !== 'Approved') {
    return next(ApiError.badRequest('Can only declare return date for approved requests'));
  }

  // Users can only declare for their own requests
  if (req.user.role === 'user' && request.borrowerID !== req.user.userId) {
    return next(ApiError.forbidden('You can only declare return date for your own requests'));
  }

  if (!declaredReturnDate) {
    return next(ApiError.badRequest('declaredReturnDate is required'));
  }

  const declared = new Date(declaredReturnDate);
  if (request.returnDate && declared > new Date(request.returnDate)) {
    return next(ApiError.badRequest('Declared return date cannot be later than the set return date'));
  }

  request.declaredReturnDate = declared;
  await request.save();

  // Also set for child requests
  const childRequests = await BorrowRequest.find({
    parentRequestId: req.params.id,
    status: 'Approved'
  });
  for (const childReq of childRequests) {
    childReq.declaredReturnDate = declared;
    await childReq.save();
  }

  await addAuditLog(req.user.userId, 'RETURN_DATE_DECLARED',
    `Return date declared: ${declared.toISOString().split('T')[0]} for request ${req.params.id}`, request.itemID);

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

/**
 * PUT /api/borrow-requests/:id/deny
 * Deny a "Pending Check-Out" request: revert item to Available, set request to Rejected.
 * Cascades to child requests.
 */
exports.denyCheckout = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const request = await BorrowRequest.findOne({ requestId: req.params.id });
  if (!request) {
    return next(ApiError.notFound(`Request ${req.params.id} not found`));
  }

  if (request.status !== 'Pending Check-Out') {
    return next(ApiError.badRequest(`Request must be in 'Pending Check-Out' status to deny. Current: ${request.status}`));
  }

  // Teachers can only deny items they own
  if (req.user.role === 'user' && req.user.subRole === 'teacher') {
    const item = await Item.findOne({ itemId: request.itemID });
    if (!item || item.owner !== req.user.userId) {
      return next(ApiError.forbidden('You can only deny requests for items you own'));
    }
  }

  // Reject the request
  request.status = 'Rejected';
  request.notes = reason || 'Denied at check-out stage';
  await request.save();

  // Item stays Available (it was never changed to In-use during Pending Check-Out)

  await addAuditLog(req.user.userId, 'BORROW_CHECKOUT_DENIED',
    `Pending check-out denied for item ${request.itemID}: ${reason || 'No reason'}`, request.itemID);

  // Email: notify borrower about checkout denied
  if (!request.parentRequestId) {
    try {
      const borrower = await User.findOne({ userId: request.borrowerID }).lean();
      const emailItem = await Item.findOne({ itemId: request.itemID }).lean();
      const emailResult = await sendCheckoutDeniedEmail({ request, borrower, item: emailItem, operator: req.user, reason });
      if (emailResult?.sent) {
        await addAuditLog(req.user.userId, 'EMAIL_SENT', `Checkout denied email sent for ${request.requestId}`, request.itemID);
      }
    } catch (emailErr) {
      await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Checkout denied email failed: ${emailErr.message}`, request.itemID);
    }
  }

  // Cascade: deny child requests
  const childRequests = await BorrowRequest.find({
    parentRequestId: req.params.id,
    status: 'Pending Check-Out'
  });

  for (const childReq of childRequests) {
    childReq.status = 'Rejected';
    childReq.notes = `Auto-denied with parent: ${reason || 'No reason'}`;
    await childReq.save();

    await addAuditLog(req.user.userId, 'BORROW_CHECKOUT_DENIED',
      `Child request auto-denied with parent ${req.params.id}`, childReq.itemID);
  }

  const populated = await populateRequests([request]);

  res.status(200).json({
    success: true,
    request: populated[0]
  });
});

/**
 * POST /api/borrow-requests/auto-expire
 * Auto-expire Pending Check-Out requests older than 30 days.
 * Called on-demand (e.g., when loading pending requests).
 */
exports.autoExpirePendingCheckouts = catchAsync(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const expiredRequests = await BorrowRequest.find({
    status: 'Pending Check-Out',
    approvalDate: { $lt: thirtyDaysAgo }
  }).lean();

  if (expiredRequests.length === 0) {
    return res.status(200).json({ success: true, expiredCount: 0 });
  }

  const parentIds = expiredRequests.map(r => r.requestId);
  const itemIds = expiredRequests.map(r => r.itemID);

  // Bulk update parent requests
  await BorrowRequest.updateMany(
    { requestId: { $in: parentIds } },
    { $set: { status: 'Rejected', notes: 'Auto-expired: Pending Check-Out exceeded 30 days without action' } }
  );

  // Bulk update child requests
  const childResult = await BorrowRequest.updateMany(
    { parentRequestId: { $in: parentIds }, status: 'Pending Check-Out' },
    { $set: { status: 'Rejected', notes: 'Auto-expired with parent request' } }
  );

  const expiredCount = parentIds.length + (childResult.modifiedCount || 0);

  res.status(200).json({
    success: true,
    expiredCount
  });
});

/**
 * GET /api/borrow-requests/teacher-pending
 * Get pending requests for items owned by the current teacher.
 */
exports.getTeacherPendingRequests = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.pageSize) || 10;
  const skip = (page - 1) * limit;
  const requestedStatus = req.query.status;

  // Find items owned by this teacher
  const ownedItems = await Item.find({ owner: req.user.userId });
  const ownedItemIds = ownedItems.map(i => i.itemId);

  if (ownedItemIds.length === 0) {
    return res.status(200).json({ success: true, requests: [], total: 0, pendingCount: 0, checkoutCount: 0 });
  }

  const statusFilter = requestedStatus
    ? requestedStatus
    : { $in: ['Pending', 'Pending Check-Out'] };

  const pendingCount = await BorrowRequest.countDocuments({
    itemID: { $in: ownedItemIds },
    status: 'Pending'
  });

  const checkoutCount = await BorrowRequest.countDocuments({
    itemID: { $in: ownedItemIds },
    status: 'Pending Check-Out'
  });

  const query = {
    itemID: { $in: ownedItemIds },
    status: statusFilter
  };

  const total = await BorrowRequest.countDocuments(query);
  const requests = await BorrowRequest.find(query)
    .sort({ requestDate: -1 })
    .skip(skip)
    .limit(limit);

  const populated = await populateRequests(requests);

  res.status(200).json({
    success: true,
    requests: populated,
    total,
    pendingCount,
    checkoutCount
  });
});

/**
 * GET /api/borrow-requests/teacher-history
 * Get request history (approved/rejected/returned) for items owned by the current teacher.
 */
exports.getTeacherRequestHistory = catchAsync(async (req, res) => {
  const { status, page = 1, pageSize = 10, sortBy = 'requestDate', sortDir = 'desc' } = req.query;

  // Find items owned by this teacher
  const ownedItems = await Item.find({ owner: req.user.userId });
  const ownedItemIds = ownedItems.map(i => i.itemId);

  if (ownedItemIds.length === 0) {
    return res.status(200).json({ success: true, requests: [], total: 0, page: 1, pageSize: parseInt(pageSize) });
  }

  const filter = { itemID: { $in: ownedItemIds } };
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ['Approved', 'Rejected', 'Returned'] };
  }

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
