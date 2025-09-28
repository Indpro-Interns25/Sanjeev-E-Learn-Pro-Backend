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

module.exports = router;
