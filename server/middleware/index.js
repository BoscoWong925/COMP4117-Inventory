import AuditLog from '../models/AuditLog.js';
import Counter from '../models/Counter.js';

/**
 * Helper to create audit log entries
 */
export const createAuditLog = async (userID, action, details, affectedItemID = null, oldValue = null, newValue = null) => {
  try {
    const seq = await Counter.getNextSequence('log');
    const log = await AuditLog.create({
      logId: `LOG-${String(seq).padStart(3, '0')}`,
      userID,
      action,
      details,
      affectedItemID,
      oldValue,
      newValue
    });
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error.message);
  }
};

/**
 * Simple auth middleware - checks for userId header
 * In production, use JWT tokens
 */
export const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.currentUser = {
    id: userId,
    role: userRole || 'user'
  };
  next();
};

/**
 * Role-based access middleware
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
