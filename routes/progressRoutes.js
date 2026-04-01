const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');

router.get('/', progressController.getAllProgress);
router.get('/:id', progressController.getProgressById);
router.post('/', progressController.createProgress);
router.put('/:id', progressController.updateProgress);
router.delete('/:id', progressController.deleteProgress);

// Spec routes
router.get('/:userId/course/:courseId', progressController.getCourseProgress);
router.post('/:userId/lesson/:lessonId/complete', progressController.completeLesson);

module.exports = router;
