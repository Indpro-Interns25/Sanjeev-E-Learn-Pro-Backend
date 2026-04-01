const asyncHandler = require('../utils/asyncHandler');
const Note = require('../models/noteModel');

exports.createNote = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const lectureId = parseInt(req.params.lectureId, 10);
  const { content } = req.body;

  const note = await Note.create({ userId, lectureId, content });
  res.status(201).json({ success: true, data: note });
});

exports.listNotes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const lectureId = parseInt(req.params.lectureId, 10);

  const notes = await Note.listByLecture(userId, lectureId);
  res.json({ success: true, data: notes });
});

exports.updateNote = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const noteId = parseInt(req.params.noteId, 10);
  const { content } = req.body;

  const note = await Note.findById(noteId);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
  if (note.user_id !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

  const updated = await Note.update(noteId, content);
  res.json({ success: true, data: updated });
});

exports.deleteNote = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const noteId = parseInt(req.params.noteId, 10);

  const note = await Note.findById(noteId);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
  if (note.user_id !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

  await Note.remove(noteId);
  res.status(204).send();
});
