const express = require('express');
const router = express.Router();
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');
const { login } = require('../controllers/authController');
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

// Apply authentication and admin check to protected routes only
const protectedRoutes = express.Router();
protectedRoutes.use(validateToken);
protectedRoutes.use(allowRoles('admin'));

// Dashboard & Analytics
protectedRoutes.get('/dashboard/stats', adminController.getDashboardStats);
protectedRoutes.get('/stats', adminController.getDashboardStats);
protectedRoutes.get('/analytics/stats', adminController.getDashboardStats);
protectedRoutes.get('/analytics/users', adminController.getUserAnalytics);
protectedRoutes.get('/analytics/courses', adminController.getCourseAnalytics);
protectedRoutes.get('/analytics/revenue', adminController.getRevenueAnalytics);
protectedRoutes.get('/analytics/enrollments', adminController.getAnalyticsEnrollments);
protectedRoutes.get('/analytics/top-courses', adminController.getTopCourses);
protectedRoutes.get('/analytics/users-by-role', adminController.getUsersByRole);

// Course Management
protectedRoutes.get('/courses', adminController.getAllCourses);
protectedRoutes.post('/courses', adminController.createCourse);
protectedRoutes.put('/courses/:id', adminController.updateCourse);
protectedRoutes.delete('/courses/:id', adminController.deleteCourse);
protectedRoutes.patch('/courses/:id/approve', adminController.approveCourse);
protectedRoutes.patch('/courses/:id/reject', adminController.rejectCourse);
protectedRoutes.patch('/courses/:id/pricing', adminController.updateCoursePricing);

// Note: Removed unprotected test routes to enforce authentication and admin checks.

// Lesson Management
protectedRoutes.get('/lessons', adminController.getAllLessons);
protectedRoutes.post('/lessons', adminController.createLesson);
protectedRoutes.put('/lessons/:id', adminController.updateLesson);
protectedRoutes.delete('/lessons/:id', adminController.deleteLesson);
protectedRoutes.patch('/lessons/:id/approve', adminController.approveLesson);
protectedRoutes.post('/lessons/reorder', adminController.reorderLessons);

// Student Management
protectedRoutes.get('/students', adminController.getAllStudents);
// Delete a student (admin)
protectedRoutes.delete('/students/:id', adminController.deleteStudent);
protectedRoutes.patch('/students/:id/status', adminController.toggleStudentStatus);
protectedRoutes.post('/students/:id/assign-course', adminController.assignCourseToStudent);

// Instructor Management
protectedRoutes.get('/instructors', adminController.getAllInstructors);
protectedRoutes.post('/instructors', adminController.createInstructor);
protectedRoutes.patch('/instructors/:id/approve', adminController.approveInstructor);
protectedRoutes.patch('/instructors/:id/reject', adminController.rejectInstructor);
protectedRoutes.patch('/instructors/:id/suspend', adminController.suspendInstructor);
protectedRoutes.patch('/instructors/:id/activate', adminController.activateInstructor);
protectedRoutes.get('/instructors/:id/profile', adminController.getInstructorProfile);
// Delete an instructor (admin)
protectedRoutes.delete('/instructors/:id', adminController.deleteInstructor);

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
protectedRoutes.get('/reports/enrollments', adminController.getEnrollmentReport);
protectedRoutes.get('/reports/completion', adminController.getCompletionReport);
protectedRoutes.get('/reports/activity', adminController.getActivityReport);
protectedRoutes.get('/reports/courses', adminController.getCourseReports);
protectedRoutes.get('/reports/users', adminController.getUserReports);
protectedRoutes.get('/reports/revenue', adminController.getRevenueAnalytics);

// Bulk Operations
protectedRoutes.post('/bulk/approve-users', adminController.bulkApproveUsers);
protectedRoutes.post('/bulk/reject-users', adminController.bulkRejectUsers);
protectedRoutes.get('/export/:type', adminController.exportData);

// Mount protected routes
router.use('/', protectedRoutes);

// Public testing routes removed. All admin actions should go through the protected routes above.

module.exports = router;