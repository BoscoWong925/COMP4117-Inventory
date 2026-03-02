const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userID: {
    type: String,
    required: [true, 'User ID is required'],
    trim: true
  },
  action: {
    type: String,
    required: [true, 'Action is required']
  },
  details: {
    type: String,
    default: '',
    trim: true
  },
  affectedItemID: {
    type: String,
    default: null
  },
  oldValue: {
    type: String,
    default: null
  },
  newValue: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for common queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userID: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
