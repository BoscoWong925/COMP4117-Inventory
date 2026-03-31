const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

const PRIORITY_ORDER = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4
};

const PRIORITY_VARIANT = {
  Low: 'outline',
  Medium: 'warning',
  High: 'destructive',
  Critical: 'urgent'
};

const clampInt = (value, fallback, min, max) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const parseDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDaysFromNow = (dateValue) => {
  const date = parseDate(dateValue);
  if (!date) return null;

  const target = new Date(date);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - target) / 86400000);
};

const formatDate = (dateValue) => {
  const date = parseDate(dateValue);
  if (!date) return '—';
  return date.toISOString().split('T')[0];
};

const getWaitingLabel = (requestDate) => {
  const days = getDaysFromNow(requestDate);
  if (days === null) return '—';
  if (days < 1) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
};

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const getRequestPriority = (waitedDays) => {
  if (waitedDays > 30) return 'Critical';
  if (waitedDays > 7) return 'High';
  if (waitedDays > 0) return 'Medium';
  return 'Low';
};

const getOverduePriority = (overdueDays) => {
  if (overdueDays > 30) return 'Critical';
  if (overdueDays > 7) return 'High';
  return 'Medium';
};

const getDueSoonPriority = (daysLeft) => {
  if (daysLeft <= 1) return 'High';
  return 'Low';
};

const withPriorityMeta = (priorityLabel) => ({
  priority: priorityLabel,
  priorityOrder: PRIORITY_ORDER[priorityLabel] || PRIORITY_ORDER.Low,
  priorityVariant: PRIORITY_VARIANT[priorityLabel] || PRIORITY_VARIANT.Low
});

const buildRequestAndReturnRows = async () => {
  const [requestDocs, approvedReturnDocs] = await Promise.all([
    BorrowRequest.find({
      parentRequestId: null,
      status: { $in: ['Pending', 'Pending Check-Out'] }
    })
      .select('requestId itemID borrowerID status requestDate')
      .lean(),
    BorrowRequest.find({
      parentRequestId: null,
      status: 'Approved',
      returnDate: { $ne: null }
    })
      .select('requestId itemID borrowerID returnDate')
      .lean()
  ]);

  const itemIds = [...new Set([...requestDocs, ...approvedReturnDocs].map((r) => r.itemID).filter(Boolean))];
  const borrowerIds = [...new Set([...requestDocs, ...approvedReturnDocs].map((r) => r.borrowerID).filter(Boolean))];

  const [items, borrowers] = await Promise.all([
    itemIds.length > 0
      ? Item.find({ itemId: { $in: itemIds } }).select('itemId name').lean()
      : [],
    borrowerIds.length > 0
      ? User.find({ userId: { $in: borrowerIds } }).select('userId name').lean()
      : []
  ]);

  const itemMap = new Map(items.map((item) => [item.itemId, item.name || item.itemId]));
  const borrowerMap = new Map(borrowers.map((borrower) => [borrower.userId, borrower.name || borrower.userId]));

  const overdueBorrowerIds = new Set();
  const returnRows = [];
  const returnCounts = { overdue: 0, dueSoon: 0, dueToday: 0 };

  approvedReturnDocs.forEach((req) => {
    const days = getDaysFromNow(req.returnDate);
    if (days === null) return;

    if (days > 0) {
      const priorityLabel = getOverduePriority(days);
      overdueBorrowerIds.add(req.borrowerID);
      returnCounts.overdue += 1;

      returnRows.push({
        id: req.requestId,
        queueTab: 'returns',
        type: 'Overdue Return',
        typeShort: 'Overdue',
        typeVariant: 'outline',
        name: itemMap.get(req.itemID) || req.itemID,
        user: borrowerMap.get(req.borrowerID) || req.borrowerID,
        hasOverdue: false,
        status: 'Overdue',
        rawStatus: 'Approved',
        statusVariant: 'destructive',
        date: req.returnDate,
        dateLabel: `${days}d overdue`,
        daysFromDate: days,
        actionType: 'view-lent',
        sortDate: parseDate(req.returnDate),
        ...withPriorityMeta(priorityLabel)
      });
      return;
    }

    if (days >= -7 && days <= 0) {
      const daysLeft = Math.abs(days);
      const priorityLabel = getDueSoonPriority(daysLeft);
      returnCounts.dueSoon += 1;
      if (days === 0) returnCounts.dueToday += 1;

      returnRows.push({
        id: req.requestId,
        queueTab: 'returns',
        type: 'Due Soon',
        typeShort: 'Due Soon',
        typeVariant: 'outline',
        name: itemMap.get(req.itemID) || req.itemID,
        user: borrowerMap.get(req.borrowerID) || req.borrowerID,
        hasOverdue: false,
        status: 'Due Soon',
        rawStatus: 'Approved',
        statusVariant: 'warning',
        date: req.returnDate,
        dateLabel: `${daysLeft}d left`,
        daysFromDate: days,
        actionType: 'view-lent',
        sortDate: parseDate(req.returnDate),
        ...withPriorityMeta(priorityLabel)
      });
    }
  });

  const requestRows = [];
  const requestCounts = { pending: 0, pendingCheckout: 0, longWait: 0 };

  requestDocs.forEach((req) => {
    const waited = getDaysFromNow(req.requestDate) || 0;
    const priorityLabel = getRequestPriority(waited);
    const isPendingCheckout = req.status === 'Pending Check-Out';
    if (isPendingCheckout) requestCounts.pendingCheckout += 1;
    else requestCounts.pending += 1;
    if (waited > 3) requestCounts.longWait += 1;

    requestRows.push({
      id: req.requestId,
      queueTab: 'requests',
      type: isPendingCheckout ? 'Pending Checkout' : 'Pending Request',
      typeShort: isPendingCheckout ? 'Checkout' : 'Request',
      typeVariant: 'outline',
      name: itemMap.get(req.itemID) || req.itemID,
      user: borrowerMap.get(req.borrowerID) || req.borrowerID,
      hasOverdue: overdueBorrowerIds.has(req.borrowerID),
      status: isPendingCheckout ? 'Checkout' : 'Pending',
      rawStatus: req.status,
      statusVariant: isPendingCheckout ? 'info' : 'warning',
      date: req.requestDate,
      dateLabel: getWaitingLabel(req.requestDate),
      daysFromDate: waited,
      actionType: isPendingCheckout ? 'checkout' : 'approve',
      sortDate: parseDate(req.requestDate),
      ...withPriorityMeta(priorityLabel)
    });
  });

  return {
    returnRows,
    requestRows,
    returnCounts,
    requestCounts
  };
};

const buildInventoryRows = async () => {
  const inventoryDocs = await Item.find({
    $or: [
      { status: { $in: ['Missing', 'Not Available', 'Transferred'] } },
      { warrantyEnd: { $exists: true, $ne: '' } }
    ]
  })
    .select('itemId name status currentBorrower supplier warrantyEnd lastUpdate updatedAt')
    .lean();

  const borrowerIds = [...new Set(inventoryDocs.map((item) => item.currentBorrower).filter(Boolean))];
  const borrowers = borrowerIds.length > 0
    ? await User.find({ userId: { $in: borrowerIds } }).select('userId name').lean()
    : [];
  const borrowerMap = new Map(borrowers.map((borrower) => [borrower.userId, borrower.name || borrower.userId]));

  const inventoryRows = [];
  const inventoryCounts = {
    missing: 0,
    notAvailable: 0,
    transferred: 0,
    warrantyExpired: 0,
    warrantyExpiringSoon: 0
  };

  inventoryDocs.forEach((item) => {
    let addedStatusRow = false;
    const borrowerLabel = borrowerMap.get(item.currentBorrower) || item.currentBorrower || '—';

    if (item.status === 'Missing') {
      inventoryCounts.missing += 1;
      addedStatusRow = true;
      inventoryRows.push({
        id: item.itemId,
        queueTab: 'inventory',
        type: 'Missing Item',
        typeShort: 'Missing',
        typeVariant: 'outline',
        name: item.name || item.itemId,
        user: borrowerLabel,
        hasOverdue: false,
        status: 'Missing',
        rawStatus: 'Missing',
        statusVariant: 'destructive',
        date: null,
        dateLabel: '—',
        daysFromDate: null,
        actionType: 'view-item',
        sortDate: parseDate(item.updatedAt || item.lastUpdate),
        ...withPriorityMeta('Critical')
      });
    } else if (item.status === 'Not Available') {
      inventoryCounts.notAvailable += 1;
      addedStatusRow = true;
      inventoryRows.push({
        id: item.itemId,
        queueTab: 'inventory',
        type: 'Unavailable Item',
        typeShort: 'Unavailable',
        typeVariant: 'outline',
        name: item.name || item.itemId,
        user: borrowerLabel,
        hasOverdue: false,
        status: 'Not Available',
        rawStatus: 'Not Available',
        statusVariant: 'warning',
        date: null,
        dateLabel: '—',
        daysFromDate: null,
        actionType: 'view-item',
        sortDate: parseDate(item.updatedAt || item.lastUpdate),
        ...withPriorityMeta('High')
      });
    } else if (item.status === 'Transferred') {
      inventoryCounts.transferred += 1;
      addedStatusRow = true;
      inventoryRows.push({
        id: item.itemId,
        queueTab: 'inventory',
        type: 'Transferred Item',
        typeShort: 'Transferred',
        typeVariant: 'outline',
        name: item.name || item.itemId,
        user: borrowerLabel,
        hasOverdue: false,
        status: 'Transferred',
        rawStatus: 'Transferred',
        statusVariant: 'outline',
        date: null,
        dateLabel: '—',
        daysFromDate: null,
        actionType: 'view-item',
        sortDate: parseDate(item.updatedAt || item.lastUpdate),
        ...withPriorityMeta('Low')
      });
    }

    const warrantyDate = parseDate(item.warrantyEnd);
    if (!warrantyDate || addedStatusRow) return;

    const days = getDaysFromNow(warrantyDate);
    if (days === null) return;

    if (days > 0) {
      inventoryCounts.warrantyExpired += 1;
      inventoryRows.push({
        id: `${item.itemId}-warranty-expired`,
        queueTab: 'inventory',
        type: 'Warranty Expired',
        typeShort: 'Warranty',
        typeVariant: 'outline',
        name: item.name || item.itemId,
        user: item.supplier || '—',
        hasOverdue: false,
        status: 'Expired',
        rawStatus: 'Expired',
        statusVariant: 'outline',
        date: warrantyDate,
        dateLabel: formatDate(warrantyDate),
        daysFromDate: days,
        actionType: 'view-item',
        sortDate: warrantyDate,
        ...withPriorityMeta('Low')
      });
      return;
    }

    if (days >= -30 && days <= 0) {
      inventoryCounts.warrantyExpiringSoon += 1;
      inventoryRows.push({
        id: `${item.itemId}-warranty-soon`,
        queueTab: 'inventory',
        type: 'Warranty Expiring Soon',
        typeShort: 'Warranty',
        typeVariant: 'outline',
        name: item.name || item.itemId,
        user: item.supplier || '—',
        hasOverdue: false,
        status: 'Expiring Soon',
        rawStatus: 'Expiring Soon',
        statusVariant: 'warning',
        date: warrantyDate,
        dateLabel: formatDate(warrantyDate),
        daysFromDate: days,
        actionType: 'view-item',
        sortDate: warrantyDate,
        ...withPriorityMeta('Low')
      });
    }
  });

  return {
    inventoryRows,
    inventoryCounts
  };
};

const applyQueueFilters = (rows, { status, type, dueRange, priority }) => {
  const normalizedStatus = normalizeValue(status);
  const normalizedType = normalizeValue(type);
  const normalizedDueRange = normalizeValue(dueRange);
  const normalizedPriority = normalizeValue(priority);

  return rows.filter((row) => {
    if (normalizedStatus) {
      const rowStatus = normalizeValue(row.status);
      const rawStatus = normalizeValue(row.rawStatus);

      if (normalizedStatus === 'checkout' || normalizedStatus === 'pending checkout' || normalizedStatus === 'pending check-out') {
        if (rawStatus !== 'pending check-out' && rowStatus !== 'checkout') return false;
      } else if (rowStatus !== normalizedStatus && rawStatus !== normalizedStatus) {
        return false;
      }
    }

    if (normalizedType) {
      const queueTab = normalizeValue(row.queueTab);
      const rowType = normalizeValue(row.type);
      const rowTypeShort = normalizeValue(row.typeShort);
      if (queueTab !== normalizedType && !rowType.includes(normalizedType) && !rowTypeShort.includes(normalizedType)) {
        return false;
      }
    }

    if (normalizedDueRange) {
      if (normalizedDueRange === 'overdue' && !(row.queueTab === 'returns' && row.status === 'Overdue')) {
        return false;
      }
      if ((normalizedDueRange === 'duesoon' || normalizedDueRange === 'due-soon') && !(row.queueTab === 'returns' && row.status === 'Due Soon')) {
        return false;
      }
      if (normalizedDueRange === 'today' && !(row.queueTab === 'returns' && row.daysFromDate === 0)) {
        return false;
      }
      if ((normalizedDueRange === '7d' || normalizedDueRange === 'within7d') && !(row.queueTab === 'returns' && row.daysFromDate !== null && row.daysFromDate <= 0 && row.daysFromDate >= -7)) {
        return false;
      }
    }

    if (normalizedPriority && normalizeValue(row.priority) !== normalizedPriority) {
      return false;
    }

    return true;
  });
};

const sortQueueRows = (rows, sortBy, sortOrder) => {
  const normalizedSortBy = normalizeValue(sortBy) || 'priority';
  const direction = normalizeValue(sortOrder) === 'asc' ? 1 : -1;

  const toTimestamp = (value) => {
    const date = parseDate(value);
    return date ? date.getTime() : 0;
  };

  const sorted = [...rows].sort((a, b) => {
    let result = 0;

    if (normalizedSortBy === 'priority') {
      result = (a.priorityOrder || 0) - (b.priorityOrder || 0);
    } else if (normalizedSortBy === 'date') {
      result = toTimestamp(a.sortDate || a.date) - toTimestamp(b.sortDate || b.date);
    } else if (normalizedSortBy === 'status') {
      result = String(a.status || '').localeCompare(String(b.status || ''));
    } else if (normalizedSortBy === 'type') {
      result = String(a.type || '').localeCompare(String(b.type || ''));
    } else if (normalizedSortBy === 'user') {
      result = String(a.user || '').localeCompare(String(b.user || ''));
    } else {
      result = String(a.name || '').localeCompare(String(b.name || ''));
    }

    if (result === 0) {
      return toTimestamp(b.sortDate || b.date) - toTimestamp(a.sortDate || a.date);
    }

    return result * direction;
  });

  return sorted;
};

/**
 * GET /api/stats
 * Dashboard statistics for admin/operator.
 */
exports.getStats = catchAsync(async (req, res) => {
  const warrantyRowsPromise = Item.find({ warrantyEnd: { $exists: true, $ne: '' } })
    .select('warrantyEnd')
    .lean();

  const [
    totalItems,
    availableItems,
    lentOutItems,
    missingItems,
    notAvailableItems,
    transferredItems,
    disposedItems,
    pendingRequests,
    returnedRequests,
    approvedRequests,
    rejectedRequests,
    warrantyRows
  ] = await Promise.all([
    Item.countDocuments(),
    Item.countDocuments({ status: 'Available' }),
    Item.countDocuments({ status: 'In-use' }),
    Item.countDocuments({ status: 'Missing' }),
    Item.countDocuments({ status: 'Not Available' }),
    Item.countDocuments({ status: 'Transferred' }),
    Item.countDocuments({ status: 'Dispose' }),
    BorrowRequest.countDocuments({ status: { $in: ['Pending', 'Pending Check-Out'] }, parentRequestId: null }),
    BorrowRequest.countDocuments({ status: 'Returned' }),
    BorrowRequest.countDocuments({ status: 'Approved' }),
    BorrowRequest.countDocuments({ status: 'Rejected' }),
    warrantyRowsPromise
  ]);

  let warrantyExpiredItems = 0;
  let warrantyExpiringSoonItems = 0;

  warrantyRows.forEach((row) => {
    const days = getDaysFromNow(row.warrantyEnd);
    if (days === null) return;
    if (days > 0) {
      warrantyExpiredItems += 1;
      return;
    }
    if (days >= -30 && days <= 0) {
      warrantyExpiringSoonItems += 1;
    }
  });

  res.status(200).json({
    success: true,
    totalItems,
    availableItems,
    lentOutItems,
    missingItems,
    notAvailableItems,
    transferredItems,
    disposedItems,
    pendingRequests,
    returnedRequests,
    approvedRequests,
    rejectedRequests,
    warrantyExpiredItems,
    warrantyExpiringSoonItems
  });
});

exports.getDashboardQueue = catchAsync(async (req, res) => {
  const tab = normalizeValue(req.query.tab) || 'all';
  const page = clampInt(req.query.page, 1, 1, 100000);
  const pageSize = clampInt(req.query.pageSize, 10, 1, 100);
  const status = req.query.status || '';
  const type = req.query.type || '';
  const dueRange = req.query.dueRange || '';
  const priority = req.query.priority || '';
  const sortBy = req.query.sortBy || 'priority';
  const sortOrder = req.query.sortOrder || 'desc';

  const [{ returnRows, requestRows, returnCounts, requestCounts }, { inventoryRows, inventoryCounts }] = await Promise.all([
    buildRequestAndReturnRows(),
    buildInventoryRows()
  ]);

  const tabRows = {
    returns: returnRows,
    requests: requestRows,
    inventory: inventoryRows
  };

  const allRows = [...returnRows, ...requestRows, ...inventoryRows];

  const tabCounts = {
    all: allRows.length,
    returns: returnRows.length,
    requests: requestRows.length,
    inventory: inventoryRows.length
  };

  let scopedRows = allRows;
  if (tab === 'returns' || tab === 'requests' || tab === 'inventory') {
    scopedRows = tabRows[tab];
  }

  const filteredRows = applyQueueFilters(scopedRows, { status, type, dueRange, priority });
  const sortedRows = sortQueueRows(filteredRows, sortBy, sortOrder);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const items = sortedRows.slice(start, start + pageSize);

  res.status(200).json({
    success: true,
    items,
    page: currentPage,
    pageSize,
    total,
    totalPages,
    counts: {
      tabs: tabCounts,
      returns: returnCounts,
      requests: requestCounts,
      inventory: inventoryCounts
    }
  });
});
