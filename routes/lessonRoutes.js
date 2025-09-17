const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');

// Lessons are nested under courses, so these routes are not used directly
// Use /courses/:courseId/lessons for list/create
// Use /lessons/:id for delete

// Example for direct lesson access (if needed):
// router.get('/:id', lessonController.getLessonById);

module.exports = router;

module.exports = router;
