const fs = require('fs');
const azureDocIntelligence = require('../utils/azureDocIntelligence');
const invoiceNormalizer = require('../utils/invoiceNormalizer');
const ApiError = require('../utils/ApiError');

/**
 * POST /api/invoice-import/analyze
 * Upload an invoice file → Azure Document Intelligence → return normalized result
 */
const analyzeInvoice = async (req, res, next) => {
  try {
    if (!azureDocIntelligence.isConfigured()) {
      return next(ApiError.internal('Azure Document Intelligence is not configured on this server.'));
    }

    if (!req.file) {
      return next(ApiError.badRequest('No invoice file uploaded.'));
    }

    // Validate file type — Azure Document Intelligence supports JPEG, PNG, BMP, TIFF, PDF (NOT WebP)
    const allowed = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'application/pdf'];
    if (!allowed.includes(req.file.mimetype)) {
      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});
      return next(ApiError.badRequest('Unsupported file type. Azure Document Intelligence accepts JPEG, PNG, BMP, TIFF, and PDF. WebP is not supported.'));
    }

    // Read file into buffer
    const fileBuffer = fs.readFileSync(req.file.path);

    // Clean up temp file immediately
    fs.unlink(req.file.path, () => {});

    // Send to Azure
    const analyzeResult = await azureDocIntelligence.analyzeInvoice(fileBuffer);

    // Normalize to our schema
    const normalized = invoiceNormalizer.normalize(analyzeResult);

    res.status(200).json(normalized);
  } catch (error) {
    // Clean up file on error if it exists
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('Invoice analysis error:', error);
    next(ApiError.internal('Invoice analysis failed: ' + error.message));
  }
};

module.exports = { analyzeInvoice };
