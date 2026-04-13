const express = require('express');
const router = express.Router();
const finalTestController = require('../controllers/finalTestController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

router.get('/final/:courseId', validateToken, allowRoles('student', 'admin', 'instructor'), finalTestController.getFinalTestByCourse);
router.post('/final/submit', validateToken, allowRoles('student'), finalTestController.submitFinalTest);

module.exports = router;
