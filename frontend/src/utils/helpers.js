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

export const getStatusColor = (status) => {
  const colors = {
    'Available': 'bg-green-100 text-green-800',
    'In-use': 'bg-blue-100 text-blue-800',
    'Missing': 'bg-red-100 text-red-800',
    'Dispose': 'bg-yellow-100 text-yellow-800',
    'Not Available': 'bg-gray-100 text-gray-800',
    'Transferred': 'bg-purple-100 text-purple-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Returned': 'bg-blue-100 text-blue-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
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
