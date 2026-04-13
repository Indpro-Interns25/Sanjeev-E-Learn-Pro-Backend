const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// Protected routes (JWT required)

// POST /api/progress/complete
// Mark a lecture as completed
// Body: { courseId, lectureId }
router.post('/complete', validateToken, progressController.markLectureComplete);

// POST /api/progress/watch
// Save watch time for a lecture
// Body: { courseId, lectureId, watchedTime }
router.post('/watch', validateToken, progressController.saveWatchTime);

// Specific numeric patterns must come BEFORE generic :courseId patterns
// GET /api/progress/:userId/course/:courseId
// Get progress for a specific user and course (admin/instructor only)
router.get('/:userId/course/:courseId', validateToken, allowRoles('admin', 'instructor'), progressController.getUserCourseProgress);

// GET /api/progress/user/:userId/course/:courseId - Alternative pattern with explicit 'user' prefix
router.get('/user/:userId/course/:courseId', validateToken, allowRoles('admin', 'instructor'), progressController.getUserCourseProgress);

// GET /api/progress/:courseId
// Get course progress percentage for current user
router.get('/:courseId', validateToken, progressController.getCourseProgressPercentage);

// GET /api/progress/:courseId/details
// Get detailed progress information for a course
router.get('/:courseId/details', validateToken, progressController.getCourseProgressDetails);

// Admin routes (could add additional isAdmin middleware if needed)
router.get('/', validateToken, progressController.getAllProgress);
router.get('/records/:id', validateToken, allowRoles('admin'), progressController.getProgressById);
router.delete('/records/:id', validateToken, allowRoles('admin'), progressController.deleteProgress);

module.exports = router;
