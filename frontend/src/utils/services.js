// API Base URL - uses env var in production, falls back to localhost for dev
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001') + '/api';

// ===== HTTP Helper =====
const getToken = () => sessionStorage.getItem('token');

// Clean empty/null/undefined params
const cleanQueryParams = (params) => {
  const clean = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== '' && val !== null && val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
};

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = { ...options.headers };

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
};

// ===== Auth Service =====
let currentUser = null;

export const authService = {
  login: async (username, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.success && data.token) {
      sessionStorage.setItem('token', data.token);
      currentUser = data.user;
      return currentUser;
    }
    return null;
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore logout errors
    }
    sessionStorage.removeItem('token');
    currentUser = null;
  },

  getCurrentUser: () => currentUser,

  hasRole: (roles) => {
    if (!currentUser) return false;
    if (typeof roles === 'string') return currentUser.role === roles;
    return roles.includes(currentUser.role);
  },

  // Restore session from token
  restoreSession: async () => {
    const token = getToken();
    if (!token) return null;
    try {
      const data = await apiRequest('/auth/me');
      if (data.success) {
        currentUser = data.user;
        return currentUser;
      }
    } catch (e) {
      sessionStorage.removeItem('token');
    }
    return null;
  }
};

// ===== Inventory Service =====
export const inventoryService = {
  getAllItems: async (params = {}) => {
    const query = new URLSearchParams(cleanQueryParams(params)).toString();
    const data = await apiRequest(`/items?${query}`);
    const items = (data.items || []).map(item => ({ ...item, id: item.itemId }));
    return { items, total: data.total || items.length };
  },

  getItemById: async (id) => {
    const data = await apiRequest(`/items/${id}`);
    const item = data.item;
    return item ? { ...item, id: item.itemId } : null;
  },

  getAvailableItems: async (params = {}) => {
    const query = new URLSearchParams(cleanQueryParams(params)).toString();
    const data = await apiRequest(`/items/available?${query}`);
    const items = (data.items || []).map(item => ({ ...item, id: item.itemId }));
    return { items, total: data.total || items.length };
  },

  getLentOutItems: async (params = {}) => {
    const query = new URLSearchParams(cleanQueryParams(params)).toString();
    const data = await apiRequest(`/items/lent-out?${query}`);
    const items = (data.items || []).map(item => ({ ...item, id: item.itemId }));
    return { items, total: data.total || items.length };
  },

  getItemsByBorrower: async (borrowerID) => {
    const data = await apiRequest(`/items?currentBorrower=${borrowerID}&status=In-use&pageSize=100`);
    return (data.items || []).map(item => ({ ...item, id: item.itemId }));
  },

  getItemsByOwner: async (ownerId, params = {}) => {
    const query = new URLSearchParams(cleanQueryParams(params)).toString();
    const data = await apiRequest(`/items/by-owner/${encodeURIComponent(ownerId)}?${query}`);
    const items = (data.items || []).map(item => ({ ...item, id: item.itemId }));
    return { items, total: data.total || items.length };
  },

  getItemOwners: async () => {
    const data = await apiRequest('/items/owners');
    return data.owners || [];
  },

  getItemsByVendor: async (vendor) => {
    const data = await apiRequest(`/items?supplier=${encodeURIComponent(vendor)}&pageSize=100`);
    return (data.items || []).map(item => ({ ...item, id: item.itemId }));
  },

  getComponentsForMother: async (motherID) => {
    // Get the mother item first to find its ID
    const data = await apiRequest(`/items?pageSize=100`);
    const mother = (data.items || []).find(item => item.motherID === motherID);
    if (!mother || !mother.fixedComponents || !mother.fixedComponents.length) return [];
    const components = (data.items || []).filter(i => mother.fixedComponents.includes(i.itemId));
    return components.map(item => ({ ...item, id: item.itemId }));
  },

  addItem: async (itemData, invoiceFile = null) => {
    let body, headers = {};
    if (invoiceFile) {
      body = new FormData();
      Object.entries(itemData).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          if (Array.isArray(val)) {
            body.append(key, JSON.stringify(val));
          } else {
            body.append(key, val);
          }
        }
      });
      body.append('invoiceFile', invoiceFile);
    } else {
      body = JSON.stringify(itemData);
    }
    const data = await apiRequest('/items', { method: 'POST', body, headers });
    const item = data.item;
    return item ? { ...item, id: item.itemId } : null;
  },

  updateItem: async (id, updateData, invoiceFile = null) => {
    let body, headers = {};
    if (invoiceFile) {
      body = new FormData();
      Object.entries(updateData).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          if (Array.isArray(val)) {
            body.append(key, JSON.stringify(val));
          } else {
            body.append(key, val);
          }
        }
      });
      body.append('invoiceFile', invoiceFile);
    } else {
      body = JSON.stringify(updateData);
    }
    const data = await apiRequest(`/items/${id}`, { method: 'PUT', body, headers });
    const item = data.item;
    return item ? { ...item, id: item.itemId } : null;
  },

  deleteItem: async (id) => {
    const data = await apiRequest(`/items/${id}`, { method: 'DELETE' });
    return data.success;
  },

  searchItems: async (query) => {
    const data = await apiRequest(`/items?search=${encodeURIComponent(query)}&pageSize=100`);
    return (data.items || []).map(item => ({ ...item, id: item.itemId }));
  },

  importItems: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiRequest('/items/import', { method: 'POST', body: formData });
    return data;
  }
};

// ===== Borrowing Service =====
export const borrowingService = {
  getAllRequests: async (params = {}) => {
    const query = new URLSearchParams(cleanQueryParams(params)).toString();
    const data = await apiRequest(`/borrow-requests?${query}`);
    return { requests: data.requests || [], total: data.total || 0 };
  },

  getRequestsForUser: async (borrowerID) => {
    const data = await apiRequest(`/borrow-requests/my?pageSize=1000`);
    return data.requests || [];
  },

  getPendingRequests: async () => {
    const data = await apiRequest('/borrow-requests/pending');
    return data.requests || [];
  },

  getTopLevelPendingRequests: async () => {
    const data = await apiRequest('/borrow-requests/pending');
    return (data.requests || []).filter(r => !r.parentRequestId);
  },

  getTopLevelPendingCount: async () => {
    const data = await apiRequest('/borrow-requests/pending');
    return data.count || 0;
  },

  getRequestById: async (id) => {
    const data = await apiRequest(`/borrow-requests/${id}`);
    return data.request || null;
  },

  createRequest: async (itemID, borrowerID, reason, parentRequestId = null, attachments = []) => {
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      formData.append('itemID', itemID);
      formData.append('reason', reason);
      attachments.forEach(file => formData.append('attachments', file));
      const data = await apiRequest('/borrow-requests', { method: 'POST', body: formData });
      return data.request;
    } else {
      const data = await apiRequest('/borrow-requests', {
        method: 'POST',
        body: JSON.stringify({ itemID, reason })
      });
      return data.request;
    }
  },

  approveRequest: async (requestID, returnDate, location = null, remark = null) => {
    const body = { returnDate };
    if (location) body.location = location;
    if (remark) body.remark = remark;
    const data = await apiRequest(`/borrow-requests/${requestID}/approve`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    return data.request;
  },

  rejectRequest: async (requestID, reason) => {
    const data = await apiRequest(`/borrow-requests/${requestID}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
    return data.request;
  },

  returnItem: async (requestID, location = null) => {
    const body = {};
    if (location) body.location = location;
    const data = await apiRequest(`/borrow-requests/${requestID}/return`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    return data.request;
  },

  declareReturnDate: async (requestID, declaredReturnDate) => {
    const data = await apiRequest(`/borrow-requests/${requestID}/declare-return`, {
      method: 'PUT',
      body: JSON.stringify({ declaredReturnDate })
    });
    return data.request;
  },

  getTeacherPendingRequests: async () => {
    const data = await apiRequest('/borrow-requests/teacher-pending');
    return data.requests || [];
  },

  getTeacherRequestHistory: async (params = {}) => {
    const query = new URLSearchParams(cleanQueryParams(params)).toString();
    const data = await apiRequest(`/borrow-requests/teacher-history?${query}`);
    return { requests: data.requests || [], total: data.total || 0 };
  }
};

// ===== Audit Service =====
export const auditService = {
  getAllLogs: async (params = {}) => {
    if (!params.pageSize) params.pageSize = 1000;
    const query = new URLSearchParams(cleanQueryParams(params)).toString();
    const data = await apiRequest(`/audit-logs?${query}`);
    return { logs: data.logs || [], total: data.total || 0 };
  },

  getLogsByUser: async (userID) => {
    const data = await apiRequest(`/audit-logs?search=${encodeURIComponent(userID)}&pageSize=100`);
    return data.logs || [];
  },

  getLogsByItem: async (itemID) => {
    const data = await apiRequest(`/audit-logs?search=${encodeURIComponent(itemID)}&pageSize=100`);
    return data.logs || [];
  },

  getLogsByAction: async (action) => {
    const data = await apiRequest(`/audit-logs?action=${encodeURIComponent(action)}&pageSize=100`);
    return data.logs || [];
  },

  getLogsSince: async (date) => {
    const data = await apiRequest(`/audit-logs?pageSize=100`);
    return (data.logs || []).filter(log => new Date(log.timestamp) >= new Date(date));
  },

  exportLogs: async (filters = {}) => {
    const params = {};
    if (filters.itemID) params.search = filters.itemID;
    if (filters.userID) params.search = filters.userID;
    if (filters.action) params.action = filters.action;
    params.pageSize = 1000;
    const query = new URLSearchParams(params).toString();
    const data = await apiRequest(`/audit-logs?${query}`);
    return data.logs || [];
  },

  deleteLogs: async (logIds) => {
    const data = await apiRequest('/audit-logs', {
      method: 'DELETE',
      body: JSON.stringify({ logIds })
    });
    return data;
  }
};

// ===== User Service =====
export const userService = {
  getUserById: async (id) => {
    try {
      const data = await apiRequest(`/users/${id}`);
      return data.user || null;
    } catch {
      return null;
    }
  },

  getAllUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const data = await apiRequest(`/users?${query}`);
    return { users: data.users || [], total: data.total || 0 };
  },

  createUser: async (userData) => {
    const data = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return data.user;
  },

  updateUser: async (id, updateData) => {
    const data = await apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    return data.user;
  },

  deleteUser: async (id) => {
    const data = await apiRequest(`/users/${id}`, { method: 'DELETE' });
    return data.success;
  },

  toggleUserStatus: async (id, isActive) => {
    const data = await apiRequest(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive })
    });
    return data.user;
  },

  getTeachers: async () => {
    const data = await apiRequest('/users/teachers');
    return data.users || [];
  },

  searchUsers: async (query) => {
    const data = await apiRequest(`/users/search/${encodeURIComponent(query)}`);
    return data.users || [];
  }
};

// ===== Stats Service =====
export const statsService = {
  getStats: async () => {
    const data = await apiRequest('/stats');
    return data;
  }
};

// ===== Legacy compatibility =====
export const getDatabase = () => {
  console.warn('getDatabase() is deprecated. Use API services instead.');
  return { users: [], items: [], requests: [], logs: [] };
};
