const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// POST /api/quizzes/:quizId/submit - Submit quiz answers
router.post('/', validateToken, allowRoles('admin', 'instructor'), quizController.createQuiz);
router.get('/:quizId', validateToken, quizController.getQuiz);
router.post('/:quizId/submit', validateToken, allowRoles('student'), quizController.submitQuiz);

module.exports = router;
