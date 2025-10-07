const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const healthController = require('../controllers/healthController');

// Route modules
const userRoutes = require('./userRoutes');
const courseRoutes = require('./courseRoutes');
const lessonRoutes = require('./lessonRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const progressRoutes = require('./progressRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const { validateToken } = require('../controllers/authController');
const adminController = require('../controllers/adminController');

// Middleware to require admin role for inline aliases
const requireAdmin = (req, res, next) => {
	if (req.user && req.user.role === 'admin') return next();
	return res.status(403).json({ error: 'Admin access required' });
};

router.get('/', homeController.index);
router.get('/health', healthController.health);

router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/lessons', lessonRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/progress', progressRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/dashboard', dashboardRoutes);

// Accept common frontend path variants for student edit/delete and forward to admin handlers
router.put('/students/:id', validateToken, requireAdmin, adminController.updateStudent);
router.delete('/students/:id', validateToken, requireAdmin, adminController.deleteStudent);
router.put('/student/:id', validateToken, requireAdmin, adminController.updateStudent);
router.delete('/student/:id', validateToken, requireAdmin, adminController.deleteStudent);

// Protected aliases so frontend can call common top-level paths with admin token
router.get('/instructors', validateToken, requireAdmin, adminController.getAllInstructors);
router.get('/instructors/:id', validateToken, requireAdmin, adminController.getInstructorProfile);
router.get('/students', validateToken, requireAdmin, adminController.getAllStudents);

// Public instructor endpoints (no auth)
const adminPublicController = require('../controllers/adminController');
router.get('/public/instructors', adminPublicController.getPublicInstructors);
router.get('/public/instructors/:id', adminPublicController.getPublicInstructorProfile);

module.exports = router;
