const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: String,
    required: [true, 'Recipient ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: [
      'request_approved',
      'request_rejected',
      'new_request',
      'checkout',
      'checkout_denied',
      'item_returned',
      'item_status_change',
      'welcome',
      'account_deactivated',
      'account_activated',
      'role_changed',
      'custom_email'
    ],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedRequestId: {
    type: String,
    default: null
  },
  relatedItemId: {
    type: String,
    default: null
  },
  senderName: {
    type: String,
    default: 'Inventory System'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
