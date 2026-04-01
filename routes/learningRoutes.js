const express = require('express');
const router = express.Router();
const learningController = require('../controllers/learningController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles, requireEnrollment } = require('../middleware/rbacMiddleware');
const { requireFields } = require('../middleware/validationMiddleware');

router.post('/courses/:courseId/enroll', validateToken, allowRoles('student'), learningController.enrollInCourse);
router.get('/courses/:courseId/lectures', validateToken, requireEnrollment, learningController.getCourseLectures);
router.post(
  '/lectures/:lectureId/progress',
  validateToken,
  requireFields(['watched_time']),
  learningController.saveLectureProgress
);
router.get('/courses/:courseId/completion', validateToken, requireEnrollment, learningController.getCourseCompletion);

module.exports = router;
