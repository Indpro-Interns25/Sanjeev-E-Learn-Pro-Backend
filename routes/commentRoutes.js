const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { validateToken } = require('../middleware/authMiddleware');

// GET /api/comments/:commentId/replies - Get replies for a comment
router.get('/:commentId/replies', validateToken, commentController.getReplies);

// POST /api/comments/:commentId/replies - Add a reply to a comment
router.post('/:commentId/replies', validateToken, commentController.addReply);

module.exports = router;
