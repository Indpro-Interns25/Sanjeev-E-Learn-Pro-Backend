const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// Get all lessons endpoint
router.get('/', validateToken, lessonController.getAllLessons);

// Create lesson (accepts course_id in body or use route param when nested under /courses/:courseId/lessons)
router.post('/', validateToken, allowRoles('admin', 'instructor'), lessonController.create);

// Direct lesson access endpoints
router.get('/:id', validateToken, lessonController.getLessonById);
router.put('/:id', validateToken, allowRoles('admin', 'instructor'), lessonController.updateLesson);
router.delete('/:id', validateToken, allowRoles('admin', 'instructor'), lessonController.remove);

// Lesson comments
router.get('/:lessonId/comments', validateToken, lessonController.getLessonComments);
router.post('/:lessonId/comments', validateToken, lessonController.addLessonComment);

module.exports = router;
