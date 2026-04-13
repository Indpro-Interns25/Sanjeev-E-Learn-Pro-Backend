const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { validateToken } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

// Video progress tracking
router.post('/progress', validateToken, videoController.saveVideoProgress);
router.get('/progress/:lectureId/:userId', validateToken, videoController.getVideoProgress);

// Lesson video management
router.post('/lessons/:lessonId/assets', validateToken, allowRoles('admin', 'instructor'), videoController.registerLessonVideo);
router.get('/lessons/:lessonId/meta', validateToken, videoController.getLessonVideoMeta);
router.get('/lessons/:lessonId/stream', validateToken, videoController.streamLessonVideo);

module.exports = router;
