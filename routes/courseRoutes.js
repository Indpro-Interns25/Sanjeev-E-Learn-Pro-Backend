const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

router.get('/', courseController.list);
router.get('/:id', courseController.get);
router.post('/', courseController.create);
// router.put('/:id', courseController.update); // Not implemented
router.delete('/:id', courseController.remove);

module.exports = router;
