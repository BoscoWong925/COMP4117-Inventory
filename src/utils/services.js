// API-backed services - Connects to the Node.js/Express + MongoDB backend
// Falls back to localStorage mock data if API is unavailable

import { mockUsers, mockInventoryItems, mockBorrowingRequests, mockAuditLogs } from "../data/mockData";

const API_BASE = '/api';

// Current user state
let currentUser = null;

// Helper for API calls
async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Attach current user info for auth
  if (currentUser) {
    headers['x-user-id'] = currentUser.id;
    headers['x-user-role'] = currentUser.role;
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.warn(`⚠️ API unavailable (${url}), falling back to localStorage`);
      return null; // Signal to use fallback
    }
    throw error;
  }
}

// Fallback localStorage DB (kept for offline/fallback mode)
let db = {
  users: JSON.parse(localStorage.getItem("users") || JSON.stringify(mockUsers)),
  items: JSON.parse(localStorage.getItem("items") || JSON.stringify(mockInventoryItems)),
  requests: JSON.parse(localStorage.getItem("requests") || JSON.stringify(mockBorrowingRequests)),
  logs: JSON.parse(localStorage.getItem("logs") || JSON.stringify(mockAuditLogs))
};

const saveToStorage = () => {
  localStorage.setItem("users", JSON.stringify(db.users));
  localStorage.setItem("items", JSON.stringify(db.items));
  localStorage.setItem("requests", JSON.stringify(db.requests));
  localStorage.setItem("logs", JSON.stringify(db.logs));
};

const addLocalAuditLog = (userID, action, details, affectedItemID, oldValue = null, newValue = null) => {
  const log = {
    id: `LOG-${String(db.logs.length + 1).padStart(3, "0")}`,
    timestamp: new Date().toISOString(),
    userID,
    action,
    details,
    affectedItemID,
    oldValue,
    newValue
  };
  db.logs.push(log);
  saveToStorage();
};

export const authService = {
  login: async (username, password) => {
    try {
      const user = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (user && user.userId) {
        currentUser = {
          id: user.userId,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        };
        return currentUser;
      }
    } catch (error) {
      console.warn('API login failed, trying local fallback:', error.message);
    }

    // Fallback to local
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
      currentUser = { ...user };
      delete currentUser.password;
      addLocalAuditLog(user.id, "LOGIN", `User ${user.name} logged in`, null);
      return currentUser;
    }
    return null;
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore - still logout locally
    }
    if (currentUser) {
      addLocalAuditLog(currentUser.id, "LOGOUT", `User logged out`, null);
    }
    currentUser = null;
  },

  getCurrentUser: () => currentUser,

  hasRole: (roles) => {
    if (!currentUser) return false;
    if (typeof roles === "string") return currentUser.role === roles;
    return roles.includes(currentUser.role);
  }
};

export const inventoryService = {
  getAllItems: async () => {
    const data = await apiFetch('/items');
    if (data) return data;
    return db.items;
  },

  getItemById: async (id) => {
    const data = await apiFetch(`/items/${id}`);
    if (data) return data;
    return db.items.find(item => item.id === id);
  },

  getAvailableItems: async () => {
    const data = await apiFetch('/items/available');
    if (data) return data;
    return db.items.filter(item => item.status === "Available");
  },

  getLentOutItems: async () => {
    const data = await apiFetch('/items/lent-out');
    if (data) return data;
    return db.items.filter(item => item.status === "In-use");
  },

  getItemsByBorrower: async (borrowerID) => {
    const data = await apiFetch(`/items/by-borrower/${borrowerID}`);
    if (data) return data;
    const requests = db.requests.filter(r => r.borrowerID === borrowerID && r.status === "Approved");
    return requests.map(r => db.items.find(i => i.id === r.itemID)).filter(Boolean);
  },

  getItemsByVendor: async (vendor) => {
    const data = await apiFetch(`/items/by-vendor/${encodeURIComponent(vendor)}`);
    if (data) return data;
    return db.items.filter(item => item.supplier === vendor);
  },

  getComponentsForMother: async (motherID) => {
    const data = await apiFetch(`/items/${motherID}/components`);
    if (data) return data;
    const mother = db.items.find(item => item.motherID === motherID);
    if (!mother || !mother.fixedComponents) return [];
    return mother.fixedComponents.map(cID => db.items.find(i => i.id === cID)).filter(Boolean);
  },

  addItem: async (itemData) => {
    try {
      const data = await apiFetch('/items', {
        method: 'POST',
        body: JSON.stringify(itemData)
      });
      if (data) return data;
    } catch (e) {
      console.warn('API addItem failed, using local:', e.message);
    }
    const newItem = {
      ...itemData,
      id: `INV-${String(db.items.length + 1).padStart(3, "0")}`
    };
    db.items.push(newItem);
    saveToStorage();
    addLocalAuditLog(currentUser.id, "ITEM_ADDED", `Added new item: ${itemData.name}`, newItem.id);
    return newItem;
  },

  updateItem: async (id, updateData) => {
    try {
      const data = await apiFetch(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      if (data) return data;
    } catch (e) {
      console.warn('API updateItem failed, using local:', e.message);
    }
    const item = db.items.find(i => i.id === id);
    if (item) {
      const oldStatus = item.status;
      Object.assign(item, updateData);
      saveToStorage();
      if (oldStatus !== updateData.status) {
        addLocalAuditLog(currentUser.id, "ITEM_STATUS_CHANGE",
          `Item status changed from ${oldStatus} to ${updateData.status}`, id, oldStatus, updateData.status);
      }
      return item;
    }
    return null;
  },

  deleteItem: async (id) => {
    try {
      const data = await apiFetch(`/items/${id}`, { method: 'DELETE' });
      if (data) return true;
    } catch (e) {
      console.warn('API deleteItem failed, using local:', e.message);
    }
    const index = db.items.findIndex(i => i.id === id);
    if (index !== -1) {
      const item = db.items[index];
      db.items.splice(index, 1);
      saveToStorage();
      addLocalAuditLog(currentUser.id, "ITEM_DELETED", `Deleted item: ${item.name}`, id);
      return true;
    }
    return false;
  },

  searchItems: async (query) => {
    const data = await apiFetch(`/items/search?q=${encodeURIComponent(query)}`);
    if (data) return data;
    const lowerQuery = query.toLowerCase();
    return db.items.filter(item =>
      item.id.toLowerCase().includes(lowerQuery) ||
      item.name.toLowerCase().includes(lowerQuery) ||
      item.universityID.toLowerCase().includes(lowerQuery) ||
      item.supplier.toLowerCase().includes(lowerQuery)
    );
  }
};

export const borrowingService = {
  getAllRequests: async () => {
    const data = await apiFetch('/requests');
    if (data) return data;
    return db.requests;
  },

  getRequestsForUser: async (borrowerID) => {
    const data = await apiFetch(`/requests/user/${borrowerID}`);
    if (data) return data;
    return db.requests.filter(r => r.borrowerID === borrowerID);
  },

  getPendingRequests: async () => {
    const data = await apiFetch('/requests/pending');
    if (data) return data;
    return db.requests.filter(r => r.status === "Pending");
  },

  getRequestById: async (id) => {
    const data = await apiFetch(`/requests/${id}`);
    if (data) return data;
    return db.requests.find(r => r.id === id);
  },

  createRequest: async (itemID, borrowerID, reason) => {
    try {
      const data = await apiFetch('/requests', {
        method: 'POST',
        body: JSON.stringify({ itemID, borrowerID, reason })
      });
      if (data) return data;
    } catch (e) {
      console.warn('API createRequest failed, using local:', e.message);
    }
    const newRequest = {
      id: `REQ-${String(db.requests.length + 1).padStart(3, "0")}`,
      itemID,
      borrowerID,
      status: "Pending",
      requestDate: new Date().toISOString().split("T")[0],
      approvalDate: null,
      approvedBy: null,
      returnDate: null,
      returnedDate: null,
      reason,
      notes: ""
    };
    db.requests.push(newRequest);
    saveToStorage();
    addLocalAuditLog(currentUser.id, "BORROW_REQUEST_CREATED", `Request created for item ${itemID}`, itemID);
    return newRequest;
  },

  approveRequest: async (requestID, returnDate) => {
    try {
      const data = await apiFetch(`/requests/${requestID}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ returnDate })
      });
      if (data) return data;
    } catch (e) {
      console.warn('API approveRequest failed, using local:', e.message);
    }
    const request = db.requests.find(r => r.id === requestID);
    if (request) {
      request.status = "Approved";
      request.approvalDate = new Date().toISOString().split("T")[0];
      request.approvedBy = currentUser.id;
      request.returnDate = returnDate;
      const item = db.items.find(i => i.id === request.itemID);
      if (item) {
        item.status = "In-use";
        item.currentBorrower = request.borrowerID;
        if (item.fixedComponents && item.fixedComponents.length > 0) {
          item.fixedComponents.forEach(componentID => {
            const component = db.items.find(c => c.id === componentID);
            if (component) {
              component.status = "In-use";
              component.currentBorrower = request.borrowerID;
            }
          });
        }
      }
      saveToStorage();
      addLocalAuditLog(currentUser.id, "BORROW_REQUEST_APPROVED", `Request approved`, request.itemID);
      return request;
    }
    return null;
  },

  rejectRequest: async (requestID, reason) => {
    try {
      const data = await apiFetch(`/requests/${requestID}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
      if (data) return data;
    } catch (e) {
      console.warn('API rejectRequest failed, using local:', e.message);
    }
    const request = db.requests.find(r => r.id === requestID);
    if (request) {
      request.status = "Rejected";
      request.notes = reason;
      saveToStorage();
      addLocalAuditLog(currentUser.id, "BORROW_REQUEST_REJECTED", `Request rejected: ${reason}`, request.itemID);
      return request;
    }
    return null;
  },

  returnItem: async (requestID) => {
    try {
      const data = await apiFetch(`/requests/${requestID}/return`, { method: 'PUT' });
      if (data) return data;
    } catch (e) {
      console.warn('API returnItem failed, using local:', e.message);
    }
    const request = db.requests.find(r => r.id === requestID);
    if (request) {
      request.status = "Returned";
      request.returnedDate = new Date().toISOString().split("T")[0];
      
      // Update item status
      const item = db.items.find(i => i.id === request.itemID);
      if (item) {
        item.status = "Available";
        item.currentBorrower = null;
        
        // If mother item, also mark components as available
        if (item.fixedComponents && item.fixedComponents.length > 0) {
          item.fixedComponents.forEach(componentID => {
            const component = db.items.find(c => c.id === componentID);
            if (component) {
              component.status = "Available";
              component.currentBorrower = null;
            }
          });
        }
      }
      
      saveToStorage();
      addLocalAuditLog(currentUser.id, "ITEM_RETURNED", `Item returned`, request.itemID);
      return request;
    }
    return null;
  }
};

export const auditService = {
  getAllLogs: async () => {
    const data = await apiFetch('/logs');
    if (data) return data;
    return db.logs;
  },

  getLogsByUser: async (userID) => {
    const data = await apiFetch(`/logs/user/${userID}`);
    if (data) return data;
    return db.logs.filter(log => log.userID === userID);
  },

  getLogsByItem: async (itemID) => {
    const data = await apiFetch(`/logs/item/${itemID}`);
    if (data) return data;
    return db.logs.filter(log => log.affectedItemID === itemID);
  },

  getLogsByAction: async (action) => {
    const data = await apiFetch(`/logs/action/${action}`);
    if (data) return data;
    return db.logs.filter(log => log.action === action);
  },

  getLogsSince: async (date) => {
    const data = await apiFetch(`/logs/since/${date}`);
    if (data) return data;
    return db.logs.filter(log => new Date(log.timestamp) >= new Date(date));
  },

  exportLogs: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const data = await apiFetch(`/logs/export?${params}`);
    if (data) return data;
    let logs = db.logs;
    if (filters.itemID) logs = logs.filter(l => l.affectedItemID === filters.itemID);
    if (filters.userID) logs = logs.filter(l => l.userID === filters.userID);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    return logs;
  }
};

export const getDatabase = () => db;
