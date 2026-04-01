const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

router.get('/', validateToken, allowRoles('admin'), analyticsController.getPlatformAnalytics);

module.exports = router;
