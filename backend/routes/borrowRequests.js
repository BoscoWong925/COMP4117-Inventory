const express = require('express');
const router = express.Router();
const borrowRequestController = require('../controllers/borrowRequestController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Static routes (defined before parameterized routes)
router.get('/pending', authorize('admin', 'operator'), borrowRequestController.getPendingRequests);
router.get('/my', borrowRequestController.getMyRequests);

// Admin/operator: get all requests
router.get('/', authorize('admin', 'operator'), borrowRequestController.getAllRequests);

// User: create request (with optional file attachments)
router.post('/', authorize('user'), upload.array('attachments', 10), borrowRequestController.createRequest);

// Parameterized routes
router.get('/:id', borrowRequestController.getRequestById);
router.put('/:id/approve', authorize('admin', 'operator'), borrowRequestController.approveRequest);
router.put('/:id/reject', authorize('admin', 'operator'), borrowRequestController.rejectRequest);
router.put('/:id/declare-return', borrowRequestController.declareReturnDate);
router.put('/:id/return', borrowRequestController.returnRequest);
router.post('/:id/attachments', upload.array('attachments', 10), borrowRequestController.uploadAttachments);

module.exports = router;
