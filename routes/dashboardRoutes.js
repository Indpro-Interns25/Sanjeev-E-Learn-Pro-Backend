const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { validateToken } = require('../middleware/authMiddleware');

router.get('/stats', validateToken, dashboardController.getDashboardStats);
router.get('/my-learning', validateToken, dashboardController.getDashboardStats);
router.get('/activity', validateToken, dashboardController.getRecentActivity);
router.get('/course/:courseId/progress', validateToken, dashboardController.getCourseProgress);

module.exports = router;