const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

async function canAccessParentComment(user, parentComment) {
  if (user.role === 'admin') return true;

  if (parentComment.course_id) {
    if (user.role === 'instructor') {
      const owned = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [parentComment.course_id, user.id]);
      if (owned.rows.length > 0) return true;
    }

    const enrolled = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true',
      [user.id, parentComment.course_id]
    );
    return enrolled.rows.length > 0;
  }

  return parentComment.user_id === user.id;
}

// POST /api/comments/:commentId/replies - Add a reply to a comment
exports.addReply = asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.commentId, 10);
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  // Verify parent comment exists
  const parent = await pool.query('SELECT * FROM comments WHERE id = $1', [parentId]);
  if (parent.rows.length === 0) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const parentComment = parent.rows[0];
  const allowed = await canAccessParentComment(req.user, parentComment);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden: cannot reply to this comment' });
  }

  const reply = await pool.query(
    `INSERT INTO comments (parent_id, course_id, lesson_id, user_id, content)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [parentId, parentComment.course_id, parentComment.lesson_id, req.user.id, content]
  );

  res.status(201).json({ success: true, data: reply.rows[0] });
});

// GET /api/comments/:commentId/replies - Get replies for a comment
exports.getReplies = asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.commentId, 10);
  const parent = await pool.query('SELECT * FROM comments WHERE id = $1', [parentId]);
  if (parent.rows.length === 0) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const allowed = await canAccessParentComment(req.user, parent.rows[0]);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden: cannot access replies for this comment' });
  }

  const result = await pool.query(`
    SELECT c.*, u.name as author_name
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.parent_id = $1
    ORDER BY c.created_at ASC
  `, [parentId]);
  res.json({ success: true, data: result.rows });
});
