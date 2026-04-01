const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { validateToken } = require('../middleware/authMiddleware');
const { requireFields } = require('../middleware/validationMiddleware');

router.get('/lectures/:lectureId/notes', validateToken, noteController.listNotes);
router.post('/lectures/:lectureId/notes', validateToken, requireFields(['content']), noteController.createNote);
router.put('/notes/:noteId', validateToken, requireFields(['content']), noteController.updateNote);
router.delete('/notes/:noteId', validateToken, noteController.deleteNote);

module.exports = router;
