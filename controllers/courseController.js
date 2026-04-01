const Course = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { featured, sortBy, sortOrder, title, search, category, level } = req.query;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM courses';
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
  const countResult = await Course.findAllWithQuery(countQuery, queryParams.slice(0, queryParams.length - 2));

  res.json({
    success: true,
    data: courses,
    pagination: {
      page,
      limit,
      total: countResult[0]?.total || 0,
      totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
    }
  });
});

exports.get = asyncHandler(async (req, res) => {
  const course = await Course.findById(parseInt(req.params.id, 10));
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

exports.create = asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    category,
    level,
    price,
    duration,
    instructor_id,
    thumbnail,
    preview_video,
    status = 'published'
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
    instructor_id: instructor_id || 1,
    category: category || 'General',
    level: normalizedLevel,
    price: price || 0,
    duration: duration || '4 weeks',
    status: normalizedStatus,
    thumbnail: thumbnail || null,
    preview_video: preview_video || null
  };

  const created = await Course.create(courseData);
  res.status(201).json(created);
});

exports.update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { 
    title, 
    description, 
    category, 
    level, 
    price, 
    duration, 
    status, 
    instructor_id, 
    thumbnail, 
    preview_video,
    is_featured 
  } = req.body;
  
  const existing = await Course.findById(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  
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
  const pool = require('../db');
  const updated = await pool.query(`
    UPDATE courses SET 
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      category = COALESCE($3, category),
      level = COALESCE($4, level),
      price = COALESCE($5, price),
      duration = COALESCE($6, duration),
      status = COALESCE($7, status),
      instructor_id = COALESCE($8, instructor_id),
      thumbnail = COALESCE($9, thumbnail),
      preview_video = COALESCE($10, preview_video),
      is_featured = COALESCE($11, is_featured),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $12 
    RETURNING *`,
    [title, description, category, level, price, duration, status, instructor_id, thumbnail, preview_video, is_featured, id]
  );

  if (updated.rows.length === 0) {
    return res.status(404).json({ error: 'Course not found' });
  }

  res.json(updated.rows[0]);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await Course.findById(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  await Course.remove(id);
  res.status(204).send();
});

// GET /api/courses/:courseId/comments
exports.getCourseComments = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const pool = require('../db');
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
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content are required' });
  const pool = require('../db');
  const result = await pool.query(
    'INSERT INTO comments (course_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
    [courseId, user_id, content]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// POST /api/courses/:courseId/lessons/:lessonId/comments
exports.addLessonComment = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const lessonId = parseInt(req.params.lessonId, 10);
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content are required' });
  const pool = require('../db');
  const result = await pool.query(
    'INSERT INTO comments (course_id, lesson_id, user_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
    [courseId, lessonId, user_id, content]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

// GET /api/courses/:courseId/quiz
exports.getCourseQuiz = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const pool = require('../db');
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
