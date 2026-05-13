const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// List enrollments. Admins/instructors receive their management view; students receive their own enrollments.
router.get('/', validateToken, enrollmentController.listAll);

router.post('/', validateToken, enrollmentController.enroll);
router.post('/unenroll', validateToken, enrollmentController.unenroll);
router.get('/users/:userId', validateToken, enrollmentController.listUser);
router.get('/courses/:courseId', validateToken, allowRoles('admin', 'instructor'), enrollmentController.listCourse);

module.exports = router;
