const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

router.get('/me', validateToken, notificationController.listMyNotifications);
router.patch('/:id/read', validateToken, notificationController.markAsRead);
router.post('/', validateToken, allowRoles('admin', 'instructor'), notificationController.createNotification);

module.exports = router;
