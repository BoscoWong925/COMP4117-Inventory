const Item = require('../models/Item');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const addAuditLog = require('../utils/auditLogger');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Generate next item ID
 */
const getNextItemId = async () => {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'itemId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${String(counter.seq).padStart(3, '0')}`;
};

/**
 * GET /api/items
 * List all items with filtering, searching, sorting, and pagination.
 */
exports.getAllItems = catchAsync(async (req, res) => {
  const {
    status, type, category, location, vendor, supplier,
    search, warrantyEnd, page = 1, pageSize = 10,
    sortBy = 'itemId', sortDir = 'asc'
  } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (vendor) filter.vendor = vendor;
  if (supplier) filter.supplier = supplier;
  if (warrantyEnd) filter.warrantyEnd = { $lte: warrantyEnd };

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
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
  const items = await Item.find(filter)
    .sort(sort)
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
 * GET /api/items/available
 * Get only available items (for regular users).
 */
exports.getAvailableItems = catchAsync(async (req, res) => {
  const { search, category, location, page = 1, pageSize = 10 } = req.query;

  const filter = { status: 'Available' };

  if (category) filter.category = category;
  if (location) filter.location = location;

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { itemId: searchRegex },
      { name: searchRegex },
      { universityID: searchRegex },
      { description: searchRegex }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const limit = parseInt(pageSize);

  const [total, items] = await Promise.all([
    Item.countDocuments(filter),
    Item.find(filter)
      .sort({ itemId: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: limit
  });
});

/**
 * GET /api/items/lent-out
 * Get only in-use items.
 */
exports.getLentOutItems = catchAsync(async (req, res) => {
  const {
    search, category, location, type, vendor,
    borrowerId, borrowerName, year,
    page = 1, pageSize = 10,
    sortBy = 'itemId', sortDir = 'asc'
  } = req.query;

  const filter = { status: 'In-use' };

  if (category) filter.category = category;
  if (location) filter.location = location;
  if (type) filter.type = type;
  if (vendor) filter.vendor = vendor;
  if (borrowerId) filter.currentBorrower = borrowerId;
  if (year) filter.warrantyEnd = { $regex: escapeRegex(year) };

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
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
  const limit = parseInt(pageSize);

  const [total, items] = await Promise.all([
    Item.countDocuments(filter),
    Item.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  res.status(200).json({
    success: true,
    items,
    total,
    page: parseInt(page),
    pageSize: limit
  });
});

/**
 * GET /api/items/:id
 * Get single item by itemId.
 */
exports.getItemById = catchAsync(async (req, res, next) => {
  const item = await Item.findOne({ itemId: req.params.id }).lean();
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
    components = await Item.find({ itemId: { $in: item.fixedComponents } }).lean();
  } else if (item.motherID) {
    // Get siblings with the same motherID (excluding self)
    components = await Item.find({ motherID: item.motherID, itemId: { $ne: item.itemId } }).lean();
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
 * Import items from Excel file — optimized with batch insert.
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

  // Filter valid rows and build item data array
  const validRows = rows.filter(row => {
    const name = mapColumn(row, ['name', 'Name', 'Item Name', 'itemName']);
    return !!name;
  });

  if (!validRows.length) {
    fs.unlinkSync(req.file.path);
    return next(ApiError.badRequest('No valid items found in Excel file'));
  }

  // Batch-generate IDs: increment counter once by validRows.length
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'itemId' },
    { $inc: { seq: validRows.length } },
    { new: true, upsert: true }
  );
  const startSeq = counter.seq - validRows.length + 1;

  const today = new Date().toISOString().split('T')[0];
  const itemDataArray = validRows.map((row, idx) => ({
    itemId: `INV-${String(startSeq + idx).padStart(3, '0')}`,
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
    lastUpdate: today
  }));

  // Batch insert all items at once
  const importedItems = await Item.insertMany(itemDataArray, { ordered: false });

  // Fire-and-forget: batch audit logs in background
  const auditPromises = importedItems.map(item =>
    addAuditLog(req.user.userId, 'INVENTORY_ITEM_ADDED', `Imported item: ${item.name}`, item.itemId)
  );
  Promise.all(auditPromises).catch(err => console.error('Audit log batch error:', err.message));

  // Clean up uploaded file
  fs.unlinkSync(req.file.path);

  res.status(201).json({
    success: true,
    imported: importedItems.length,
    items: importedItems
  });
});

/**
 * GET /api/items/export
 * Export all items as JSON (optimized for Excel export on frontend).
 */
exports.exportItems = catchAsync(async (req, res) => {
  const filter = {};
  const { status, type, category, location, vendor, supplier } = req.query;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (vendor) filter.vendor = vendor;
  if (supplier) filter.supplier = supplier;

  const items = await Item.find(filter).sort({ itemId: 1 }).lean();
  res.status(200).json({ success: true, items, total: items.length });
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
