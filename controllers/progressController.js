// Basic progressController stub for REST endpoints
const asyncHandler = require('../utils/asyncHandler');
const Progress = require('../models/progressModel');
const pool = require('../db');

exports.getAllProgress = asyncHandler(async (req, res) => {
  const rows = await Progress.findAll();
  res.json(rows);
});

exports.getProgressById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await Progress.findById(id);
  if (!row) return res.status(404).json({ error: 'Progress not found' });
  res.json(row);
});

exports.createProgress = asyncHandler(async (req, res) => {
  const { user_id, lesson_id, status } = req.body;
  if (!user_id || !lesson_id || !status) return res.status(400).json({ error: 'user_id, lesson_id, status required' });
  const created = await Progress.create({ user_id, lesson_id, status });
  res.status(201).json(created);
});

exports.updateProgress = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const updated = await Progress.update(id, { status });
  res.json(updated);
});

exports.deleteProgress = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await Progress.remove(id);
  res.status(204).send();
});

// GET /api/progress/:userId/course/:courseId
exports.getCourseProgress = asyncHandler(async (req, res) => {
  const { userId, courseId } = req.params;
  const result = await pool.query(`
    SELECT
      l.id as lesson_id,
      l.title as lesson_title,
      l.order_index,
      COALESCE(p.is_completed, false) as is_completed,
      p.completed_at
    FROM lessons l
    LEFT JOIN progress p ON l.id = p.lesson_id AND p.user_id = $1
    WHERE l.course_id = $2
    ORDER BY l.order_index, l.id
  `, [userId, courseId]);

  const total = result.rows.length;
  const completed = result.rows.filter(r => r.is_completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    success: true,
    data: {
      lessons: result.rows,
      total_lessons: total,
      completed_lessons: completed,
      completion_percentage: percentage
    }
  });
});

// POST /api/progress/:userId/lesson/:lessonId/complete
exports.completeLesson = asyncHandler(async (req, res) => {
  const { userId, lessonId } = req.params;

  const existing = await pool.query(
    'SELECT id FROM progress WHERE user_id = $1 AND lesson_id = $2',
    [userId, lessonId]
  );

  let result;
  if (existing.rows.length > 0) {
    result = await pool.query(
      'UPDATE progress SET is_completed = true, completed_at = NOW() WHERE user_id = $1 AND lesson_id = $2 RETURNING *',
      [userId, lessonId]
    );
  } else {
    result = await pool.query(
      'INSERT INTO progress (user_id, lesson_id, is_completed, completed_at) VALUES ($1, $2, true, NOW()) RETURNING *',
      [userId, lessonId]
    );
  }

  res.json({ success: true, data: result.rows[0], message: 'Lesson marked as complete' });
});
