const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const lessonController = require('../controllers/lessonController');

// Course CRUD operations
router.get('/', courseController.list);
router.get('/:id', courseController.get);
router.post('/', courseController.create);
router.put('/:id', courseController.update);
router.delete('/:id', courseController.remove);

// Course curriculum (lessons) endpoints
router.get('/:courseId/lessons', lessonController.listByCourse);
router.post('/:courseId/lessons', lessonController.create);
router.get('/:courseId/curriculum', lessonController.getCurriculum);

module.exports = router;
