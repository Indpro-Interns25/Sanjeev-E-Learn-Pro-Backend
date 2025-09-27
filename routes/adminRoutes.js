const express = require('express');
const router = express.Router();
const { validateToken } = require('../controllers/authController');
const adminController = require('../controllers/adminController');

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Admin access required' });
  }
};

// Apply authentication and admin check to all routes
router.use(validateToken);
router.use(requireAdmin);

// Dashboard & Analytics
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/courses', adminController.getCourseAnalytics);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);

// Course Management
router.get('/courses', adminController.getAllCourses);
router.post('/courses', adminController.createCourse);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);
router.patch('/courses/:id/approve', adminController.approveCourse);
router.patch('/courses/:id/reject', adminController.rejectCourse);
router.patch('/courses/:id/pricing', adminController.updateCoursePricing);

// Lesson Management
router.get('/lessons', adminController.getAllLessons);
router.post('/lessons', adminController.createLesson);
router.put('/lessons/:id', adminController.updateLesson);
router.delete('/lessons/:id', adminController.deleteLesson);
router.patch('/lessons/:id/approve', adminController.approveLesson);
router.post('/lessons/reorder', adminController.reorderLessons);

// Student Management
router.get('/students', adminController.getAllStudents);
router.patch('/students/:id/approve', adminController.approveStudent);
router.patch('/students/:id/reject', adminController.rejectStudent);
router.patch('/students/:id/suspend', adminController.suspendStudent);
router.patch('/students/:id/activate', adminController.activateStudent);
router.get('/students/:id/progress', adminController.getStudentProgress);

// Instructor Management
router.get('/instructors', adminController.getAllInstructors);
router.patch('/instructors/:id/approve', adminController.approveInstructor);
router.patch('/instructors/:id/reject', adminController.rejectInstructor);
router.patch('/instructors/:id/suspend', adminController.suspendInstructor);
router.patch('/instructors/:id/activate', adminController.activateInstructor);
router.get('/instructors/:id/profile', adminController.getInstructorProfile);

// Category Management
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// System Settings
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

// Support & Feedback
router.get('/feedback', adminController.getAllFeedback);
router.get('/contact-submissions', adminController.getContactSubmissions);
router.patch('/contact/:id/respond', adminController.respondToContact);
router.patch('/feedback/:id/respond', adminController.respondToFeedback);

// Notifications
router.get('/notifications', adminController.getAdminNotifications);
router.patch('/notifications/:id/read', adminController.markNotificationAsRead);

// Reports
router.get('/reports/enrollment', adminController.getEnrollmentReport);
router.get('/reports/completion', adminController.getCompletionReport);
router.get('/reports/activity', adminController.getActivityReport);

// Bulk Operations
router.post('/bulk/approve-users', adminController.bulkApproveUsers);
router.post('/bulk/reject-users', adminController.bulkRejectUsers);
router.get('/export/:type', adminController.exportData);

module.exports = router;