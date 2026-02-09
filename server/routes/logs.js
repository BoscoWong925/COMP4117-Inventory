import express from 'express';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// GET /api/logs - Get all logs
router.get('/', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 });
    res.json(logs.map(mapLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logs/user/:userId - Get logs by user
router.get('/user/:userId', async (req, res) => {
  try {
    const logs = await AuditLog.find({ userID: req.params.userId }).sort({ timestamp: -1 });
    res.json(logs.map(mapLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logs/item/:itemId - Get logs by item
router.get('/item/:itemId', async (req, res) => {
  try {
    const logs = await AuditLog.find({ affectedItemID: req.params.itemId }).sort({ timestamp: -1 });
    res.json(logs.map(mapLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logs/action/:action - Get logs by action type
router.get('/action/:action', async (req, res) => {
  try {
    const logs = await AuditLog.find({ action: req.params.action }).sort({ timestamp: -1 });
    res.json(logs.map(mapLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logs/since/:date - Get logs since date
router.get('/since/:date', async (req, res) => {
  try {
    const logs = await AuditLog.find({ timestamp: { $gte: new Date(req.params.date) } }).sort({ timestamp: -1 });
    res.json(logs.map(mapLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logs/export - Export logs with filters
router.get('/export', async (req, res) => {
  try {
    const filter = {};
    if (req.query.itemID) filter.affectedItemID = req.query.itemID;
    if (req.query.userID) filter.userID = req.query.userID;
    if (req.query.action) filter.action = req.query.action;

    const logs = await AuditLog.find(filter).sort({ timestamp: -1 });
    res.json(logs.map(mapLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to map log to frontend format
function mapLog(log) {
  return {
    id: log.logId,
    timestamp: log.timestamp.toISOString(),
    userID: log.userID,
    action: log.action,
    details: log.details,
    affectedItemID: log.affectedItemID,
    oldValue: log.oldValue,
    newValue: log.newValue
  };
}

export default router;
