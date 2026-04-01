const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcrypt');

exports.list = asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findById(parseInt(req.params.id, 10));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

exports.create = asyncHandler(async (req, res) => {
  const { email, name, password, role } = req.body;
  if (!email || !name || !password || !role) return res.status(400).json({ error: 'email, name, password, and role required' });
  const existing = await User.findByEmail(email);
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const created = await User.create({ email, name, password: hashed, role });
  console.log("created");
  res.status(201).json("created");
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await User.findById(id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  await User.remove(id);
  res.status(204).send();
});

// GET /api/user/enrolled-courses
exports.getEnrolledCourses = asyncHandler(async (req, res) => {
  const userId = req.query.user_id || (req.user && req.user.id);
  if (!userId) return res.status(400).json({ error: 'user_id required' });
  const pool = require('../db');
  const result = await pool.query(`
    SELECT c.*, e.enrolled_at, e.progress, e.completed_at
    FROM courses c
    JOIN enrollments e ON c.id = e.course_id
    WHERE e.user_id = $1 AND e.is_active = true
    ORDER BY e.enrolled_at DESC
  `, [userId]);
  res.json({ success: true, data: result.rows });
});

// GET /api/user/stats
exports.getUserStats = asyncHandler(async (req, res) => {
  const userId = req.query.user_id || (req.user && req.user.id);
  if (!userId) return res.status(400).json({ error: 'user_id required' });
  const pool = require('../db');
  const [enrolled, completed, lessons] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND is_active = true', [userId]),
    pool.query('SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]),
    pool.query('SELECT COUNT(*) FROM progress WHERE user_id = $1 AND is_completed = true', [userId])
  ]);
  res.json({
    success: true,
    data: {
      enrolled_courses: parseInt(enrolled.rows[0].count),
      completed_courses: parseInt(completed.rows[0].count),
      completed_lessons: parseInt(lessons.rows[0].count)
    }
  });
});
