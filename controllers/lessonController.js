const Lesson = require('../models/lessonModel');
const Course = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');
const { formatDurationForDB, formatDurationForForm } = require('../utils/durationHelper');

// Get all lessons (for general API access)
exports.getAllLessons = asyncHandler(async (req, res) => {
  const pool = require('../db');
  
  const lessons = await pool.query(`
    SELECT 
      l.*,
      c.title as course_title,
      u.name as instructor_name
    FROM course_lessons l
    JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON c.instructor_id = u.id
    ORDER BY l.course_id, l.order_sequence, l.id
  `);

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

exports.listByCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const lessons = await Lesson.findByCourse(courseId);
  res.json(lessons);
});

exports.create = asyncHandler(async (req, res) => {
  // Support two modes:
  // - Nested: POST /courses/:courseId/lessons (courseId in params)
  // - Direct: POST /api/lessons with course_id in body
  const course_id = req.params.courseId ? parseInt(req.params.courseId, 10) : parseInt(req.body.course_id, 10);

  const {
    title,
    description, // map to content
    content,
    video_url,
    order_sequence,
    duration,
    status
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title required' });
  if (!course_id || isNaN(course_id)) return res.status(400).json({ error: 'course_id is required and must be numeric' });

  // Verify course exists
  const course = await Course.findById(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Prefer content field but allow description
  const finalContent = content || description || '';

  // Use order_sequence or position
  const position = order_sequence !== undefined ? order_sequence : req.body.position;

  // Normalize duration to consistent format
  const normalizedDuration = formatDurationForDB(duration);

  // Store video_url and duration and status in content or separate columns are not present in model;
  // append video URL metadata to content to preserve data if needed
  let contentToSave = finalContent;
  if (video_url) contentToSave += `\n\nVideo: ${video_url}`;
  if (normalizedDuration) contentToSave += `\n\nDuration: ${normalizedDuration}`;
  if (status) contentToSave += `\n\nStatus: ${status}`;

  const created = await Lesson.create({ course_id, title, content: contentToSave, position });
  res.status(201).json(created);
});

exports.getLessonById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const lesson = await Lesson.findById(id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json(lesson);
});

exports.updateLesson = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  // Accept both 'position' and 'order_sequence' from frontend
  const { title, content, description, video_url, duration, course_id } = req.body;
  const position = req.body.order_sequence !== undefined ? req.body.order_sequence : req.body.position;
  
  // Use content if provided, otherwise use description
  const finalContent = content || description;

  // Normalize duration to consistent format
  const normalizedDuration = duration ? formatDurationForDB(duration) : duration;

  const existing = await Lesson.findById(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });

  // Update the lesson using direct database query to handle all fields including course_id
  const pool = require('../db');
  const updated = await pool.query(
    'UPDATE course_lessons SET title = COALESCE($1, title), content = COALESCE($2, content), order_sequence = COALESCE($3, order_sequence), video_url = COALESCE($4, video_url), duration = COALESCE($5, duration), course_id = COALESCE($6, course_id), updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
    [title, finalContent, position, video_url, normalizedDuration, course_id, id]
  );

  if (updated.rows.length === 0) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  // Format the response to include both duration formats
  const responseData = {
    ...updated.rows[0],
    duration_number: formatDurationForForm(updated.rows[0].duration),
    duration_display: updated.rows[0].duration
  };

  res.json(responseData);
});

exports.getCurriculum = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  
  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  
  const lessons = await Lesson.findByCourse(courseId);
  
  res.json({
    course: course,
    curriculum: lessons,
    totalLessons: lessons.length
  });
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await Lesson.findById(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });
  
  await Lesson.remove(id);
  res.status(204).send();
});
