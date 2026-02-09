import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userID: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
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

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
