const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { analyzeInvoice } = require('../controllers/invoiceImportController');

// POST /api/invoice-import/analyze
// Upload invoice file → Azure Document Intelligence analysis → normalized result
router.post(
  '/analyze',
  authenticate,
  authorize('admin', 'operator'),
  upload.single('invoiceFile'),
  analyzeInvoice
);

module.exports = router;
