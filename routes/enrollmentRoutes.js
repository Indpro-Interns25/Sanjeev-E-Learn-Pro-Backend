const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');

router.post('/', enrollmentController.enroll);
router.post('/unenroll', enrollmentController.unenroll);
router.get('/users/:userId', enrollmentController.listUser);
router.get('/courses/:courseId', enrollmentController.listCourse);

module.exports = router;
