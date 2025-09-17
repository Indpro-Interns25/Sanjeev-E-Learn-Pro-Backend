const Lesson = require('../models/lessonModel');
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
  const created = await Lesson.create({ course_id, title, content, position });
  res.status(201).json(created);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await Lesson.remove(id);
  res.status(204).send();
});
