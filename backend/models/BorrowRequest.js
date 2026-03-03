const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: [true, 'Request ID is required'],
    unique: true,
    trim: true
  },
  itemID: {
    type: String,
    required: [true, 'Item ID is required'],
    trim: true
  },
  borrowerID: {
    type: String,
    required: [true, 'Borrower ID is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Returned'],
    default: 'Pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: String,
    default: null
  },
  returnDate: {
    type: Date,
    default: null
  },
  returnedDate: {
    type: Date,
    default: null
  },
  declaredReturnDate: {
    type: Date,
    default: null
  },
  reason: {
    type: String,
    default: '',
    trim: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  parentRequestId: {
    type: String,
    default: null
  },
  attachments: [{
    filename: String,
    mimetype: String,
    size: Number,
    path: String
  }]
}, {
  timestamps: true
});

// Index for common queries
borrowRequestSchema.index({ status: 1 });
borrowRequestSchema.index({ borrowerID: 1 });
borrowRequestSchema.index({ itemID: 1 });
borrowRequestSchema.index({ parentRequestId: 1 });
// Sort indexes required by Cosmos DB
borrowRequestSchema.index({ requestDate: -1 });
borrowRequestSchema.index({ approvalDate: -1 });
borrowRequestSchema.index({ returnDate: -1 });
borrowRequestSchema.index({ returnedDate: -1 });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
