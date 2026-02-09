import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true
  },
  motherID: {
    type: String,
    default: null
  },
  universityID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Hardware', 'Software', 'Component'],
    required: true
  },
  category: {
    type: String,
    enum: ['Computer', 'Display', 'Memory', 'Storage', 'Peripherals', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred'],
    default: 'Available'
  },
  location: {
    type: String,
    required: true
  },
  currentBorrower: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  fixedComponents: [{
    type: String
  }],
  // Procurement fields
  foRequestID: {
    type: String,
    default: null
  },
  orderID: {
    type: String,
    default: null
  },
  supplier: {
    type: String,
    default: null
  },
  invoiceNumber: {
    type: String,
    default: null
  },
  supplierStatus: {
    type: String,
    default: null
  },
  projectLinked: {
    type: String,
    default: null
  },
  fundingSource: {
    type: String,
    default: null
  },
  purchaseDate: {
    type: String,
    default: null
  },
  warrantyEnd: {
    type: String,
    default: null
  },
  warrantyOnsite: {
    type: Boolean,
    default: false
  },
  warrantyVendor: {
    type: String,
    default: null
  },
  vendor: {
    type: String,
    default: null
  },
  price: {
    type: Number,
    default: 0
  },
  lastUpdate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  }
}, {
  timestamps: true
});

// Text index for search
inventoryItemSchema.index({ name: 'text', itemId: 'text', universityID: 'text', supplier: 'text' });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

export default InventoryItem;
