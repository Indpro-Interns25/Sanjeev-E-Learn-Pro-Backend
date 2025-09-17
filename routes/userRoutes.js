const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.list);
router.get('/:id', userController.get);
router.post('/', userController.create);
// router.put('/:id', userController.update); // Not implemented
router.delete('/:id', userController.remove);

module.exports = router;
