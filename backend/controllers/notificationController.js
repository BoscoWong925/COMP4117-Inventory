const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');

// GET /api/notifications — get notifications for the logged-in user
exports.getMyNotifications = catchAsync(async (req, res) => {
  const { page = 1, pageSize = 20, unreadOnly } = req.query;
  const filter = { recipientId: req.user.userId };
  if (unreadOnly === 'true') filter.isRead = false;

  const skip = (Number(page) - 1) * Number(pageSize);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipientId: req.user.userId, isRead: false })
  ]);

  res.json({ notifications, total, unreadCount });
});

// GET /api/notifications/unread-count — quick badge count
exports.getUnreadCount = catchAsync(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipientId: req.user.userId,
    isRead: false
  });
  res.json({ unreadCount });
});

// PUT /api/notifications/:id/read — mark single notification as read
exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.user.userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  res.json({ notification });
});

// PUT /api/notifications/read-all — mark all notifications as read
exports.markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { recipientId: req.user.userId, isRead: false },
    { isRead: true }
  );
  res.json({ success: true });
});
