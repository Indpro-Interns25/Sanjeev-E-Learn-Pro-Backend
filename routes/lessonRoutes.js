const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');

// Get all lessons endpoint
router.get('/', lessonController.getAllLessons);

// Direct lesson access endpoints
router.get('/:id', lessonController.getLessonById);
router.put('/:id', lessonController.updateLesson);
router.delete('/:id', lessonController.remove);

module.exports = router;
