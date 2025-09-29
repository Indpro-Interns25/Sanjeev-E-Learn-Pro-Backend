const Lesson = require('../models/lessonModel');
const Course = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');

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

  res.json({
    success: true,
    data: lessons.rows
  });
});

exports.listByCourse = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const lessons = await Lesson.findByCourse(courseId);
  res.json(lessons);
});

exports.create = asyncHandler(async (req, res) => {
  const course_id = parseInt(req.params.courseId, 10);
  const { title, content, position } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  
  // Verify course exists
  const course = await Course.findById(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  
  const created = await Lesson.create({ course_id, title, content, position });
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
  const { title, content, position } = req.body;
  
  const existing = await Lesson.findById(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });
  
  const updated = await Lesson.update(id, { title, content, position });
  res.json(updated);
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
