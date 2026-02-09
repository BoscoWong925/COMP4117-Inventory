import mongoose from 'mongoose';

const borrowRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  itemID: {
    type: String,
    required: true
  },
  borrowerID: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Returned'],
    default: 'Pending'
  },
  requestDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  approvalDate: {
    type: String,
    default: null
  },
  approvedBy: {
    type: String,
    default: null
  },
  returnDate: {
    type: String,
    default: null
  },
  returnedDate: {
    type: String,
    default: null
  },
  reason: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const BorrowRequest = mongoose.model('BorrowRequest', borrowRequestSchema);

export default BorrowRequest;
