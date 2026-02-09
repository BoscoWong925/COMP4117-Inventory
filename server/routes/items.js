import express from 'express';
import InventoryItem from '../models/InventoryItem.js';
import Counter from '../models/Counter.js';
import { authMiddleware, requireRole, createAuditLog } from '../middleware/index.js';

const router = express.Router();

// GET /api/items - Get all items
router.get('/', async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ createdAt: -1 });
    // Map to match frontend expected format
    const mapped = items.map(item => ({
      id: item.itemId,
      motherID: item.motherID,
      universityID: item.universityID,
      name: item.name,
      type: item.type,
      category: item.category,
      status: item.status,
      location: item.location,
      currentBorrower: item.currentBorrower,
      lastUpdate: item.lastUpdate,
      description: item.description,
      fixedComponents: item.fixedComponents,
      foRequestID: item.foRequestID,
      orderID: item.orderID,
      supplier: item.supplier,
      invoiceNumber: item.invoiceNumber,
      supplierStatus: item.supplierStatus,
      projectLinked: item.projectLinked,
      fundingSource: item.fundingSource,
      purchaseDate: item.purchaseDate,
      warrantyEnd: item.warrantyEnd,
      warrantyOnsite: item.warrantyOnsite,
      warrantyVendor: item.warrantyVendor,
      vendor: item.vendor,
      price: item.price
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/available - Get available items
router.get('/available', async (req, res) => {
  try {
    const items = await InventoryItem.find({ status: 'Available' });
    const mapped = items.map(mapItem);
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/lent-out - Get lent out items
router.get('/lent-out', async (req, res) => {
  try {
    const items = await InventoryItem.find({ status: 'In-use' });
    const mapped = items.map(mapItem);
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/search?q=query - Search items
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      const items = await InventoryItem.find();
      return res.json(items.map(mapItem));
    }

    const regex = new RegExp(q, 'i');
    const items = await InventoryItem.find({
      $or: [
        { itemId: regex },
        { name: regex },
        { universityID: regex },
        { supplier: regex }
      ]
    });
    res.json(items.map(mapItem));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/by-borrower/:borrowerId
router.get('/by-borrower/:borrowerId', async (req, res) => {
  try {
    const items = await InventoryItem.find({ currentBorrower: req.params.borrowerId });
    res.json(items.map(mapItem));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/by-vendor/:vendor
router.get('/by-vendor/:vendor', async (req, res) => {
  try {
    const items = await InventoryItem.find({ supplier: req.params.vendor });
    res.json(items.map(mapItem));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/:id - Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ itemId: req.params.id });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(mapItem(item));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/items/:motherID/components - Get components for mother item
router.get('/:motherID/components', async (req, res) => {
  try {
    const mother = await InventoryItem.findOne({ motherID: req.params.motherID });
    if (!mother || !mother.fixedComponents || mother.fixedComponents.length === 0) {
      return res.json([]);
    }
    const components = await InventoryItem.find({ itemId: { $in: mother.fixedComponents } });
    res.json(components.map(mapItem));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/items - Add new item (admin/operator)
router.post('/', authMiddleware, requireRole('admin', 'operator'), async (req, res) => {
  try {
    const seq = await Counter.getNextSequence('item');
    const itemId = `INV-${String(seq).padStart(3, '0')}`;

    const item = await InventoryItem.create({
      ...req.body,
      itemId,
      lastUpdate: new Date().toISOString().split('T')[0]
    });

    await createAuditLog(req.currentUser.id, 'ITEM_ADDED', `Added new item: ${req.body.name}`, itemId);
    res.status(201).json(mapItem(item));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/items/:id - Update item (admin/operator)
router.put('/:id', authMiddleware, requireRole('admin', 'operator'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ itemId: req.params.id });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const oldStatus = item.status;
    Object.assign(item, req.body);
    item.lastUpdate = new Date().toISOString().split('T')[0];
    await item.save();

    if (oldStatus !== req.body.status && req.body.status) {
      await createAuditLog(
        req.currentUser.id,
        'ITEM_STATUS_CHANGE',
        `Item status changed from ${oldStatus} to ${req.body.status}`,
        req.params.id,
        oldStatus,
        req.body.status
      );
    }

    res.json(mapItem(item));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/items/:id - Delete item (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ itemId: req.params.id });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await InventoryItem.deleteOne({ itemId: req.params.id });
    await createAuditLog(req.currentUser.id, 'ITEM_DELETED', `Deleted item: ${item.name}`, req.params.id);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to map MongoDB document to frontend format
function mapItem(item) {
  return {
    id: item.itemId,
    motherID: item.motherID,
    universityID: item.universityID,
    name: item.name,
    type: item.type,
    category: item.category,
    status: item.status,
    location: item.location,
    currentBorrower: item.currentBorrower,
    lastUpdate: item.lastUpdate,
    description: item.description,
    fixedComponents: item.fixedComponents,
    foRequestID: item.foRequestID,
    orderID: item.orderID,
    supplier: item.supplier,
    invoiceNumber: item.invoiceNumber,
    supplierStatus: item.supplierStatus,
    projectLinked: item.projectLinked,
    fundingSource: item.fundingSource,
    purchaseDate: item.purchaseDate,
    warrantyEnd: item.warrantyEnd,
    warrantyOnsite: item.warrantyOnsite,
    warrantyVendor: item.warrantyVendor,
    vendor: item.vendor,
    price: item.price
  };
}

export default router;
