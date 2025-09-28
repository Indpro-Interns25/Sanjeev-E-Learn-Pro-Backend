const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');

// Direct lesson access endpoints
router.get('/:id', lessonController.getLessonById);
router.put('/:id', lessonController.updateLesson);
router.delete('/:id', lessonController.remove);

module.exports = router;
