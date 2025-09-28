const Lesson = require('../models/lessonModel');
const Course = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');

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
