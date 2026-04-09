const Course = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
}

async function syncCourseTags(courseId, tags) {
  const normalizedTags = normalizeTags(tags);

  await pool.query('DELETE FROM course_tags WHERE course_id = $1', [courseId]);
  if (normalizedTags.length === 0) return;

  for (const tagName of normalizedTags) {
    const upsertTag = await pool.query(
      `INSERT INTO tags (name)
       VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tagName]
    );

    await pool.query(
      `INSERT INTO course_tags (course_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT (course_id, tag_id) DO NOTHING`,
      [courseId, upsertTag.rows[0].id]
    );
  }
}

async function attachTags(courses) {
  if (!courses || courses.length === 0) return courses;
  const ids = courses.map((course) => course.id);
  const result = await pool.query(
    `SELECT ct.course_id, t.name
     FROM course_tags ct
     JOIN tags t ON t.id = ct.tag_id
     WHERE ct.course_id = ANY($1::int[])
     ORDER BY t.name ASC`,
    [ids]
  );

  const grouped = new Map();
  for (const row of result.rows) {
    if (!grouped.has(row.course_id)) grouped.set(row.course_id, []);
    grouped.get(row.course_id).push(row.name);
  }

  return courses.map((course) => ({
    ...course,
    tags: grouped.get(course.id) || []
  }));
}

async function canAccessCourse(user, courseId) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'instructor') {
    const owned = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, user.id]);
    return owned.rows.length > 0;
  }

  const enrolled = await pool.query(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
    [user.id, courseId]
  );

  return enrolled.rows.length > 0;
}

function normalizeCoursePricing(course) {
  if (!course) return course;
  const { price, is_free, ...rest } = course;
  return {
    ...rest,
    isFree: true
  };
}

exports.list = asyncHandler(async (req, res) => {
  const { featured, sortBy, sortOrder, title, search, category, level, tag } = req.query;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
  const offset = (page - 1) * limit;
  
  let query = 'SELECT id, title, description, instructor_id, category, level, duration, status, thumbnail, preview_video, created_at, updated_at FROM courses';
  let countQuery = 'SELECT COUNT(*)::int AS total FROM courses';
  const queryParams = [];
  const conditions = [];
  
  // Handle featured filter
  if (featured === 'true') {
    conditions.push('is_featured = $' + (queryParams.length + 1));
    queryParams.push(true);
  }

  const searchText = search || title;
  if (searchText) {
    conditions.push('(title ILIKE $' + (queryParams.length + 1) + ' OR description ILIKE $' + (queryParams.length + 1) + ')');
    queryParams.push(`%${searchText.trim()}%`);
  }

  if (category) {
    conditions.push('category ILIKE $' + (queryParams.length + 1));
    queryParams.push(category.trim());
  }

  if (level) {
    conditions.push('level ILIKE $' + (queryParams.length + 1));
    queryParams.push(level.trim());
  }

  if (tag) {
    conditions.push(`id IN (
      SELECT ct.course_id
      FROM course_tags ct
      JOIN tags t ON t.id = ct.tag_id
      WHERE t.name = $${queryParams.length + 1}
    )`);
    queryParams.push(String(tag).trim().toLowerCase());
  }

  if (req.user.role === 'instructor') {
    conditions.push('instructor_id = $' + (queryParams.length + 1));
    queryParams.push(req.user.id);
  }

  if (req.user.role === 'student') {
    conditions.push(`id IN (
      SELECT course_id
      FROM enrollments
      WHERE user_id = $${queryParams.length + 1} AND is_active = true
    )`);
    queryParams.push(req.user.id);
  }
  
  // Add WHERE clause if there are conditions
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  // Handle sorting
  if (sortBy) {
    const validSortFields = ['rating', 'created_at', 'title', 'enrolled_count'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy)) {
      const order = validSortOrders.includes(sortOrder?.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';
      query += ` ORDER BY ${sortBy} ${order}`;
    }
  } else {
    query += ' ORDER BY id';
  }
  
  query += ' LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
  queryParams.push(limit, offset);
  
  const courses = await Course.findAllWithQuery(query, queryParams);
  const coursesWithTags = await attachTags(courses);
  const freeCourses = coursesWithTags.map(normalizeCoursePricing);
  const countResult = await Course.findAllWithQuery(countQuery, queryParams.slice(0, queryParams.length - 2));

  res.json({
    success: true,
    data: freeCourses,
    pagination: {
      page,
      limit,
      total: countResult[0]?.total || 0,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
    }
  });
});

exports.get = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.id, 10);
  const allowed = await canAccessCourse(req.user, courseId);
  if (!allowed) return res.status(403).json({ error: 'Forbidden: course not accessible for this user' });

  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const [payload] = await attachTags([course]);
  res.json(normalizeCoursePricing(payload));
});

exports.create = asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    category,
    level,
    duration,
    instructor_id,
    thumbnail,
    preview_video,
    status = 'published',
    tags
  } = req.body;
  
  if (!title) return res.status(400).json({ error: 'title required' });
  
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
    instructor_id: req.user.role === 'admin' ? (instructor_id || req.user.id) : req.user.id,
    category: category || 'General',
    level: normalizedLevel,
    duration: duration || '4 weeks',
    status: normalizedStatus,
    thumbnail: thumbnail || null,
    preview_video: preview_video || null,
    is_free: true
  };

  const created = await Course.create(courseData);
  await syncCourseTags(created.id, tags || []);
  const [payload] = await attachTags([created]);
  res.status(201).json(normalizeCoursePricing(payload));
});

exports.update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
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
    is_featured,
    tags
  } = req.body;
  
  const existing = await Course.findById(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  if (req.user.role === 'instructor' && existing.instructor_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: not owner of this course' });
  }
  
  // Validate level if provided
  if (level) {
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    const normalizedLevel = level.toLowerCase();
    if (!validLevels.includes(normalizedLevel)) {
      return res.status(400).json({ 
        error: 'Invalid level', 
        message: 'Level must be one of: beginner, intermediate, advanced' 
      });
    }
  }

  // Validate status if provided
  if (status) {
    const validStatuses = ['draft', 'published', 'archived'];
    const normalizedStatus = status.toLowerCase();
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        message: 'Status must be one of: draft, published, archived' 
      });
    }
  }

  // Use direct database query to handle all fields with COALESCE
  const updated = await pool.query(`
    UPDATE courses SET 
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      level = COALESCE($4, level),
      duration = COALESCE($5, duration),
      status = COALESCE($6, status),
      instructor_id = COALESCE($7, instructor_id),
      thumbnail = COALESCE($8, thumbnail),
      preview_video = COALESCE($9, preview_video),
      is_featured = COALESCE($10, is_featured),
      is_free = true,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $11 
    RETURNING *`,
    [title, description, category, level, duration, status, instructor_id, thumbnail, preview_video, is_featured, id]
  );

  if (updated.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (tags !== undefined) {
    await syncCourseTags(id, tags);
  }

  const [payload] = await attachTags([updated.rows[0]]);
  res.json(normalizeCoursePricing(payload));
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await Course.findById(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  if (req.user.role !== 'admin' && existing.instructor_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: not owner of this course' });
  }

  await Course.remove(id);
  res.status(204).send();
});

// GET /api/courses/:courseId/comments
exports.getCourseComments = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const allowed = await canAccessCourse(req.user, courseId);
  if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden: course not accessible' });

  const result = await pool.query(`
    SELECT c.*, u.name as author_name, u.email as author_email
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.course_id = $1 AND c.lesson_id IS NULL
    ORDER BY c.created_at DESC
  `, [courseId]);
  res.json({ success: true, data: result.rows });
});

// POST /api/courses/:courseId/comments
exports.addCourseComment = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const allowed = await canAccessCourse(req.user, courseId);
  if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden: course not accessible' });

  const user_id = req.user.id;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const result = await pool.query(
    'INSERT INTO comments (course_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
    [courseId, user_id, content]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// POST /api/courses/:courseId/lessons/:lessonId/comments
exports.addLessonComment = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const allowed = await canAccessCourse(req.user, courseId);
  if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden: course not accessible' });

  const lessonId = parseInt(req.params.lessonId, 10);
  const user_id = req.user.id;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  const result = await pool.query(
    'INSERT INTO comments (course_id, lesson_id, user_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
    [courseId, lessonId, user_id, content]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// GET /api/courses/:courseId/quiz
exports.getCourseQuiz = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const allowed = await canAccessCourse(req.user, courseId);
  if (!allowed) return res.status(403).json({ success: false, message: 'Forbidden: course not accessible' });

  const quiz = await pool.query(
    'SELECT * FROM quizzes WHERE course_id = $1 LIMIT 1',
    [courseId]
  );
  if (quiz.rows.length === 0) return res.status(404).json({ error: 'No quiz found for this course' });
  const questions = await pool.query(
    'SELECT id, question, options FROM quiz_questions WHERE quiz_id = $1 ORDER BY id',
    [quiz.rows[0].id]
  );
  res.json({ success: true, data: { ...quiz.rows[0], questions: questions.rows } });
});

// GET /api/courses/:courseId/video-progress/:userId
// Get video progress for a user in a specific course
exports.getVideoProgress = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const userId = parseInt(req.params.userId, 10);
  const requesterId = req.user.id;
  const requesterRole = req.user.role;

  if (isNaN(courseId) || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid courseId or userId'
    });
  }

  // Verify course exists
  const courseCheck = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (courseCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }

  if (requesterRole === 'student' && requesterId !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Students can only access their own progress'
    });
  }

  const allowed = await canAccessCourse(req.user, courseId);
  if (!allowed) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: course not accessible'
    });
  }

  // Get video progress data for the user in this course
  const result = await pool.query(`
    SELECT 
      l.id as lecture_id,
      l.title as lecture_title,
      l.order_index,
      COALESCE(up.completed, false) as completed,
      COALESCE(up.watched_time, 0) as watched_time,
      up.completed_at,
      up.updated_at
    FROM lessons l
    LEFT JOIN user_progress up ON l.id = up.lecture_id AND up.user_id = $1 AND up.course_id = $2
    WHERE l.course_id = $2
    ORDER BY l.order_index ASC, l.id ASC
  `, [userId, courseId]);

  // Calculate progress percentage
  const totalLectures = result.rows.length;
  const completedLectures = result.rows.filter(r => r.completed).length;
  const progressPercentage = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

  res.json({
    success: true,
    data: {
      courseId,
      userId,
      progress: progressPercentage,
      totalLectures,
      completedLectures,
      lectures: result.rows
    }
  });
});
