const Course = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const courses = await Course.findAll();
  res.json(courses);
});

exports.get = asyncHandler(async (req, res) => {
  const course = await Course.findById(parseInt(req.params.id, 10));
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

exports.create = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const created = await Course.create({ title, description });
  res.status(201).json(created);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await Course.findById(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  await Course.remove(id);
  res.status(204).send();
});
