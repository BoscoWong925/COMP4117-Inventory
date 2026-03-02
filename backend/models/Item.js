const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: [true, 'Item ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  universityID: {
    type: String,
    required: [true, 'University ID is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Hardware', 'Software', 'Component'],
    default: 'Hardware'
  },
  category: {
    type: String,
    default: 'Other',
    trim: true
  },
  status: {
    type: String,
    enum: ['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred'],
    default: 'Available'
  },
  location: {
    type: String,
    default: '',
    trim: true
  },
  currentBorrower: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  motherID: {
    type: String,
    default: null,
    trim: true
  },
  fixedComponents: {
    type: [String],
    default: []
  },
  foRequestID: {
    type: String,
    default: '',
    trim: true
  },
  orderID: {
    type: String,
    default: '',
    trim: true
  },
  supplier: {
    type: String,
    default: '',
    trim: true
  },
  invoiceNumber: {
    type: String,
    default: '',
    trim: true
  },
  supplierStatus: {
    type: String,
    default: '',
    trim: true
  },
  projectLinked: {
    type: String,
    default: null,
    trim: true
  },
  fundingSource: {
    type: String,
    default: '',
    trim: true
  },
  purchaseDate: {
    type: String,
    default: ''
  },
  warrantyEnd: {
    type: String,
    default: ''
  },
  warrantyStartDate: {
    type: String,
    default: ''
  },
  warrantyOnsite: {
    type: Boolean,
    default: false
  },
  warrantyVendor: {
    type: String,
    default: '',
    trim: true
  },
  vendor: {
    type: String,
    default: '',
    trim: true
  },
  price: {
    type: Number,
    default: 0
  },
  departmentID: {
    type: String,
    default: '',
    trim: true
  },
  invoiceFile: {
    filename: String,
    mimetype: String,
    size: Number,
    path: String
  },
  lastUpdate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  }
}, {
  timestamps: true
});

// Text index for search
itemSchema.index({ name: 'text', itemId: 'text', universityID: 'text', description: 'text', supplier: 'text' });
// Sort indexes required by Cosmos DB
itemSchema.index({ itemId: 1 });
itemSchema.index({ name: 1 });
itemSchema.index({ status: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ location: 1 });
itemSchema.index({ price: 1 });
itemSchema.index({ purchaseDate: 1 });
itemSchema.index({ warrantyEnd: 1 });
itemSchema.index({ lastUpdate: -1 });
itemSchema.index({ vendor: 1 });
itemSchema.index({ supplier: 1 });

module.exports = mongoose.model('Item', itemSchema);
