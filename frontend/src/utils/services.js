import { mockUsers, mockInventoryItems, mockBorrowingRequests, mockAuditLogs } from "../data/mockData";

// In production, use sessionStorage or a secure authentication mechanism
let currentUser = null;
let db = {
  users: JSON.parse(localStorage.getItem("users") || JSON.stringify(mockUsers)),
  items: JSON.parse(localStorage.getItem("items") || JSON.stringify(mockInventoryItems)),
  requests: JSON.parse(localStorage.getItem("requests") || JSON.stringify(mockBorrowingRequests)),
  logs: JSON.parse(localStorage.getItem("logs") || JSON.stringify(mockAuditLogs))
};

export const authService = {
  login: (username, password) => {
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
      currentUser = { ...user };
      delete currentUser.password;
      addAuditLog(user.id, "LOGIN", `User ${user.name} logged in`, null);
      return currentUser;
    }
    return null;
  },

  logout: () => {
    if (currentUser) {
      addAuditLog(currentUser.id, "LOGOUT", `User logged out`, null);
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
  getAllItems: () => db.items,

  getItemById: (id) => db.items.find(item => item.id === id),

  getAvailableItems: () => db.items.filter(item => item.status === "Available"),

  getLentOutItems: () => db.items.filter(item => item.status === "In-use"),

  getItemsByBorrower: (borrowerID) => {
    const requests = db.requests.filter(r => r.borrowerID === borrowerID && r.status === "Approved");
    return requests.map(r => db.items.find(i => i.id === r.itemID)).filter(Boolean);
  },

  getItemsByVendor: (vendor) => db.items.filter(item => item.supplier === vendor),

  getComponentsForMother: (motherID) => {
    const mother = db.items.find(item => item.motherID === motherID);
    if (!mother || !mother.fixedComponents) return [];
    return mother.fixedComponents.map(cID => db.items.find(i => i.id === cID)).filter(Boolean);
  },

  addItem: (itemData) => {
    const newItem = {
      ...itemData,
      id: `INV-${String(db.items.length + 1).padStart(3, "0")}`
    };
    db.items.push(newItem);
    saveToStorage();
    addAuditLog(currentUser.id, "ITEM_ADDED", `Added new item: ${itemData.name}`, newItem.id);
    return newItem;
  },

  updateItem: (id, updateData) => {
    const item = db.items.find(i => i.id === id);
    if (item) {
      const oldStatus = item.status;
      Object.assign(item, updateData);
      saveToStorage();
      if (oldStatus !== updateData.status) {
        addAuditLog(currentUser.id, "ITEM_STATUS_CHANGE", 
          `Item status changed from ${oldStatus} to ${updateData.status}`, id, oldStatus, updateData.status);
      }
      return item;
    }
    return null;
  },

  deleteItem: (id) => {
    const index = db.items.findIndex(i => i.id === id);
    if (index !== -1) {
      const item = db.items[index];
      db.items.splice(index, 1);
      saveToStorage();
      addAuditLog(currentUser.id, "ITEM_DELETED", `Deleted item: ${item.name}`, id);
      return true;
    }
    return false;
  },

  searchItems: (query) => {
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
  getAllRequests: () => db.requests,

  getRequestsForUser: (borrowerID) => db.requests.filter(r => r.borrowerID === borrowerID),

  getPendingRequests: () => db.requests.filter(r => r.status === "Pending"),

  // Count only top-level pending requests (exclude child requests that were auto-created for components)
  getTopLevelPendingRequests: () => db.requests.filter(r => r.status === "Pending" && !r.parentRequestId),

  getRequestById: (id) => db.requests.find(r => r.id === id),

  createRequest: (itemID, borrowerID, reason, parentRequestId = null) => {
    const newRequest = {
      id: `REQ-${String(db.requests.length + 1).padStart(3, "0")}`,
      itemID,
      borrowerID,
      status: "Pending",
      requestDate: new Date().toISOString(),
      approvalDate: null,
      approvedBy: null,
      returnDate: null,
      returnedDate: null,
      reason,
      notes: "",
      parentRequestId
    };
    db.requests.push(newRequest);
    saveToStorage();
    addAuditLog(currentUser.id, "BORROW_REQUEST_CREATED", `Request created for item ${itemID}`, itemID);
    return newRequest;
  },

  approveRequest: (requestID, returnDate) => {
    const request = db.requests.find(r => r.id === requestID);
    if (request) {
      request.status = "Approved";
      request.approvalDate = new Date().toISOString();
      request.approvedBy = currentUser.id;
      request.returnDate = returnDate;
      
      // Update item status
      const item = db.items.find(i => i.id === request.itemID);
      if (item) {
        item.status = "In-use";
        item.currentBorrower = request.borrowerID;
        
        // If mother item, also mark components as in-use
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
      
      // Auto-approve child requests (components linked to this parent)
      const childRequests = db.requests.filter(r => r.parentRequestId === requestID && r.status === "Pending");
      childRequests.forEach(childReq => {
        childReq.status = "Approved";
        childReq.approvalDate = new Date().toISOString();
        childReq.approvedBy = currentUser.id;
        childReq.returnDate = returnDate;
        const childItem = db.items.find(i => i.id === childReq.itemID);
        if (childItem) {
          childItem.status = "In-use";
          childItem.currentBorrower = childReq.borrowerID;
        }
        addAuditLog(currentUser.id, "BORROW_REQUEST_APPROVED", `Child request auto-approved with parent ${requestID}`, childReq.itemID);
      });
      
      saveToStorage();
      addAuditLog(currentUser.id, "BORROW_REQUEST_APPROVED", `Request approved`, request.itemID);
      return request;
    }
    return null;
  },

  rejectRequest: (requestID, reason) => {
    const request = db.requests.find(r => r.id === requestID);
    if (request) {
      request.status = "Rejected";
      request.notes = reason;
      
      // Auto-reject child requests (components linked to this parent)
      const childRequests = db.requests.filter(r => r.parentRequestId === requestID && r.status === "Pending");
      childRequests.forEach(childReq => {
        childReq.status = "Rejected";
        childReq.notes = `Auto-rejected with parent: ${reason}`;
        addAuditLog(currentUser.id, "BORROW_REQUEST_REJECTED", `Child request auto-rejected with parent ${requestID}: ${reason}`, childReq.itemID);
      });
      
      saveToStorage();
      addAuditLog(currentUser.id, "BORROW_REQUEST_REJECTED", `Request rejected: ${reason}`, request.itemID);
      return request;
    }
    return null;
  },

  returnItem: (requestID) => {
    const request = db.requests.find(r => r.id === requestID);
    if (request) {
      request.status = "Returned";
      request.returnedDate = new Date().toISOString();
      
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
      
      // Auto-return child requests (components linked to this parent)
      const childRequests = db.requests.filter(r => r.parentRequestId === requestID && r.status === "Approved");
      childRequests.forEach(childReq => {
        childReq.status = "Returned";
        childReq.returnedDate = new Date().toISOString();
        const childItem = db.items.find(i => i.id === childReq.itemID);
        if (childItem) {
          childItem.status = "Available";
          childItem.currentBorrower = null;
        }
        addAuditLog(currentUser.id, "ITEM_RETURNED", `Child item auto-returned with parent ${requestID}`, childReq.itemID);
      });
      
      saveToStorage();
      addAuditLog(currentUser.id, "ITEM_RETURNED", `Item returned`, request.itemID);
      return request;
    }
    return null;
  }
};

export const auditService = {
  getAllLogs: () => db.logs,

  getLogsByUser: (userID) => db.logs.filter(log => log.userID === userID),

  getLogsByItem: (itemID) => db.logs.filter(log => log.affectedItemID === itemID),

  getLogsByAction: (action) => db.logs.filter(log => log.action === action),

  getLogsSince: (date) => db.logs.filter(log => new Date(log.timestamp) >= new Date(date)),

  exportLogs: (filters = {}) => {
    let logs = db.logs;
    if (filters.itemID) logs = logs.filter(l => l.affectedItemID === filters.itemID);
    if (filters.userID) logs = logs.filter(l => l.userID === filters.userID);
    if (filters.action) logs = logs.filter(l => l.action === filters.action);
    return logs;
  }
};

const addAuditLog = (userID, action, details, affectedItemID, oldValue = null, newValue = null) => {
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

const saveToStorage = () => {
  localStorage.setItem("users", JSON.stringify(db.users));
  localStorage.setItem("items", JSON.stringify(db.items));
  localStorage.setItem("requests", JSON.stringify(db.requests));
  localStorage.setItem("logs", JSON.stringify(db.logs));
};

export const userService = {
  getUserById: (id) => db.users.find(u => u.id === id) || null,
};

export const getDatabase = () => db;
