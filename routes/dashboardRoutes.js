const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { validateToken } = require('../controllers/authController');

// Optional authentication middleware - tries to get user but doesn't block if missing
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Attach decoded token data
    } catch (error) {
      // Token invalid, but continue anyway
      console.log('Optional auth: Token invalid, continuing without user');
    }
  }
  next();
};

// Dashboard statistics endpoint - open access with optional auth
router.get('/stats', optionalAuth, dashboardController.getDashboardStats);
router.get('/stats/:userId', dashboardController.getDashboardStats);

// My Learning endpoint - open access with optional auth for current user
router.get('/my-learning', optionalAuth, dashboardController.getDashboardStats);
router.get('/my-learning/:userId', dashboardController.getDashboardStats);

// Recent activity endpoint
router.get('/activity', optionalAuth, dashboardController.getRecentActivity);
router.get('/activity/:userId', dashboardController.getRecentActivity);

// Course progress details
router.get('/course/:courseId/progress', optionalAuth, dashboardController.getCourseProgress);

module.exports = router;