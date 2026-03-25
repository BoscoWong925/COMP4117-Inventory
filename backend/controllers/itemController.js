const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const User = require('../models/User');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');
const { sendItemStatusChangeEmail } = require('../utils/emailService');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Resolve currentBorrower userId to name for a list of items.
 */
const populateBorrowerNames = async (items) => {
  const borrowerIds = [...new Set(items.filter(i => i.currentBorrower).map(i => i.currentBorrower))];
  if (borrowerIds.length === 0) return items;
  const users = await User.find({ userId: { $in: borrowerIds } }).select('userId name').lean();
  const nameMap = {};
  users.forEach(u => { nameMap[u.userId] = u.name; });
  return items.map(item => {
    const obj = item.toObject ? item.toObject() : { ...item };
    if (obj.currentBorrower && nameMap[obj.currentBorrower]) {
      obj.currentBorrowerName = nameMap[obj.currentBorrower];
    }
    return obj;
  });
};

/**
 * Generate next item ID
 */
const getNextItemId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'itemId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${String(counter.seq).padStart(4, '0')}`;
};

/**
 * GET /api/items
 * List all items with filtering, searching, sorting, and pagination.
 */
exports.getAllItems = catchAsync(async (req, res) => {
  const {
    status, type, category, location, vendor, supplier,
    search, warrantyEnd, warrantyStatus,
    itemId: qItemId, name: qName, universityID: qUniId, description: qDesc,
    page = 1, pageSize = 10,
    sortBy = 'itemId', sortDir = 'asc'
  } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (vendor) filter.vendor = vendor;
  if (supplier) filter.supplier = new RegExp(supplier, 'i');
  if (warrantyEnd) filter.warrantyEnd = { $lte: warrantyEnd };

  // Per-field text searches (regex)
  if (qItemId) filter.itemId = new RegExp(qItemId, 'i');
  if (qName) filter.name = new RegExp(qName, 'i');
  if (qUniId) filter.universityID = new RegExp(qUniId, 'i');
  if (qDesc) filter.description = new RegExp(qDesc, 'i');

  // Warranty status filter
  if (warrantyStatus === 'expired') {
    filter.warrantyEnd = { $lt: new Date().toISOString().split('T')[0] };
  } else if (warrantyStatus === 'expiring-soon') {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    filter.warrantyEnd = {
      $gte: now.toISOString().split('T')[0],
      $lte: soon.toISOString().split('T')[0]
    };
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { itemId: searchRegex },
      { name: searchRegex },
      { universityID: searchRegex },
      { description: searchRegex },
      { supplier: searchRegex }
    ];
  }

  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await Item.countDocuments(filter);
  const rawItems = await Item.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));

  const items = await populateBorrowerNames(rawItems);

  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * GET /api/items/available
 * Get only available items (for regular users).
 */
exports.getAvailableItems = catchAsync(async (req, res) => {
  const { search, category, location, owner, page = 1, pageSize = 10 } = req.query;

  // Find items that are pending check-out (reserved but not yet physically handed over)
  const pendingCheckoutRequests = await BorrowRequest.find({ status: 'Pending Check-Out' }).select('itemID').lean();
  const reservedItemIds = pendingCheckoutRequests.map(r => r.itemID);

  const filter = { status: 'Available', canBorrow: true };

  // Exclude items with pending check-out requests
  if (reservedItemIds.length > 0) {
    filter.itemId = { $nin: reservedItemIds };
  }

  // Exclude child items (items with motherID that are not the mother themselves)
  filter.$and = [{ $or: [{ motherID: null }, { motherID: '' }, { fixedComponents: { $exists: true, $not: { $size: 0 } } }] }];

  if (category) filter.category = category;
  if (location) filter.location = location;
  if (owner) filter.owner = owner;

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$and.push({
      $or: [
        { itemId: searchRegex },
        { name: searchRegex },
        { universityID: searchRegex },
        { description: searchRegex }
      ]
    });
  }

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await Item.countDocuments(filter);
  const items = await Item.find(filter)
    .sort({ itemId: 1 })
    .skip(skip)
    .limit(parseInt(pageSize));

  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * GET /api/items/lent-out
 * Get only in-use items.
 */
exports.getLentOutItems = catchAsync(async (req, res) => {
  const {
    search, category, location, type, vendor,
    borrowerId, borrowerName, year, statusFilter,
    page = 1, pageSize = 10,
    sortBy = 'itemId', sortDir = 'asc'
  } = req.query;

  const filter = { status: 'In-use' };

  if (category) filter.category = category;
  if (location) filter.location = location;
  if (type) filter.type = type;
  if (vendor) filter.vendor = vendor;
  if (borrowerId) filter.currentBorrower = borrowerId;
  if (year) filter.warrantyEnd = { $regex: year };

  if (statusFilter) {
    const BorrowRequest = require('../models/BorrowRequest');
    const now = new Date();
    if (statusFilter === 'overdue') {
      const overdueReqs = await BorrowRequest.find({ status: 'Approved', returnDate: { $lt: now } });
      const overdueItemIds = overdueReqs.map(r => r.itemID);
      filter.itemId = { $in: overdueItemIds };
    } else if (statusFilter === 'due-soon') {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueSoonReqs = await BorrowRequest.find({
        status: 'Approved',
        returnDate: { $gte: now, $lte: nextWeek }
      });
      const dueSoonItemIds = dueSoonReqs.map(r => r.itemID);
      filter.itemId = { $in: dueSoonItemIds };
    }
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { itemId: searchRegex },
      { name: searchRegex },
      { universityID: searchRegex },
      { description: searchRegex }
    ];
  }

  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await Item.countDocuments(filter);
  const rawItems = await Item.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));

  const items = await populateBorrowerNames(rawItems);

  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * GET /api/items/:id
 * Get single item by itemId.
 */
exports.getItemById = catchAsync(async (req, res, next) => {
  const item = await Item.findOne({ itemId: req.params.id });
  if (!item) {
    return next(ApiError.notFound(`Item ${req.params.id} not found`));
  }

  res.status(200).json({
    success: true,
    item
  });
});

/**
 * GET /api/items/:id/components
 * Get child components for an item.
 */
exports.getItemComponents = catchAsync(async (req, res, next) => {
  const item = await Item.findOne({ itemId: req.params.id });
  if (!item) {
    return next(ApiError.notFound(`Item ${req.params.id} not found`));
  }

  let components = [];
  if (item.fixedComponents && item.fixedComponents.length > 0) {
    components = await Item.find({ itemId: { $in: item.fixedComponents } });
  } else if (item.motherID) {
    // Get siblings with the same motherID (excluding self)
    components = await Item.find({ motherID: item.motherID, itemId: { $ne: item.itemId } });
  }

  res.status(200).json({
    success: true,
    components
  });
});

/**
 * POST /api/items
 * Create a new item.
 */
exports.createItem = catchAsync(async (req, res) => {
  const itemId = await getNextItemId();

  const itemData = {
    ...req.body,
    itemId,
    lastUpdate: new Date().toISOString().split('T')[0]
  };

  // Handle owner field - default to 'department'
  if (!itemData.owner) {
    itemData.owner = 'department';
  }

  // Handle canBorrow field - default to true
  if (itemData.canBorrow === undefined) {
    itemData.canBorrow = true;
  } else {
    itemData.canBorrow = itemData.canBorrow === 'true' || itemData.canBorrow === true;
  }

  // If item has a motherID and is a child, it cannot be borrowed independently
  if (itemData.motherID && !itemData.fixedComponents?.length) {
    itemData.canBorrow = false;
  }

  // Handle fixedComponents — parse if string
  if (typeof itemData.fixedComponents === 'string') {
    try {
      itemData.fixedComponents = JSON.parse(itemData.fixedComponents);
    } catch {
      itemData.fixedComponents = itemData.fixedComponents.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Handle invoice file upload
  if (req.file) {
    itemData.invoiceFile = {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };
  }

  const item = await Item.create(itemData);

  await addAuditLog(
    req.user.userId,
    'ITEM_ADDED',
    `Added new item: ${item.name}`,
    item.itemId
  );

  res.status(201).json({
    success: true,
    item
  });
});

/**
 * PUT /api/items/:id
 * Update an item.
 */
exports.updateItem = catchAsync(async (req, res, next) => {
  const item = await Item.findOne({ itemId: req.params.id });
  if (!item) {
    return next(ApiError.notFound(`Item ${req.params.id} not found`));
  }

  const oldStatus = item.status;
  const updateData = { ...req.body, lastUpdate: new Date().toISOString().split('T')[0] };

  // Handle fixedComponents
  if (typeof updateData.fixedComponents === 'string') {
    try {
      updateData.fixedComponents = JSON.parse(updateData.fixedComponents);
    } catch {
      updateData.fixedComponents = updateData.fixedComponents.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Handle invoice file upload
  if (req.file) {
    updateData.invoiceFile = {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };
  }

  Object.assign(item, updateData);
  await item.save();

  if (oldStatus !== item.status) {
    await addAuditLog(
      req.user.userId,
      'ITEM_STATUS_CHANGE',
      `Item ${item.name} status changed from ${oldStatus} to ${item.status}`,
      item.itemId,
      oldStatus,
      item.status
    );
  }

  res.status(200).json({
    success: true,
    item
  });
});

/**
 * DELETE /api/items/:id
 * Delete an item (blocked if In-use).
 */
exports.deleteItem = catchAsync(async (req, res, next) => {
  const item = await Item.findOne({ itemId: req.params.id });
  if (!item) {
    return next(ApiError.notFound(`Item ${req.params.id} not found`));
  }

  if (item.status === 'In-use') {
    return next(ApiError.badRequest('Cannot delete an item that is currently in use. Please return it first.'));
  }

  await Item.deleteOne({ itemId: req.params.id });

  await addAuditLog(
    req.user.userId,
    'ITEM_DELETED',
    `Deleted item: ${item.name}`,
    item.itemId
  );

  res.status(200).json({
    success: true,
    message: 'Item deleted successfully'
  });
});

/**
 * POST /api/items/import
 * Import items from Excel file.
 */
exports.importItems = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(ApiError.badRequest('Please upload an Excel file'));
  }

  const workbook = XLSX.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) {
    return next(ApiError.badRequest('Excel file is empty'));
  }

  // Column mapping (flexible header names)
  const mapColumn = (row, possibleNames, defaultValue = '') => {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null) return String(row[name]);
    }
    return defaultValue;
  };

  const importedItems = [];
  for (const row of rows) {
    const itemId = await getNextItemId();
    const itemData = {
      itemId,
      name: mapColumn(row, ['name', 'Name', 'Item Name', 'itemName']),
      universityID: mapColumn(row, ['universityID', 'UniversityID', 'University ID', 'uniID']),
      type: mapColumn(row, ['type', 'Type', 'Item Type'], 'Hardware'),
      category: mapColumn(row, ['category', 'Category'], 'Other'),
      status: mapColumn(row, ['status', 'Status'], 'Available'),
      location: mapColumn(row, ['location', 'Location'], ''),
      description: mapColumn(row, ['description', 'Description'], ''),
      supplier: mapColumn(row, ['supplier', 'Supplier'], ''),
      invoiceNumber: mapColumn(row, ['invoiceNumber', 'Invoice Number', 'Invoice'], ''),
      vendor: mapColumn(row, ['vendor', 'Vendor'], ''),
      price: parseFloat(mapColumn(row, ['price', 'Price'], '0')) || 0,
      warrantyEnd: mapColumn(row, ['warrantyEnd', 'Warranty End', 'warrantyEndDate'], ''),
      purchaseDate: mapColumn(row, ['purchaseDate', 'Purchase Date'], ''),
      departmentID: mapColumn(row, ['departmentID', 'Department', 'DepartmentID'], ''),
      motherID: mapColumn(row, ['motherID', 'Mother ID', 'MotherID'], null) || null,
      lastUpdate: new Date().toISOString().split('T')[0]
    };

    if (itemData.name) {
      const item = await Item.create(itemData);
      importedItems.push(item);
      await addAuditLog(req.user.userId, 'INVENTORY_ITEM_ADDED', `Imported item: ${item.name}`, item.itemId);
    }
  }

  // Clean up uploaded file
  fs.unlinkSync(req.file.path);

  res.status(201).json({
    success: true,
    imported: importedItems.length,
    items: importedItems
  });
});

/**
 * GET /api/items/:id/invoice
 * Download invoice file.
 */
exports.getInvoice = catchAsync(async (req, res, next) => {
  const item = await Item.findOne({ itemId: req.params.id });
  if (!item) {
    return next(ApiError.notFound(`Item ${req.params.id} not found`));
  }

  if (!item.invoiceFile || !item.invoiceFile.path) {
    return next(ApiError.notFound('No invoice file found for this item'));
  }

  const filePath = item.invoiceFile.path;
  if (!fs.existsSync(filePath)) {
    return next(ApiError.notFound('Invoice file not found on server'));
  }

  res.download(filePath, item.invoiceFile.filename);
});

/**
 * GET /api/items/by-owner/:ownerId
 * Get items owned by a specific user or department.
 */
exports.getItemsByOwner = catchAsync(async (req, res) => {
  const { search, status, page = 1, pageSize = 100 } = req.query;
  const ownerId = req.params.ownerId;

  const filter = { owner: ownerId };

  if (status) {
    filter.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { itemId: searchRegex },
      { name: searchRegex },
      { universityID: searchRegex },
      { description: searchRegex }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const total = await Item.countDocuments(filter);
  const rawItems = await Item.find(filter)
    .sort({ itemId: 1 })
    .skip(skip)
    .limit(parseInt(pageSize));

  const items = await populateBorrowerNames(rawItems);

  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

/**
 * GET /api/items/owners
 * Get list of distinct item owners.
 */
exports.getItemOwners = catchAsync(async (req, res) => {
  const ownerIds = await Item.distinct('owner');
  const nonDeptIds = ownerIds.filter(id => id && id !== 'department');
  const users = await User.find({ userId: { $in: nonDeptIds } }).select('userId name').lean();
  const nameMap = {};
  users.forEach(u => { nameMap[u.userId] = u.name; });

  const owners = ownerIds.map(ownerId => {
    if (ownerId === 'department') return { id: 'department', name: 'Department' };
    return { id: ownerId, name: nameMap[ownerId] || ownerId };
  });

  res.status(200).json({
    success: true,
    owners
  });
});

/**
 * PUT /api/items/:id/status
 * Allow teachers (item owners), admins, and operators to change item status.
 * Teachers can only change status of items they own, and only between Available/In-use.
 */
exports.updateItemStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const item = await Item.findOne({ itemId: req.params.id });
  if (!item) {
    return next(ApiError.notFound(`Item ${req.params.id} not found`));
  }

  // Teachers can only update items they own
  if (req.user.role === 'user' && req.user.subRole === 'teacher') {
    if (item.owner !== req.user.userId) {
      return next(ApiError.forbidden('You can only update status for items you own'));
    }
    // Teachers can only switch between Available and In-use
    const allowedStatuses = ['Available', 'In-use'];
    if (!allowedStatuses.includes(status)) {
      return next(ApiError.badRequest(`Teachers can only set status to: ${allowedStatuses.join(', ')}`));
    }
  } else if (req.user.role !== 'admin' && req.user.role !== 'operator') {
    return next(ApiError.forbidden('You do not have permission to change item status'));
  }

  const oldStatus = item.status;
  item.status = status;
  if (status === 'Available') {
    item.currentBorrower = null;
  }
  item.lastUpdate = new Date().toISOString().split('T')[0];
  await item.save();

  await addAuditLog(
    req.user.userId,
    'ITEM_STATUS_CHANGE',
    `Item ${item.name} status changed from ${oldStatus} to ${status}`,
    item.itemId,
    oldStatus,
    status
  );

  // Email: notify owner/operators about important status changes
  if (oldStatus !== status) {
    try {
      const recipients = [];
      if (item.owner && item.owner !== 'department') {
        const owner = await User.findOne({ userId: item.owner }).lean();
        if (owner?.email) recipients.push(owner);
      }
      const ops = await User.find({ role: { $in: ['admin', 'operator'] }, isActive: true }).select('userId name email').lean();
      for (const op of ops) {
        if (op.email && !recipients.find(r => r.userId === op.userId)) recipients.push(op);
      }
      // Don't email the person who made the change
      const filtered = recipients.filter(r => r.userId !== req.user.userId);
      if (filtered.length > 0) {
        await sendItemStatusChangeEmail({ item, oldStatus, newStatus: status, changedBy: req.user, recipients: filtered });
      }
    } catch (emailErr) {
      await addAuditLog(req.user.userId, 'EMAIL_FAILED', `Status change email failed: ${emailErr.message}`, item.itemId);
    }
  }

  res.status(200).json({
    success: true,
    item
  });
});
