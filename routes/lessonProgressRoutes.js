const express = require('express');
const router = express.Router();
const lessonProgressController = require('../controllers/lessonProgressController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// More specific routes MUST come first before generic :courseId/:lessonId routes

// POST /api/lesson-progress/update
// Update lesson progress
// Body: { userId, courseId, lessonId, progress }
router.post('/update', validateToken, lessonProgressController.updateProgress);

// GET /api/lesson-progress/user/:userId/course/:courseId
// Get progress for specific user (admin/instructor only)
router.get('/user/:userId/course/:courseId', validateToken, allowRoles('admin', 'instructor'), lessonProgressController.getUserCourseProgress);

// GET /api/lesson-progress/:courseId/:lessonId
// Get lesson progress for current user
router.get('/:courseId/:lessonId', validateToken, lessonProgressController.getProgress);

// GET /api/lesson-progress/:courseId
// Get all lesson progress for a course
router.get('/:courseId', validateToken, lessonProgressController.getCourseProgress);

module.exports = router;

