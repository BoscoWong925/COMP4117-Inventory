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
router.get('/teacher-pending', borrowRequestController.getTeacherPendingRequests);
router.get('/teacher-history', borrowRequestController.getTeacherRequestHistory);
router.post('/auto-expire', authorize('admin', 'operator'), borrowRequestController.autoExpirePendingCheckouts);

// Admin/operator: get all requests
router.get('/', authorize('admin', 'operator'), borrowRequestController.getAllRequests);

// Any authenticated user can create request (teacher and student)
router.post('/', upload.array('attachments', 10), borrowRequestController.createRequest);

// Parameterized routes
router.get('/:id', borrowRequestController.getRequestById);
router.put('/:id/approve', borrowRequestController.approveRequest);
router.put('/:id/reject', borrowRequestController.rejectRequest);
router.put('/:id/checkout', borrowRequestController.checkoutRequest);
router.put('/:id/deny', borrowRequestController.denyCheckout);
router.put('/:id/declare-return', borrowRequestController.declareReturnDate);
router.put('/:id/return', borrowRequestController.returnRequest);
router.post('/:id/attachments', upload.array('attachments', 10), borrowRequestController.uploadAttachments);

module.exports = router;
