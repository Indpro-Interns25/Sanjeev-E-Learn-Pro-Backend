const crypto = require('crypto');
const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

function parsePagination(req) {
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '20', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

exports.startSession = asyncHandler(async (req, res) => {
  const { course_id, title, scheduled_at } = req.body;
  if (!course_id || !title) {
    return res.status(400).json({ success: false, message: 'course_id and title are required' });
  }

  if (req.user.role === 'instructor') {
    const owned = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [course_id, req.user.id]);
    if (owned.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: cannot start class for non-owned course' });
    }
  }

  const roomId = crypto.randomUUID();
  const row = await pool.query(
    `INSERT INTO live_classes (course_id, instructor_id, title, room_id, status, scheduled_at, started_at)
     VALUES ($1, $2, $3, $4, 'live', $5, NOW())
     RETURNING *`,
    [course_id, req.user.id, title, roomId, scheduled_at || null]
  );

  res.status(201).json({ success: true, data: row.rows[0] });
});

exports.endSession = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const row = await pool.query(
    `UPDATE live_classes
     SET status = 'ended', ended_at = NOW()
     WHERE id = $1
       AND ($2 = 'admin' OR instructor_id = $3)
     RETURNING *`,
    [id, req.user.role, req.user.id]
  );

  if (row.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Session not found or forbidden' });
  }

  res.json({ success: true, data: row.rows[0] });
});

exports.listSessions = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req);
  const { course_id, status } = req.query;

  const params = [];
  const conditions = [];

  if (course_id) {
    params.push(Number.parseInt(course_id, 10));
    conditions.push(`lc.course_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`lc.status = $${params.length}`);
  }

  if (req.user.role === 'instructor') {
    params.push(req.user.id);
    conditions.push(`lc.instructor_id = $${params.length}`);
  }

  if (req.user.role === 'student') {
    params.push(req.user.id);
    conditions.push(`lc.course_id IN (
      SELECT course_id
      FROM enrollments
      WHERE user_id = $${params.length} AND is_active = true
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      lc.*,
      c.title AS course_title,
      u.name AS instructor_name,
      (SELECT COUNT(*)::int FROM live_class_participants p WHERE p.live_class_id = lc.id AND p.left_at IS NULL) AS active_participants
    FROM live_classes lc
    JOIN courses c ON c.id = lc.course_id
    JOIN users u ON u.id = lc.instructor_id
    ${whereClause}
    ORDER BY COALESCE(lc.started_at, lc.created_at) DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `SELECT COUNT(*)::int AS total FROM live_classes lc ${whereClause}`;

  const [data, count] = await Promise.all([
    pool.query(dataQuery, [...params, limit, offset]),
    pool.query(countQuery, params)
  ]);

  res.json({
    success: true,
    data: data.rows,
    pagination: {
      page,
      limit,
      total: count.rows[0]?.total || 0,
      totalPages: Math.ceil((count.rows[0]?.total || 0) / limit)
    }
  });
});

exports.getParticipants = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const liveClass = await pool.query('SELECT id, course_id, instructor_id FROM live_classes WHERE id = $1', [id]);
  if (liveClass.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  const session = liveClass.rows[0];
  if (req.user.role === 'instructor' && session.instructor_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Forbidden: not your session' });
  }

  if (req.user.role === 'student') {
    const enrolled = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
      [req.user.id, session.course_id]
    );
    if (enrolled.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: not enrolled in this course' });
    }
  }

  const data = await pool.query(
    `SELECT p.live_class_id, p.user_id, p.joined_at, p.left_at, p.role, u.name, u.email
     FROM live_class_participants p
     JOIN users u ON u.id = p.user_id
     WHERE p.live_class_id = $1
     ORDER BY p.joined_at DESC`,
    [id]
  );

  res.json({ success: true, data: data.rows });
});
