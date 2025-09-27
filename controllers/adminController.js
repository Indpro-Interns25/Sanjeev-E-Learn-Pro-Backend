const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

// Dashboard Statistics
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
      (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors,
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM lessons) as total_lessons,
      (SELECT COUNT(*) FROM enrollments) as total_enrollments,
      (SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'pending') as pending_students,
      (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND status = 'pending') as pending_instructors,
      (SELECT COUNT(*) FROM courses WHERE status = 'pending') as pending_courses
  `);

  const recentActivity = await pool.query(`
    SELECT 
      'user_registration' as type,
      name as title,
      email as description,
      created_at as timestamp
    FROM users 
    WHERE created_at > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 
      'course_creation' as type,
      title as title,
      'New course created' as description,
      created_at as timestamp
    FROM courses 
    WHERE created_at > NOW() - INTERVAL '7 days'
    ORDER BY timestamp DESC
    LIMIT 10
  `);

  res.json({
    success: true,
    data: {
      stats: stats.rows[0],
      recentActivity: recentActivity.rows
    }
  });
});

// User Analytics
exports.getUserAnalytics = asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query;
  
  let interval = '7 days';
  if (period === '30d') interval = '30 days';
  if (period === '90d') interval = '90 days';

  const analytics = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as registrations,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
      COUNT(CASE WHEN role = 'instructor' THEN 1 END) as instructors
    FROM users 
    WHERE created_at > NOW() - INTERVAL $1
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [interval]);

  res.json({
    success: true,
    data: analytics.rows
  });
});

// Course Analytics
exports.getCourseAnalytics = asyncHandler(async (req, res) => {
  const analytics = await pool.query(`
    SELECT 
      c.id,
      c.title,
      c.price,
      COUNT(e.id) as enrollment_count,
      AVG(CASE WHEN p.status = 'completed' THEN 1.0 ELSE 0.0 END) * 100 as completion_rate,
      c.created_at
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN progress p ON e.user_id = p.user_id AND p.lesson_id IN (
      SELECT id FROM lessons WHERE course_id = c.id
    )
    GROUP BY c.id, c.title, c.price, c.created_at
    ORDER BY enrollment_count DESC
  `);

  res.json({
    success: true,
    data: analytics.rows
  });
});

// Revenue Analytics (for future payment integration)
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
  // Placeholder for future payment integration
  res.json({
    success: true,
    data: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      revenueByMonth: [],
      topEarningCourses: []
    }
  });
});

// Course Management
exports.getAllCourses = asyncHandler(async (req, res) => {
  const { status, search, instructor_id } = req.query;
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (status) {
    params.push(status);
    whereClause += ` AND c.status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`;
  }

  if (instructor_id) {
    params.push(instructor_id);
    whereClause += ` AND c.instructor_id = $${params.length}`;
  }

  const courses = await pool.query(`
    SELECT 
      c.*,
      u.name as instructor_name,
      u.email as instructor_email,
      COUNT(e.id) as enrollment_count,
      COUNT(l.id) as lesson_count
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN lessons l ON c.id = l.course_id
    ${whereClause}
    GROUP BY c.id, u.name, u.email
    ORDER BY c.created_at DESC
  `, params);

  res.json({
    success: true,
    data: courses.rows
  });
});

exports.createCourse = asyncHandler(async (req, res) => {
  const { title, description, category, price, status = 'active', instructor_id } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const course = await pool.query(
    'INSERT INTO courses (title, description, category, price, status, instructor_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [title, description, category, price || 0, status, instructor_id]
  );

  res.status(201).json({
    success: true,
    data: course.rows[0],
    message: 'Course created successfully'
  });
});

exports.updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, category, price, status } = req.body;

  const course = await pool.query(
    'UPDATE courses SET title = $1, description = $2, category = $3, price = $4, status = $5 WHERE id = $6 RETURNING *',
    [title, description, category, price, status, id]
  );

  if (course.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json({
    success: true,
    data: course.rows[0],
    message: 'Course updated successfully'
  });
});

exports.deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if course exists
  const course = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
  if (course.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  await pool.query('DELETE FROM courses WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

exports.approveCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await pool.query(
    'UPDATE courses SET status = $1 WHERE id = $2 RETURNING *',
    ['approved', id]
  );

  if (course.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json({
    success: true,
    data: course.rows[0],
    message: 'Course approved successfully'
  });
});

exports.rejectCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const course = await pool.query(
    'UPDATE courses SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *',
    ['rejected', reason, id]
  );

  if (course.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json({
    success: true,
    data: course.rows[0],
    message: 'Course rejected successfully'
  });
});

exports.updateCoursePricing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { price, is_free } = req.body;

  const finalPrice = is_free ? 0 : price;

  const course = await pool.query(
    'UPDATE courses SET price = $1, is_free = $2 WHERE id = $3 RETURNING *',
    [finalPrice, is_free, id]
  );

  if (course.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json({
    success: true,
    data: course.rows[0],
    message: 'Course pricing updated successfully'
  });
});

// Lesson Management
exports.getAllLessons = asyncHandler(async (req, res) => {
  const { course_id, status } = req.query;
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (course_id) {
    params.push(course_id);
    whereClause += ` AND l.course_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    whereClause += ` AND l.status = $${params.length}`;
  }

  const lessons = await pool.query(`
    SELECT 
      l.*,
      c.title as course_title,
      u.name as instructor_name
    FROM lessons l
    JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON c.instructor_id = u.id
    ${whereClause}
    ORDER BY l.course_id, l.position, l.id
  `, params);

  res.json({
    success: true,
    data: lessons.rows
  });
});

exports.createLesson = asyncHandler(async (req, res) => {
  const { course_id, title, content, position, status = 'active' } = req.body;

  if (!course_id || !title) {
    return res.status(400).json({ error: 'Course ID and title are required' });
  }

  const lesson = await pool.query(
    'INSERT INTO lessons (course_id, title, content, position, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [course_id, title, content, position || 0, status]
  );

  res.status(201).json({
    success: true,
    data: lesson.rows[0],
    message: 'Lesson created successfully'
  });
});

exports.updateLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, position, status } = req.body;

  const lesson = await pool.query(
    'UPDATE lessons SET title = $1, content = $2, position = $3, status = $4 WHERE id = $5 RETURNING *',
    [title, content, position, status, id]
  );

  if (lesson.rows.length === 0) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  res.json({
    success: true,
    data: lesson.rows[0],
    message: 'Lesson updated successfully'
  });
});

exports.deleteLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lesson = await pool.query('SELECT * FROM lessons WHERE id = $1', [id]);
  if (lesson.rows.length === 0) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  await pool.query('DELETE FROM lessons WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Lesson deleted successfully'
  });
});

exports.approveLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lesson = await pool.query(
    'UPDATE lessons SET status = $1 WHERE id = $2 RETURNING *',
    ['approved', id]
  );

  if (lesson.rows.length === 0) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  res.json({
    success: true,
    data: lesson.rows[0],
    message: 'Lesson approved successfully'
  });
});

exports.reorderLessons = asyncHandler(async (req, res) => {
  const { course_id, lessons_order } = req.body;

  if (!course_id || !Array.isArray(lessons_order)) {
    return res.status(400).json({ error: 'Course ID and lessons order array are required' });
  }

  // Update lesson positions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < lessons_order.length; i++) {
      await client.query(
        'UPDATE lessons SET position = $1 WHERE id = $2 AND course_id = $3',
        [i + 1, lessons_order[i], course_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Lessons reordered successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Student Management
exports.getAllStudents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  let whereClause = "WHERE u.role = 'student'";
  const params = [];

  if (status) {
    params.push(status);
    whereClause += ` AND u.status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }

  const students = await pool.query(`
    SELECT 
      u.*,
      COUNT(e.id) as enrolled_courses,
      COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_lessons
    FROM users u
    LEFT JOIN enrollments e ON u.id = e.user_id
    LEFT JOIN progress p ON u.id = p.user_id AND p.status = 'completed'
    ${whereClause}
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `, params);

  res.json({
    success: true,
    data: students.rows
  });
});

exports.approveStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await pool.query(
    'UPDATE users SET status = $1 WHERE id = $2 AND role = $3 RETURNING *',
    ['active', id, 'student']
  );

  if (student.rows.length === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }

  res.json({
    success: true,
    data: student.rows[0],
    message: 'Student approved successfully'
  });
});

exports.rejectStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const student = await pool.query(
    'UPDATE users SET status = $1, rejection_reason = $2 WHERE id = $3 AND role = $4 RETURNING *',
    ['rejected', reason, id, 'student']
  );

  if (student.rows.length === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }

  res.json({
    success: true,
    data: student.rows[0],
    message: 'Student rejected successfully'
  });
});

exports.suspendStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const student = await pool.query(
    'UPDATE users SET status = $1, suspension_reason = $2 WHERE id = $3 AND role = $4 RETURNING *',
    ['suspended', reason, id, 'student']
  );

  if (student.rows.length === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }

  res.json({
    success: true,
    data: student.rows[0],
    message: 'Student suspended successfully'
  });
});

exports.activateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const student = await pool.query(
    'UPDATE users SET status = $1, suspension_reason = NULL WHERE id = $2 AND role = $3 RETURNING *',
    ['active', id, 'student']
  );

  if (student.rows.length === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }

  res.json({
    success: true,
    data: student.rows[0],
    message: 'Student activated successfully'
  });
});

exports.getStudentProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const progress = await pool.query(`
    SELECT 
      c.id as course_id,
      c.title as course_title,
      e.created_at as enrolled_date,
      COUNT(l.id) as total_lessons,
      COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_lessons,
      ROUND(
        (COUNT(CASE WHEN p.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(l.id), 0)), 2
      ) as completion_percentage
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN lessons l ON c.id = l.course_id
    LEFT JOIN progress p ON l.id = p.lesson_id AND p.user_id = e.user_id
    WHERE e.user_id = $1
    GROUP BY c.id, c.title, e.created_at
    ORDER BY e.created_at DESC
  `, [id]);

  res.json({
    success: true,
    data: progress.rows
  });
});

// Instructor Management
exports.getAllInstructors = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  let whereClause = "WHERE u.role = 'instructor'";
  const params = [];

  if (status) {
    params.push(status);
    whereClause += ` AND u.status = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }

  const instructors = await pool.query(`
    SELECT 
      u.*,
      COUNT(c.id) as total_courses,
      COUNT(e.id) as total_enrollments
    FROM users u
    LEFT JOIN courses c ON u.id = c.instructor_id
    LEFT JOIN enrollments e ON c.id = e.course_id
    ${whereClause}
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `, params);

  res.json({
    success: true,
    data: instructors.rows
  });
});

exports.approveInstructor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const instructor = await pool.query(
    'UPDATE users SET status = $1 WHERE id = $2 AND role = $3 RETURNING *',
    ['active', id, 'instructor']
  );

  if (instructor.rows.length === 0) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  res.json({
    success: true,
    data: instructor.rows[0],
    message: 'Instructor approved successfully'
  });
});

exports.rejectInstructor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const instructor = await pool.query(
    'UPDATE users SET status = $1, rejection_reason = $2 WHERE id = $3 AND role = $4 RETURNING *',
    ['rejected', reason, id, 'instructor']
  );

  if (instructor.rows.length === 0) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  res.json({
    success: true,
    data: instructor.rows[0],
    message: 'Instructor rejected successfully'
  });
});

exports.suspendInstructor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const instructor = await pool.query(
    'UPDATE users SET status = $1, suspension_reason = $2 WHERE id = $3 AND role = $4 RETURNING *',
    ['suspended', reason, id, 'instructor']
  );

  if (instructor.rows.length === 0) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  res.json({
    success: true,
    data: instructor.rows[0],
    message: 'Instructor suspended successfully'
  });
});

exports.activateInstructor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const instructor = await pool.query(
    'UPDATE users SET status = $1, suspension_reason = NULL WHERE id = $2 AND role = $3 RETURNING *',
    ['active', id, 'instructor']
  );

  if (instructor.rows.length === 0) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  res.json({
    success: true,
    data: instructor.rows[0],
    message: 'Instructor activated successfully'
  });
});

exports.getInstructorProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const instructor = await pool.query(`
    SELECT 
      u.*,
      COUNT(c.id) as total_courses,
      COUNT(e.id) as total_enrollments,
      AVG(c.price) as avg_course_price
    FROM users u
    LEFT JOIN courses c ON u.id = c.instructor_id
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE u.id = $1 AND u.role = 'instructor'
    GROUP BY u.id
  `, [id]);

  if (instructor.rows.length === 0) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  // Get instructor's courses
  const courses = await pool.query(`
    SELECT 
      c.*,
      COUNT(e.id) as enrollment_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.instructor_id = $1
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, [id]);

  res.json({
    success: true,
    data: {
      instructor: instructor.rows[0],
      courses: courses.rows
    }
  });
});

// Category Management
exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await pool.query(`
    SELECT 
      cat.*,
      COUNT(c.id) as course_count
    FROM categories cat
    LEFT JOIN courses c ON cat.id = c.category_id
    GROUP BY cat.id
    ORDER BY cat.name
  `);

  res.json({
    success: true,
    data: categories.rows
  });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const category = await pool.query(
    'INSERT INTO categories (name, description, icon) VALUES ($1, $2, $3) RETURNING *',
    [name, description, icon]
  );

  res.status(201).json({
    success: true,
    data: category.rows[0],
    message: 'Category created successfully'
  });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, icon } = req.body;

  const category = await pool.query(
    'UPDATE categories SET name = $1, description = $2, icon = $3 WHERE id = $4 RETURNING *',
    [name, description, icon, id]
  );

  if (category.rows.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  res.json({
    success: true,
    data: category.rows[0],
    message: 'Category updated successfully'
  });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if category has courses
  const coursesCount = await pool.query(
    'SELECT COUNT(*) as count FROM courses WHERE category_id = $1',
    [id]
  );

  if (parseInt(coursesCount.rows[0].count) > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete category with existing courses. Move courses to another category first.' 
    });
  }

  await pool.query('DELETE FROM categories WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
});

// System Settings
exports.getSystemSettings = asyncHandler(async (req, res) => {
  // Return default system settings (you can store these in database later)
  res.json({
    success: true,
    data: {
      siteName: 'EduLearn Pro',
      siteDescription: 'Professional Learning Management System',
      supportEmail: 'support@edulearnpro.com',
      allowSelfRegistration: true,
      requireEmailVerification: false,
      autoApproveStudents: true,
      autoApproveInstructors: false,
      maxFileUploadSize: '10MB',
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'avi']
    }
  });
});

exports.updateSystemSettings = asyncHandler(async (req, res) => {
  const settings = req.body;

  // For now, just return the updated settings
  // In a real app, you'd save these to database
  res.json({
    success: true,
    data: settings,
    message: 'System settings updated successfully'
  });
});

// Support & Feedback
exports.getAllFeedback = asyncHandler(async (req, res) => {
  const feedback = await pool.query(`
    SELECT 
      f.*,
      u.name as user_name,
      u.email as user_email
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at DESC
  `);

  res.json({
    success: true,
    data: feedback.rows
  });
});

exports.getContactSubmissions = asyncHandler(async (req, res) => {
  const submissions = await pool.query(`
    SELECT *
    FROM contact_submissions
    ORDER BY created_at DESC
  `);

  res.json({
    success: true,
    data: submissions.rows
  });
});

exports.respondToContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response, status = 'responded' } = req.body;

  const submission = await pool.query(
    'UPDATE contact_submissions SET response = $1, status = $2, responded_at = NOW() WHERE id = $3 RETURNING *',
    [response, status, id]
  );

  if (submission.rows.length === 0) {
    return res.status(404).json({ error: 'Contact submission not found' });
  }

  res.json({
    success: true,
    data: submission.rows[0],
    message: 'Response sent successfully'
  });
});

exports.respondToFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response, status = 'responded' } = req.body;

  const feedback = await pool.query(
    'UPDATE feedback SET admin_response = $1, status = $2, responded_at = NOW() WHERE id = $3 RETURNING *',
    [response, status, id]
  );

  if (feedback.rows.length === 0) {
    return res.status(404).json({ error: 'Feedback not found' });
  }

  res.json({
    success: true,
    data: feedback.rows[0],
    message: 'Response sent successfully'
  });
});

// Notifications
exports.getAdminNotifications = asyncHandler(async (req, res) => {
  const notifications = await pool.query(`
    SELECT *
    FROM admin_notifications
    ORDER BY created_at DESC
    LIMIT 50
  `);

  res.json({
    success: true,
    data: notifications.rows
  });
});

exports.markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await pool.query(
    'UPDATE admin_notifications SET is_read = true, read_at = NOW() WHERE id = $1',
    [id]
  );

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// Reports
exports.getEnrollmentReport = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  
  let interval = '30 days';
  if (period === '7d') interval = '7 days';
  if (period === '90d') interval = '90 days';

  const report = await pool.query(`
    SELECT 
      DATE(e.created_at) as date,
      COUNT(*) as enrollments,
      COUNT(DISTINCT e.user_id) as unique_students,
      COUNT(DISTINCT e.course_id) as courses_enrolled
    FROM enrollments e
    WHERE e.created_at > NOW() - INTERVAL $1
    GROUP BY DATE(e.created_at)
    ORDER BY date DESC
  `, [interval]);

  res.json({
    success: true,
    data: report.rows
  });
});

exports.getCompletionReport = asyncHandler(async (req, res) => {
  const report = await pool.query(`
    SELECT 
      c.id,
      c.title,
      COUNT(e.user_id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.user_id END) as completed_users,
      ROUND(
        (COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.user_id END) * 100.0 / 
         NULLIF(COUNT(e.user_id), 0)), 2
      ) as completion_rate
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN lessons l ON c.id = l.course_id
    LEFT JOIN progress p ON l.id = p.lesson_id AND p.user_id = e.user_id
    GROUP BY c.id, c.title
    HAVING COUNT(e.user_id) > 0
    ORDER BY completion_rate DESC
  `);

  res.json({
    success: true,
    data: report.rows
  });
});

exports.getActivityReport = asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query;
  
  let interval = '7 days';
  if (period === '30d') interval = '30 days';
  if (period === '90d') interval = '90 days';

  const report = await pool.query(`
    SELECT 
      DATE(created_at) as date,
      COUNT(DISTINCT user_id) as active_users
    FROM (
      SELECT user_id, created_at FROM enrollments WHERE created_at > NOW() - INTERVAL $1
      UNION ALL
      SELECT user_id, created_at FROM progress WHERE created_at > NOW() - INTERVAL $1
    ) as activity
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, [interval]);

  res.json({
    success: true,
    data: report.rows
  });
});

// Bulk Operations
exports.bulkApproveUsers = asyncHandler(async (req, res) => {
  const { user_ids, user_type } = req.body;

  if (!Array.isArray(user_ids) || !user_type) {
    return res.status(400).json({ error: 'User IDs array and user type are required' });
  }

  const result = await pool.query(
    'UPDATE users SET status = $1 WHERE id = ANY($2) AND role = $3 RETURNING id, email',
    ['active', user_ids, user_type]
  );

  res.json({
    success: true,
    data: result.rows,
    message: `${result.rows.length} ${user_type}s approved successfully`
  });
});

exports.bulkRejectUsers = asyncHandler(async (req, res) => {
  const { user_ids, user_type, reason } = req.body;

  if (!Array.isArray(user_ids) || !user_type) {
    return res.status(400).json({ error: 'User IDs array and user type are required' });
  }

  const result = await pool.query(
    'UPDATE users SET status = $1, rejection_reason = $2 WHERE id = ANY($3) AND role = $4 RETURNING id, email',
    ['rejected', reason, user_ids, user_type]
  );

  res.json({
    success: true,
    data: result.rows,
    message: `${result.rows.length} ${user_type}s rejected successfully`
  });
});

exports.exportData = asyncHandler(async (req, res) => {
  const { type } = req.params;

  // This would implement CSV/Excel export functionality
  // For now, just return the data structure
  let data = [];
  let filename = '';

  switch (type) {
    case 'students':
      const students = await pool.query('SELECT * FROM users WHERE role = $1', ['student']);
      data = students.rows;
      filename = 'students_export.csv';
      break;
    case 'instructors':
      const instructors = await pool.query('SELECT * FROM users WHERE role = $1', ['instructor']);
      data = instructors.rows;
      filename = 'instructors_export.csv';
      break;
    case 'courses':
      const courses = await pool.query('SELECT * FROM courses');
      data = courses.rows;
      filename = 'courses_export.csv';
      break;
    default:
      return res.status(400).json({ error: 'Invalid export type' });
  }

  res.json({
    success: true,
    data,
    filename,
    message: 'Data exported successfully'
  });
});

module.exports = exports;