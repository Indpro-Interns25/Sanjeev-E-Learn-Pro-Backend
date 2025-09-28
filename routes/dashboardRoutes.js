const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Dashboard statistics endpoint
router.get('/stats', dashboardController.getDashboardStats);
router.get('/stats/:userId', dashboardController.getDashboardStats);

// Recent activity endpoint
router.get('/activity', dashboardController.getRecentActivity);
router.get('/activity/:userId', dashboardController.getRecentActivity);

// Course progress details
router.get('/course/:courseId/progress', dashboardController.getCourseProgress);

module.exports = router;