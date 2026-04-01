const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.list);
router.get('/stats', userController.getUserStats);
router.get('/enrolled-courses', userController.getEnrolledCourses);
router.get('/:id', userController.get);
router.post('/', userController.create);
router.delete('/:id', userController.remove);

module.exports = router;
