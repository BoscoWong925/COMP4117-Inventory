const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');

/**
 * Create an audit log entry.
 */
const addAuditLog = async (userID, action, details, affectedItemID = null, oldValue = null, newValue = null) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'logId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const logId = `LOG-${String(counter.seq).padStart(3, '0')}`;

    await AuditLog.create({
      logId,
      timestamp: new Date(),
      userID,
      action,
      details,
      affectedItemID,
      oldValue,
      newValue
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

module.exports = addAuditLog;
