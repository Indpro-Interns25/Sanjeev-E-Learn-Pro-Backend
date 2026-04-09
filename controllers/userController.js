const pool = require('../db');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcrypt');

exports.list = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = await User.findAllSafe();
  res.json(users);
});

exports.get = asyncHandler(async (req, res) => {
  const requestedId = parseInt(req.params.id, 10);
  const userId = req.user.role === 'admin' ? requestedId : req.user.id;

  if (req.user.role !== 'admin' && requestedId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: cannot view another user profile' });
  }

  const user = await User.findByIdSafe(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

exports.create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { email, name, password, role } = req.body;
  if (!email || !name || !password || !role) return res.status(400).json({ error: 'email, name, password, and role required' });

  if (role === 'student') {
    return res.status(403).json({ error: 'Students must register themselves' });
  }

  const existing = await User.findByEmail(email);
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const created = await User.create({ email, name, password: hashed, role, status: 'active', enrolledCourses: [] });
  console.log("created");
  res.status(201).json("created");
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({ error: 'Forbidden: cannot delete another user' });
  }

  const existing = await User.findById(id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  await User.remove(id);
  res.status(204).send();
});

// GET /api/user/enrolled-courses
exports.getEnrolledCourses = asyncHandler(async (req, res) => {
  const requestedUserId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
  const userId = req.user.role === 'admin' && requestedUserId ? requestedUserId : req.user.id;
  if (!userId) return res.status(400).json({ error: 'user_id required' });

  const result = await pool.query(`
    SELECT c.*, e.enrolled_at, e.is_active
    FROM courses c
    JOIN enrollments e ON c.id = e.course_id
    WHERE e.user_id = $1 AND e.is_active = true
    ORDER BY e.enrolled_at DESC
  `, [userId]);
  res.json({ success: true, data: result.rows });
});

// GET /api/user/stats
exports.getUserStats = asyncHandler(async (req, res) => {
  const requestedUserId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
  const userId = req.user.role === 'admin' && requestedUserId ? requestedUserId : req.user.id;
  if (!userId) return res.status(400).json({ error: 'user_id required' });

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
