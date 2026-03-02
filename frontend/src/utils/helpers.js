import * as XLSX from 'xlsx';

export const exportToExcel = (data, filename = 'export.xlsx') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, filename);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

// ===== Status model =====
// Item statuses (physical inventory)
export const ITEM_STATUSES = ['Available', 'Checked-out', 'Reserved', 'In repair', 'Retired', 'Lost'];

// Request statuses (borrow workflow)
export const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected', 'Returned'];

// Map legacy status labels to new canonical labels
export const normalizeItemStatus = (status) => {
  const map = {
    'In-use': 'Checked-out',
    'Lent out': 'Checked-out',
    'Dispose': 'Retired',
    'Not Available': 'Retired',
    'Missing': 'Lost',
    'Transferred': 'Retired',
  };
  return map[status] || status;
};

export const getStatusColor = (status) => {
  const normalized = normalizeItemStatus(status);
  const colors = {
    // Item statuses
    'Available':    'badge-success',
    'Checked-out':  'badge-info',
    'Reserved':     'badge-warning',
    'In repair':    'badge-warning',
    'Retired':      'badge-muted',
    'Lost':         'badge-danger',
    // Request statuses
    'Pending':      'badge-warning',
    'Approved':     'badge-success',
    'Rejected':     'badge-danger',
    'Returned':     'badge-info',
  };
  return colors[normalized] || 'badge-muted';
};

// ===== Date / time helpers =====

/** Days between a date and today. Positive = overdue, negative = in future. */
export const daysFromNow = (dateString) => {
  if (!dateString) return null;
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.floor((today - target) / 86400000);
};

/** Human-readable "waiting time" from a past date */
export const waitingTime = (dateString) => {
  const days = daysFromNow(dateString);
  if (days === null) return '—';
  if (days < 1) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
};

/** Is the warranty expired? */
export const isWarrantyExpired = (warrantyEnd) => {
  if (!warrantyEnd) return false;
  return daysFromNow(warrantyEnd) > 0;
};

/** Is the warranty expiring within N days? */
export const isWarrantyExpiringSoon = (warrantyEnd, withinDays = 30) => {
  if (!warrantyEnd) return false;
  const d = daysFromNow(warrantyEnd);
  return d !== null && d <= 0 && d > -withinDays;
};

/** Is a borrow return overdue? */
export const isOverdue = (returnDate) => {
  if (!returnDate) return false;
  return daysFromNow(returnDate) > 0;
};

/** Is a borrow return due within N days? */
export const isDueSoon = (returnDate, withinDays = 7) => {
  if (!returnDate) return false;
  const d = daysFromNow(returnDate);
  return d !== null && d <= 0 && d > -withinDays;
};

export const filterByYear = (items, year) => {
  return items.filter(item => {
    if (item.warrantyStartDate) {
      return item.warrantyStartDate.includes(year.toString());
    }
    return false;
  });
};

export const filterByVendor = (items, vendor) => {
  return items.filter(item => item.supplier === vendor);
};

export const groupByVendor = (items) => {
  return items.reduce((acc, item) => {
    const vendor = item.supplier || 'Unknown';
    if (!acc[vendor]) acc[vendor] = [];
    acc[vendor].push(item);
    return acc;
  }, {});
};

export const getUniqueVendors = (items) => {
  return [...new Set(items.map(item => item.supplier).filter(Boolean))];
};
