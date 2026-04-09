const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// List all enrollments (admin)
router.get('/', validateToken, allowRoles('admin', 'instructor'), enrollmentController.listAll);

router.post('/', validateToken, enrollmentController.enroll);
router.post('/unenroll', validateToken, enrollmentController.unenroll);
router.get('/users/:userId', validateToken, enrollmentController.listUser);
router.get('/courses/:courseId', validateToken, allowRoles('admin', 'instructor'), enrollmentController.listCourse);

module.exports = router;
