const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const lessonController = require('../controllers/lessonController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// Course CRUD operations
router.get('/', validateToken, courseController.list);
router.get('/:id', validateToken, courseController.get);
router.post('/', validateToken, allowRoles('admin', 'instructor'), courseController.create);
router.put('/:id', validateToken, allowRoles('admin', 'instructor'), courseController.update);
router.delete('/:id', validateToken, allowRoles('admin'), courseController.remove);

// Course curriculum (lessons) endpoints
router.get('/:courseId/lessons', validateToken, lessonController.listByCourse);
router.post('/:courseId/lessons', validateToken, allowRoles('admin', 'instructor'), lessonController.create);
router.get('/:courseId/lessons/:lessonId', validateToken, lessonController.getLessonById);
router.get('/:courseId/curriculum', validateToken, lessonController.getCurriculum);

// Alias route for lectures (frontend uses both /lessons and /lectures)
router.get('/:courseId/lectures', validateToken, lessonController.listByCourse);
router.get('/:courseId/lectures/:lectureId', validateToken, lessonController.getLessonById);

// Lesson comments
router.post('/:courseId/lessons/:lessonId/comments', validateToken, courseController.addLessonComment);

// Course comments
router.get('/:courseId/comments', validateToken, courseController.getCourseComments);
router.post('/:courseId/comments', validateToken, courseController.addCourseComment);

// Course quiz
router.get('/:courseId/quiz', validateToken, courseController.getCourseQuiz);

// Video progress
router.get('/:courseId/video-progress/:userId', validateToken, courseController.getVideoProgress);

module.exports = router;
