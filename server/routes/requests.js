import express from 'express';
import BorrowRequest from '../models/BorrowRequest.js';
import InventoryItem from '../models/InventoryItem.js';
import Counter from '../models/Counter.js';
import { authMiddleware, requireRole, createAuditLog } from '../middleware/index.js';

const router = express.Router();

// GET /api/requests - Get all requests
router.get('/', async (req, res) => {
  try {
    const requests = await BorrowRequest.find().sort({ createdAt: -1 });
    res.json(requests.map(mapRequest));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/requests/pending - Get pending requests
router.get('/pending', async (req, res) => {
  try {
    const requests = await BorrowRequest.find({ status: 'Pending' });
    res.json(requests.map(mapRequest));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/requests/user/:userId - Get requests for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const requests = await BorrowRequest.find({ borrowerID: req.params.userId });
    res.json(requests.map(mapRequest));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/requests/:id - Get single request
router.get('/:id', async (req, res) => {
  try {
    const request = await BorrowRequest.findOne({ requestId: req.params.id });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(mapRequest(request));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests - Create a new borrow request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { itemID, borrowerID, reason } = req.body;

    // Check if item exists and is available
    const item = await InventoryItem.findOne({ itemId: itemID });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if (item.status !== 'Available') {
      return res.status(400).json({ error: 'Item is not available for borrowing' });
    }

    const seq = await Counter.getNextSequence('request');
    const requestId = `REQ-${String(seq).padStart(3, '0')}`;

    const request = await BorrowRequest.create({
      requestId,
      itemID,
      borrowerID: borrowerID || req.currentUser.id,
      reason,
      requestDate: new Date().toISOString().split('T')[0]
    });

    await createAuditLog(req.currentUser.id, 'BORROW_REQUEST_CREATED', `Request created for item ${itemID}`, itemID);
    res.status(201).json(mapRequest(request));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/requests/:id/approve - Approve a request (admin/operator)
router.put('/:id/approve', authMiddleware, requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { returnDate } = req.body;
    const request = await BorrowRequest.findOne({ requestId: req.params.id });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'Approved';
    request.approvalDate = new Date().toISOString().split('T')[0];
    request.approvedBy = req.currentUser.id;
    request.returnDate = returnDate;
    await request.save();

    // Update item status
    const item = await InventoryItem.findOne({ itemId: request.itemID });
    if (item) {
      item.status = 'In-use';
      item.currentBorrower = request.borrowerID;
      item.lastUpdate = new Date().toISOString().split('T')[0];
      await item.save();

      // If mother item, also mark components as in-use
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        await InventoryItem.updateMany(
          { itemId: { $in: item.fixedComponents } },
          {
            status: 'In-use',
            currentBorrower: request.borrowerID,
            lastUpdate: new Date().toISOString().split('T')[0]
          }
        );
      }
    }

    await createAuditLog(req.currentUser.id, 'BORROW_REQUEST_APPROVED', 'Request approved', request.itemID);
    res.json(mapRequest(request));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/requests/:id/reject - Reject a request (admin/operator)
router.put('/:id/reject', authMiddleware, requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await BorrowRequest.findOne({ requestId: req.params.id });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'Rejected';
    request.notes = reason || '';
    await request.save();

    await createAuditLog(req.currentUser.id, 'BORROW_REQUEST_REJECTED', `Request rejected: ${reason}`, request.itemID);
    res.json(mapRequest(request));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/requests/:id/return - Return an item
router.put('/:id/return', authMiddleware, async (req, res) => {
  try {
    const request = await BorrowRequest.findOne({ requestId: req.params.id });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'Returned';
    request.returnedDate = new Date().toISOString().split('T')[0];
    await request.save();

    // Update item status
    const item = await InventoryItem.findOne({ itemId: request.itemID });
    if (item) {
      item.status = 'Available';
      item.currentBorrower = null;
      item.lastUpdate = new Date().toISOString().split('T')[0];
      await item.save();

      // If mother item, also mark components as available
      if (item.fixedComponents && item.fixedComponents.length > 0) {
        await InventoryItem.updateMany(
          { itemId: { $in: item.fixedComponents } },
          {
            status: 'Available',
            currentBorrower: null,
            lastUpdate: new Date().toISOString().split('T')[0]
          }
        );
      }
    }

    await createAuditLog(req.currentUser.id, 'ITEM_RETURNED', 'Item returned', request.itemID);
    res.json(mapRequest(request));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to map MongoDB document to frontend format
function mapRequest(req) {
  return {
    id: req.requestId,
    itemID: req.itemID,
    borrowerID: req.borrowerID,
    status: req.status,
    requestDate: req.requestDate,
    approvalDate: req.approvalDate,
    approvedBy: req.approvedBy,
    returnDate: req.returnDate,
    returnedDate: req.returnedDate,
    reason: req.reason,
    notes: req.notes
  };
}

export default router;
