const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// GET /api/comments/:commentId/replies - Get replies for a comment
router.get('/:commentId/replies', commentController.getReplies);

// POST /api/comments/:commentId/replies - Add a reply to a comment
router.post('/:commentId/replies', commentController.addReply);

module.exports = router;
