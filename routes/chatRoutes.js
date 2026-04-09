const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { validateToken } = require('../middleware/authMiddleware');

router.get('/courses/:courseId/history', validateToken, chatController.getCourseChatHistory);
router.get('/private/:peerId/history', validateToken, chatController.getPrivateChatHistory);

module.exports = router;
