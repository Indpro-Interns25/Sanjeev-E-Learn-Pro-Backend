const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

router.get('/', validateToken, allowRoles('admin'), userController.list);
router.get('/stats', validateToken, userController.getUserStats);
router.get('/enrolled-courses', validateToken, userController.getEnrolledCourses);
router.get('/:id', validateToken, userController.get);
router.post('/', validateToken, allowRoles('admin'), userController.create);
router.delete('/:id', validateToken, userController.remove);

module.exports = router;
