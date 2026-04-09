const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

function parsePagination(req) {
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '20', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

exports.listMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req);
  const rows = await pool.query(
    `SELECT id, type, title, message, payload, is_read, created_at, read_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );

  const total = await pool.query('SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1', [req.user.id]);

  res.json({
    success: true,
    data: rows.rows,
    pagination: {
      page,
      limit,
      total: total.rows[0]?.total || 0,
      totalPages: Math.ceil((total.rows[0]?.total || 0) / limit)
    }
  });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notificationId = Number.parseInt(req.params.id, 10);
  const row = await pool.query(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, req.user.id]
  );

  if (row.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  res.json({ success: true, data: row.rows[0] });
});

exports.createNotification = asyncHandler(async (req, res) => {
  const { user_id, type, title, message, payload } = req.body;

  if (!user_id || !type || !title || !message) {
    return res.status(400).json({ success: false, message: 'user_id, type, title and message are required' });
  }

  const row = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [user_id, type, title, message, JSON.stringify(payload || {})]
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`user-${user_id}`).emit('notification:new', row.rows[0]);
  }

  res.status(201).json({ success: true, data: row.rows[0] });
});
