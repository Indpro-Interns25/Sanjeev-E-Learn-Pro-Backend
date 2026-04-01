const express = require('express');
const router = express.Router();
const quizSystemController = require('../controllers/quizSystemController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles, requireEnrollment } = require('../middleware/rbacMiddleware');

router.post('/:courseId/create', validateToken, allowRoles('instructor', 'admin'), quizSystemController.createQuiz);
router.get('/:courseId', validateToken, requireEnrollment, quizSystemController.getQuizByCourse);
router.post('/:courseId/submit', validateToken, requireEnrollment, allowRoles('student'), quizSystemController.submitQuiz);
router.get('/result/:courseId', validateToken, requireEnrollment, quizSystemController.getUserResult);

module.exports = router;
