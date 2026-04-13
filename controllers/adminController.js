const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { formatDurationForDB, formatDurationForForm } = require('../utils/durationHelper');

// Helper to check whether a column exists on a table (used to support older DBs)
async function columnExists(tableName, columnName) {
  const q = `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`;
  const r = await pool.query(q, [tableName, columnName]);
  return r.rows.length > 0;
}

function normalizeCoursePricing(course) {
  if (!course) return course;
  const { price, is_free, ...rest } = course;
  return {
    ...rest,
    isFree: true
  };
}

// Dashboard Statistics
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
      (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors,
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM lessons) as total_lessons,
      (
        WITH synced_students AS (
          UPDATE users u
          SET enrolled_courses = COALESCE(
            (
              SELECT ARRAY_AGG(DISTINCT e.course_id ORDER BY e.course_id)
              FROM enrollments e
              WHERE e.user_id = u.id AND e.is_active = true
            ),
            '{}'::integer[]
          )
          WHERE u.role = 'student'
            AND COALESCE(array_length(u.enrolled_courses, 1), 0) = 0
          RETURNING 1
        )
        SELECT COALESCE(SUM(COALESCE(array_length(enrolled_courses, 1), 0)), 0)::int
        FROM users
      ) as total_enrollments,
      (SELECT COUNT(*) FROM users WHERE role = 'student') as pending_students,
      (SELECT COUNT(*) FROM users WHERE role = 'instructor') as pending_instructors,
      (SELECT COUNT(*) FROM courses) as pending_courses
  `);

  const recentActivity = await pool.query(`
    (SELECT 
      'user_registration' as type,
      name as title,
      email as description,
      CURRENT_TIMESTAMP as timestamp
    FROM users 
    ORDER BY id DESC
    LIMIT 5)
    UNION ALL
    (SELECT 
      'course_creation' as type,
      title as title,
      'New course created' as description,
      CURRENT_TIMESTAMP as timestamp
    FROM courses 
    ORDER BY id DESC
    LIMIT 5)
    ORDER BY timestamp DESC
    LIMIT 10
  `);

  res.json({
    success: true,
    data: {
      totalCourses: stats.rows[0]?.total_courses || 0,
      totalStudents: stats.rows[0]?.total_students || 0,
      totalInstructors: stats.rows[0]?.total_instructors || 0,
      totalEnrollments: stats.rows[0]?.total_enrollments || 0,
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
      COUNT(e.id) as enrollment_count,
      COALESCE(AVG(CASE WHEN lp.is_completed = true THEN 1.0 ELSE 0.0 END) * 100, 0) as completion_rate
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN progress lp ON e.user_id = lp.user_id AND lp.lesson_id IN (
      SELECT id FROM lessons WHERE course_id = c.id
    )
    GROUP BY c.id, c.title
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
    ORDER BY c.id DESC
  `, params);

  res.json({
    success: true,
    data: courses.rows.map(normalizeCoursePricing)
  });
});

exports.getCourseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID parameter
  const courseId = parseInt(id);
  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid course ID. Please provide a valid numeric ID.' 
    });
  }

  console.log(`🔍 Getting course by ID: ${courseId}`);

  const course = await pool.query(`
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
    WHERE c.id = $1
    GROUP BY c.id, u.name, u.email
  `, [courseId]);

  if (course.rows.length === 0) {
    console.log(`❌ Course not found with ID: ${courseId}`);
    return res.status(404).json({ 
      success: false,
      error: `Course with ID ${courseId} not found` 
    });
  }

  console.log(`✅ Course found: ${course.rows[0].title}`);
  res.json({
    success: true,
    data: normalizeCoursePricing(course.rows[0])
  });
});

exports.createCourse = asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    category, 
    level,
    duration,
    status = 'published', 
    instructor_id,
    thumbnail,
    preview_video
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  // Validate and normalize level
  const validLevels = ['beginner', 'intermediate', 'advanced'];
  const normalizedLevel = level ? level.toLowerCase() : 'beginner';
  if (!validLevels.includes(normalizedLevel)) {
    return res.status(400).json({ 
      error: 'Invalid level', 
      message: 'Level must be one of: beginner, intermediate, advanced' 
    });
  }

  // Validate and normalize status
  const validStatuses = ['draft', 'published', 'archived'];
  const normalizedStatus = status ? status.toLowerCase() : 'published';
  if (!validStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ 
      error: 'Invalid status', 
      message: 'Status must be one of: draft, published, archived' 
    });
  }

  // Set default values for required fields
  const courseData = {
    title,
    description: description || 'No description provided',
    instructor_id: instructor_id || 1,
    category: category || 'General',
    level: normalizedLevel,
    duration: duration || '4 weeks',
    status: normalizedStatus,
    thumbnail: thumbnail || null,
    preview_video: preview_video || null,
    is_free: true
  };

  const course = await pool.query(
    'INSERT INTO courses (title, description, instructor_id, category, level, duration, status, thumbnail, preview_video, is_free) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
    [
      courseData.title,
      courseData.description,
      courseData.instructor_id,
      courseData.category,
      courseData.level,
      courseData.duration,
      courseData.status,
      courseData.thumbnail,
      courseData.preview_video,
      true
    ]
  );

  res.status(201).json({
    success: true,
    data: normalizeCoursePricing(course.rows[0]),
    message: 'Course created successfully'
  });
});

exports.updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    description, 
    category, 
    level, 
    duration, 
    status, 
    instructor_id, 
    thumbnail, 
    preview_video, 
    is_featured 
  } = req.body;

  // Validate ID parameter
  const courseId = parseInt(id);
  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid course ID. Please provide a valid numeric ID.' 
    });
  }

  // Build dynamic update query based on provided fields
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (category !== undefined) {
    updates.push(`category = $${paramCount++}`);
    values.push(category);
  }
  if (level !== undefined) {
    updates.push(`level = $${paramCount++}`);
    values.push(level);
  }
  if (duration !== undefined) {
    updates.push(`duration = $${paramCount++}`);
    values.push(duration);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
  }
  if (instructor_id !== undefined) {
    updates.push(`instructor_id = $${paramCount++}`);
    values.push(instructor_id);
  }
  if (thumbnail !== undefined) {
    updates.push(`thumbnail = $${paramCount++}`);
    values.push(thumbnail);
  }
  if (preview_video !== undefined) {
    updates.push(`preview_video = $${paramCount++}`);
    values.push(preview_video);
  }
  if (is_featured !== undefined) {
    updates.push(`is_featured = $${paramCount++}`);
    values.push(is_featured);
  }

  updates.push(`is_free = true`);

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No fields provided for update'
    });
  }

  // Always update the updated_at timestamp
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(courseId);

  const query = `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  const course = await pool.query(query, values);

  if (course.rows.length === 0) {
    console.log(`❌ Course not found for update with ID: ${courseId}`);
    return res.status(404).json({ 
      success: false,
      error: `Course with ID ${courseId} not found` 
    });
  }

  console.log(`✅ Course updated successfully: ${course.rows[0].title}`);
  res.json({
    success: true,
    data: normalizeCoursePricing(course.rows[0]),
    message: 'Course updated successfully'
  });
});

exports.deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID parameter
  const courseId = parseInt(id);
  if (isNaN(courseId) || courseId <= 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid course ID. Please provide a valid numeric ID.' 
    });
  }

  console.log(`🗑️ Deleting course ID: ${courseId}`);

  // Check if course exists
  const course = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (course.rows.length === 0) {
    console.log(`❌ Course not found for deletion with ID: ${courseId}`);
    return res.status(404).json({ 
      success: false,
      error: `Course with ID ${courseId} not found` 
    });
  }

  await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);

  console.log(`✅ Course deleted successfully: ${course.rows[0].title}`);
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
  const course = await pool.query(
    'UPDATE courses SET is_free = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
    [id]
  );

  if (course.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json({
    success: true,
    data: normalizeCoursePricing(course.rows[0]),
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
    ORDER BY l.course_id, l.order_index, l.id
  `, params);

  // Format durations for frontend display
  const formattedLessons = lessons.rows.map(lesson => ({
    ...lesson,
    duration_number: formatDurationForForm(lesson.duration), // Add numeric duration for forms
    duration_display: lesson.duration // Keep original for display
  }));

  res.json({
    success: true,
    data: formattedLessons
  });
});

exports.createLesson = asyncHandler(async (req, res) => {
  const { course_id, title, content, order_index, duration, video_url, description } = req.body;

  if (!course_id || !title) {
    return res.status(400).json({ error: 'Course ID and title are required' });
  }

  // Map description to content if content is not provided
  const finalContent = content || description || '';

  // Normalize duration to consistent format
  const normalizedDuration = formatDurationForDB(duration) || '30 minutes';

  const lesson = await pool.query(
    'INSERT INTO lessons (course_id, title, content, order_index, duration, video_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [course_id, title, finalContent, order_index || 1, normalizedDuration, video_url]
  );

  // Format response with both duration formats
  const responseData = {
    ...lesson.rows[0],
    duration_number: formatDurationForForm(lesson.rows[0].duration),
    duration_display: lesson.rows[0].duration
  };

  res.status(201).json({
    success: true,
    data: responseData,
    message: 'Lesson created successfully'
  });
});

exports.updateLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, order_index, duration, video_url, description, course_id } = req.body;

  // Map description to content if content is not provided
  const finalContent = content || description;

  // Normalize duration to consistent format
  const normalizedDuration = duration ? formatDurationForDB(duration) : duration;

  const lesson = await pool.query(
    'UPDATE lessons SET title = COALESCE($1, title), content = COALESCE($2, content), order_index = COALESCE($3, order_index), duration = COALESCE($4, duration), video_url = COALESCE($5, video_url), course_id = COALESCE($6, course_id), updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
    [title, finalContent, order_index, normalizedDuration, video_url, course_id, id]
  );

  if (lesson.rows.length === 0) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  // Format response with both duration formats
  const responseData = {
    ...lesson.rows[0],
    duration_number: formatDurationForForm(lesson.rows[0].duration),
    duration_display: lesson.rows[0].duration
  };

  res.json({
    success: true,
    data: responseData,
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

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }

  if (status) {
    params.push(status.toLowerCase());
    whereClause += ` AND COALESCE(u.status, 'active') = $${params.length}`;
  }

  const students = await pool.query(`
    SELECT 
      u.id,
      u.name,
      u.email,
      COALESCE(u.status, 'active') as status,
      COALESCE(
        ARRAY_AGG(DISTINCT e.course_id ORDER BY e.course_id) FILTER (WHERE e.course_id IS NOT NULL),
        '{}'::integer[]
      ) as "enrolledCourses"
    FROM users u
    LEFT JOIN enrollments e ON u.id = e.user_id AND e.is_active = true
    ${whereClause}
    GROUP BY u.id, u.name, u.email, u.status
    ORDER BY u.id DESC
  `, params);

  res.json({
    success: true,
    data: students.rows
  });
});

exports.approveStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Ensure schema supports status column
  if (!(await columnExists('users', 'status'))) {
    return res.status(500).json({ error: 'Database schema missing `users.status` column. Please run migrations: node scripts/admin-migrate.js' });
  }

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

// Delete a student (admin)
exports.deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const studentId = parseInt(id, 10);
  if (isNaN(studentId) || studentId <= 0) {
    return res.status(400).json({ error: 'Invalid student ID' });
  }

  const existing = await pool.query('SELECT id, name FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }

  await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);

  res.json({ success: true, message: `Student deleted successfully (${existing.rows[0].name})` });
});

exports.toggleStudentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const studentId = parseInt(id, 10);

  if (isNaN(studentId) || studentId <= 0) {
    return res.status(400).json({ error: 'Invalid student ID' });
  }

  const existing = await pool.query(
    'SELECT id, name, email, COALESCE(status, \'active\') AS status FROM users WHERE id = $1 AND role = $2',
    [studentId, 'student']
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }

  let nextStatus = existing.rows[0].status === 'blocked' ? 'active' : 'blocked';
  if (status !== undefined) {
    const normalized = String(status).toLowerCase();
    if (!['active', 'blocked'].includes(normalized)) {
      return res.status(400).json({ error: 'status must be active or blocked' });
    }
    nextStatus = normalized;
  }

  const updated = await pool.query(
    'UPDATE users SET status = $1 WHERE id = $2 AND role = $3 RETURNING id, name, email, status',
    [nextStatus, studentId, 'student']
  );

  res.json({
    success: true,
    data: updated.rows[0],
    message: `Student ${nextStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`
  });
});

exports.assignCourseToStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { courseId } = req.body;
  const studentId = parseInt(id, 10);
  const parsedCourseId = parseInt(courseId, 10);

  if (isNaN(studentId) || studentId <= 0) {
    return res.status(400).json({ error: 'Invalid student ID' });
  }

  if (isNaN(parsedCourseId) || parsedCourseId <= 0) {
    return res.status(400).json({ error: 'Valid courseId is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const student = await client.query(
      'SELECT id, name, email, COALESCE(status, \'active\') AS status, enrolled_courses FROM users WHERE id = $1 AND role = $2 FOR UPDATE',
      [studentId, 'student']
    );

    if (student.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found' });
    }

    const course = await client.query('SELECT id, title FROM courses WHERE id = $1', [parsedCourseId]);
    if (course.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Course not found' });
    }

    await client.query(
      `INSERT INTO enrollments (user_id, course_id, is_active, enrolled_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET is_active = true`,
      [studentId, parsedCourseId]
    );

    const updatedStudent = await client.query(
      `UPDATE users
       SET enrolled_courses = CASE
         WHEN enrolled_courses IS NULL THEN ARRAY[$2]::integer[]
         WHEN NOT ($2 = ANY(enrolled_courses)) THEN array_append(enrolled_courses, $2)
         ELSE enrolled_courses
       END
       WHERE id = $1 AND role = $3
       RETURNING id, name, email, COALESCE(status, 'active') AS status, enrolled_courses`,
      [studentId, parsedCourseId, 'student']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        student: updatedStudent.rows[0],
        course: course.rows[0]
      },
      message: 'Course assigned successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

exports.rejectStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!(await columnExists('users', 'status'))) {
    return res.status(500).json({ error: 'Database schema missing `users.status` column. Please run migrations: node scripts/admin-migrate.js' });
  }

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

  if (!(await columnExists('users', 'status'))) {
    return res.status(500).json({ error: 'Database schema missing `users.status` column. Please run migrations: node scripts/admin-migrate.js' });
  }

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

  if (!(await columnExists('users', 'status'))) {
    return res.status(500).json({ error: 'Database schema missing `users.status` column. Please run migrations: node scripts/admin-migrate.js' });
  }

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
      e.enrolled_at as enrolled_date,
      e.progress as course_progress,
      COUNT(cl.id) as total_lessons,
      COUNT(CASE WHEN lp.is_completed = true THEN 1 END) as completed_lessons,
      CASE 
        WHEN COUNT(cl.id) > 0 THEN 
          ROUND((COUNT(CASE WHEN lp.is_completed = true THEN 1 END)::decimal / COUNT(cl.id)) * 100, 2)
        ELSE 0 
      END as completion_percentage
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN lessons cl ON c.id = cl.course_id
    LEFT JOIN progress lp ON cl.id = lp.lesson_id AND lp.user_id = e.user_id
    WHERE e.user_id = $1
    GROUP BY c.id, c.title, e.enrolled_at, e.progress
    ORDER BY e.enrolled_at DESC
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
    ORDER BY u.id DESC
  `, params);

  res.json({
    success: true,
    data: instructors.rows
  });
});

exports.createInstructor = asyncHandler(async (req, res) => {
  const { name, email, password, status = 'pending' } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Name, email, and password are required' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid email format' 
    });
  }

  try {
    // Check if email already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new instructor (only using existing columns)
    const newInstructor = await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, 'instructor')
      RETURNING id, name, email, role
    `, [name, email, hashedPassword]);

    console.log(`✅ Instructor created successfully: ${name} (${email})`);

    res.status(201).json({
      success: true,
      data: newInstructor.rows[0],
      message: 'Instructor created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating instructor:', error.message);
    
    if (error.code === '23505') { // PostgreSQL unique violation error
      return res.status(409).json({ 
        success: false,
        error: 'Email already exists' 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to create instructor',
      message: error.message 
    });
  }
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
      COUNT(e.id) as total_enrollments
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
    ORDER BY c.id DESC
  `, [id]);

  res.json({
    success: true,
    data: {
      instructor: instructor.rows[0],
      courses: courses.rows
    }
  });
});

// Delete an instructor (admin)
exports.deleteInstructor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instructorId = parseInt(id, 10);
  if (isNaN(instructorId) || instructorId <= 0) {
    return res.status(400).json({ error: 'Invalid instructor ID' });
  }

  // Ensure the user exists and is an instructor
  const existing = await pool.query('SELECT id, name, email FROM users WHERE id = $1 AND role = $2', [instructorId, 'instructor']);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  // Prevent deleting instructors that still have published courses
  const courses = await pool.query('SELECT id, title FROM courses WHERE instructor_id = $1', [instructorId]);
  if (courses.rows.length > 0) {
    return res.status(400).json({ error: 'Cannot delete instructor with existing courses. Reassign or delete courses first.' });
  }

  await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [instructorId, 'instructor']);

  res.json({ success: true, message: `Instructor deleted successfully (${existing.rows[0].name})` });
});

// Public: list all instructors (no auth)
exports.getPublicInstructors = asyncHandler(async (req, res) => {
  const instructors = await pool.query(`
    SELECT id, name, email, role, created_at
    FROM users
    WHERE role = 'instructor'
    ORDER BY id DESC
  `);

  res.json({ success: true, data: instructors.rows });
});

// Public: get instructor profile by id (no auth)
exports.getPublicInstructorProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instructor = await pool.query(`
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = $1 AND role = 'instructor'
  `, [id]);

  if (instructor.rows.length === 0) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  const courses = await pool.query(`
    SELECT c.*,
      COUNT(e.id) as enrollment_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    WHERE c.instructor_id = $1
    GROUP BY c.id
    ORDER BY c.id DESC
  `, [id]);

  res.json({ success: true, data: { instructor: instructor.rows[0], courses: courses.rows } });
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
      DATE(e.enrolled_at) as date,
      COUNT(*) as enrollments,
      COUNT(DISTINCT e.user_id) as unique_students,
      COUNT(DISTINCT e.course_id) as courses_enrolled
    FROM enrollments e
    WHERE e.enrolled_at IS NOT NULL
    GROUP BY DATE(e.enrolled_at)
    ORDER BY date DESC
    LIMIT 30
  `, []);

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
        (COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN lp.user_id END) * 100.0 / 
         NULLIF(COUNT(e.user_id), 0)), 2
      ) as completion_rate
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN lessons l ON c.id = l.course_id
    LEFT JOIN progress lp ON l.id = lp.lesson_id AND lp.user_id = e.user_id
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
      DATE(enrolled_at) as date,
      COUNT(DISTINCT user_id) as active_users
    FROM enrollments 
    WHERE enrolled_at IS NOT NULL
    GROUP BY DATE(enrolled_at)
    ORDER BY date DESC
    LIMIT 30
  `, []);

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

  if (!(await columnExists('users', 'status'))) {
    return res.status(500).json({ error: 'Database schema missing `users.status` column. Please run migrations: node scripts/admin-migrate.js' });
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

  if (!(await columnExists('users', 'status'))) {
    return res.status(500).json({ error: 'Database schema missing `users.status` column. Please run migrations: node scripts/admin-migrate.js' });
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

// Analytics: Enrollment trends
exports.getAnalyticsEnrollments = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  let interval = '30 days';
  if (period === '7d') interval = '7 days';
  if (period === '90d') interval = '90 days';

  const result = await pool.query(`
    SELECT
      DATE(enrolled_at) as date,
      COUNT(*) as enrollments,
      COUNT(DISTINCT user_id) as unique_students,
      COUNT(DISTINCT course_id) as unique_courses
    FROM enrollments
    WHERE enrolled_at >= NOW() - INTERVAL '${interval}'
    GROUP BY DATE(enrolled_at)
    ORDER BY date DESC
  `);

  res.json({ success: true, data: result.rows });
});

// Analytics: Top performing courses
exports.getTopCourses = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const result = await pool.query(`
    SELECT
      c.id,
      c.title,
      c.category,
      COUNT(DISTINCT e.id) as enrollment_count,
      COUNT(DISTINCT l.id) as lesson_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN lessons l ON c.id = l.course_id
    GROUP BY c.id, c.title, c.category
    ORDER BY enrollment_count DESC
    LIMIT $1
  `, [limit]);

  res.json({ success: true, data: result.rows });
});

// Analytics: Users by role
exports.getUsersByRole = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT role, COUNT(*) as count
    FROM users
    GROUP BY role
    ORDER BY count DESC
  `);

  res.json({ success: true, data: result.rows });
});

// Report: Course performance
exports.getCourseReports = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT
      c.id,
      c.title,
      c.category,
      c.level,
      COUNT(DISTINCT e.id) as total_enrollments,
      COUNT(DISTINCT l.id) as total_lessons,
      ROUND(
        COALESCE(
          (COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN lp.user_id END) * 100.0 /
           NULLIF(COUNT(DISTINCT e.user_id), 0)), 0
        ), 2
      ) as avg_completion_rate
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN lessons l ON c.id = l.course_id
    LEFT JOIN progress lp ON l.id = lp.lesson_id
    GROUP BY c.id, c.title, c.category, c.level
    ORDER BY total_enrollments DESC
  `);

  res.json({ success: true, data: result.rows });
});

// Report: User engagement
exports.getUserReports = asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at,
      COUNT(DISTINCT e.course_id) as enrolled_courses,
      COUNT(DISTINCT CASE WHEN lp.is_completed = true THEN lp.id END) as completed_lessons
    FROM users u
    LEFT JOIN enrollments e ON u.id = e.user_id
    LEFT JOIN progress lp ON u.id = lp.user_id
    WHERE u.role = 'student'
    GROUP BY u.id, u.name, u.email, u.role, u.created_at
    ORDER BY enrolled_courses DESC
    LIMIT 100
  `);

  res.json({ success: true, data: result.rows });
});

module.exports = exports;