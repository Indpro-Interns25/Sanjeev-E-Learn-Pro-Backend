const asyncHandler = require('../utils/asyncHandler');
const pool = require('../db');

// POST /api/comments/:commentId/replies - Add a reply to a comment
exports.addReply = asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.commentId, 10);
  const { user_id, content } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ error: 'user_id and content are required' });
  }

  // Verify parent comment exists
  const parent = await pool.query('SELECT * FROM comments WHERE id = $1', [parentId]);
  if (parent.rows.length === 0) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const reply = await pool.query(
    `INSERT INTO comments (parent_id, course_id, lesson_id, user_id, content)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [parentId, parent.rows[0].course_id, parent.rows[0].lesson_id, user_id, content]
  );

  res.status(201).json({ success: true, data: reply.rows[0] });
});

// GET /api/comments/:commentId/replies - Get replies for a comment
exports.getReplies = asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.commentId, 10);
  const result = await pool.query(`
    SELECT c.*, u.name as author_name
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.parent_id = $1
    ORDER BY c.created_at ASC
  `, [parentId]);
  res.json({ success: true, data: result.rows });
});
