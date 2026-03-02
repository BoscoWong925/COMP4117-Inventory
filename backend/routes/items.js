const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Routes that must be defined BEFORE /:id to avoid conflicts
router.get('/available', itemController.getAvailableItems);
router.get('/lent-out', authorize('admin', 'operator'), itemController.getLentOutItems);
router.post('/import', authorize('admin', 'operator'), upload.single('file'), itemController.importItems);

// CRUD routes
router.get('/', authorize('admin', 'operator'), itemController.getAllItems);
router.post('/', authorize('admin', 'operator'), upload.single('invoiceFile'), itemController.createItem);

// Parameterized routes
router.get('/:id', itemController.getItemById);
router.get('/:id/components', itemController.getItemComponents);
router.get('/:id/invoice', authorize('admin', 'operator'), itemController.getInvoice);
router.put('/:id', authorize('admin', 'operator'), upload.single('invoiceFile'), itemController.updateItem);
router.delete('/:id', authorize('admin', 'operator'), itemController.deleteItem);

module.exports = router;
