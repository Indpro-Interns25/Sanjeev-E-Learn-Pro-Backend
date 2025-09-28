const express = require('express');
const router = express.Router();
const { validateToken, login } = require('../controllers/authController');
const adminController = require('../controllers/adminController');

// Admin login endpoint (same as regular login but with admin role check)
router.post('/login', async (req, res) => {
  try {
    // Use the regular login controller
    await login(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Admin access required' });
  }
};

// Apply authentication and admin check to protected routes only
const protectedRoutes = express.Router();
protectedRoutes.use(validateToken);
protectedRoutes.use(requireAdmin);

// Dashboard & Analytics
protectedRoutes.get('/dashboard/stats', adminController.getDashboardStats);
protectedRoutes.get('/stats', adminController.getDashboardStats); // Add shorthand route
protectedRoutes.get('/analytics/users', adminController.getUserAnalytics);
protectedRoutes.get('/analytics/courses', adminController.getCourseAnalytics);
protectedRoutes.get('/analytics/revenue', adminController.getRevenueAnalytics);

// Course Management
protectedRoutes.get('/courses', adminController.getAllCourses);
protectedRoutes.post('/courses', adminController.createCourse);
protectedRoutes.put('/courses/:id', adminController.updateCourse);
protectedRoutes.delete('/courses/:id', adminController.deleteCourse);
protectedRoutes.patch('/courses/:id/approve', adminController.approveCourse);
protectedRoutes.patch('/courses/:id/reject', adminController.rejectCourse);
protectedRoutes.patch('/courses/:id/pricing', adminController.updateCoursePricing);

// Lesson Management
protectedRoutes.get('/lessons', adminController.getAllLessons);
protectedRoutes.post('/lessons', adminController.createLesson);
protectedRoutes.put('/lessons/:id', adminController.updateLesson);
protectedRoutes.delete('/lessons/:id', adminController.deleteLesson);
protectedRoutes.patch('/lessons/:id/approve', adminController.approveLesson);
protectedRoutes.post('/lessons/reorder', adminController.reorderLessons);

// Student Management
protectedRoutes.get('/students', adminController.getAllStudents);
protectedRoutes.patch('/students/:id/approve', adminController.approveStudent);
protectedRoutes.patch('/students/:id/reject', adminController.rejectStudent);
protectedRoutes.patch('/students/:id/suspend', adminController.suspendStudent);
protectedRoutes.patch('/students/:id/activate', adminController.activateStudent);
protectedRoutes.get('/students/:id/progress', adminController.getStudentProgress);

// Instructor Management
protectedRoutes.get('/instructors', adminController.getAllInstructors);
protectedRoutes.patch('/instructors/:id/approve', adminController.approveInstructor);
protectedRoutes.patch('/instructors/:id/reject', adminController.rejectInstructor);
protectedRoutes.patch('/instructors/:id/suspend', adminController.suspendInstructor);
protectedRoutes.patch('/instructors/:id/activate', adminController.activateInstructor);
protectedRoutes.get('/instructors/:id/profile', adminController.getInstructorProfile);

// Category Management
protectedRoutes.get('/categories', adminController.getAllCategories);
protectedRoutes.post('/categories', adminController.createCategory);
protectedRoutes.put('/categories/:id', adminController.updateCategory);
protectedRoutes.delete('/categories/:id', adminController.deleteCategory);

// System Settings
protectedRoutes.get('/settings', adminController.getSystemSettings);
protectedRoutes.put('/settings', adminController.updateSystemSettings);

// Support & Feedback
protectedRoutes.get('/feedback', adminController.getAllFeedback);
protectedRoutes.get('/contact-submissions', adminController.getContactSubmissions);
protectedRoutes.patch('/contact/:id/respond', adminController.respondToContact);
protectedRoutes.patch('/feedback/:id/respond', adminController.respondToFeedback);

// Notifications
protectedRoutes.get('/notifications', adminController.getAdminNotifications);
protectedRoutes.patch('/notifications/:id/read', adminController.markNotificationAsRead);

// Reports
protectedRoutes.get('/reports/enrollment', adminController.getEnrollmentReport);
protectedRoutes.get('/reports/completion', adminController.getCompletionReport);
protectedRoutes.get('/reports/activity', adminController.getActivityReport);

// Bulk Operations
protectedRoutes.post('/bulk/approve-users', adminController.bulkApproveUsers);
protectedRoutes.post('/bulk/reject-users', adminController.bulkRejectUsers);
protectedRoutes.get('/export/:type', adminController.exportData);

// Mount protected routes
router.use('/', protectedRoutes);

// Public testing routes (remove in production)
router.get('/stats', adminController.getDashboardStats);
router.get('/courses', adminController.getAllCourses);
router.get('/lessons', adminController.getAllLessons);
router.get('/students', adminController.getAllStudents);
router.get('/students/:id/progress', adminController.getStudentProgress);
router.post('/students/:id/approve', adminController.approveStudent);
router.post('/students/:id/reject', adminController.rejectStudent);
router.post('/students/:id/suspend', adminController.suspendStudent);
router.post('/students/:id/activate', adminController.activateStudent);

module.exports = router;