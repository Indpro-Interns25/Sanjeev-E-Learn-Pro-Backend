const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');

function parsePagination(req) {
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '30', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

exports.getCourseChatHistory = asyncHandler(async (req, res) => {
  const courseId = Number.parseInt(req.params.courseId, 10);
  const { page, limit, offset } = parsePagination(req);

  let authorized = false;
  if (req.user.role === 'admin') {
    authorized = true;
  } else if (req.user.role === 'instructor') {
    const owned = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [courseId, req.user.id]);
    authorized = owned.rows.length > 0;
  } else {
    const enrollment = await pool.query(
      'SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
      [req.user.id, courseId]
    );
    authorized = enrollment.rows.length > 0;
  }

  if (!authorized) {
    return res.status(403).json({ success: false, message: 'Forbidden: chat history not accessible for this user' });
  }

  const [data, count] = await Promise.all([
    pool.query(
      `SELECT cm.id, cm.message, cm.created_at, cm.sender_id, u.name AS sender_name, u.role AS sender_role
       FROM chat_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.course_id = $1 AND cm.room_type = 'course'
       ORDER BY cm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [courseId, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM chat_messages
       WHERE course_id = $1 AND room_type = 'course'`,
      [courseId]
    )
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

exports.getPrivateChatHistory = asyncHandler(async (req, res) => {
  const peerId = Number.parseInt(req.params.peerId, 10);
  const { page, limit, offset } = parsePagination(req);

  const [data, count] = await Promise.all([
    pool.query(
      `SELECT cm.id, cm.message, cm.created_at, cm.sender_id, cm.recipient_id, u.name AS sender_name
       FROM chat_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.room_type = 'private'
         AND ((cm.sender_id = $1 AND cm.recipient_id = $2) OR (cm.sender_id = $2 AND cm.recipient_id = $1))
       ORDER BY cm.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.user.id, peerId, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM chat_messages cm
       WHERE cm.room_type = 'private'
         AND ((cm.sender_id = $1 AND cm.recipient_id = $2) OR (cm.sender_id = $2 AND cm.recipient_id = $1))`,
      [req.user.id, peerId]
    )
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
