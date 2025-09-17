// Basic progressController stub for REST endpoints
const asyncHandler = require('../utils/asyncHandler');
const Progress = require('../models/progressModel');

exports.getAllProgress = asyncHandler(async (req, res) => {
  const rows = await Progress.findAll();
  res.json(rows);
});

exports.getProgressById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await Progress.findById(id);
  if (!row) return res.status(404).json({ error: 'Progress not found' });
  res.json(row);
});

exports.createProgress = asyncHandler(async (req, res) => {
  const { user_id, lesson_id, status } = req.body;
  if (!user_id || !lesson_id || !status) return res.status(400).json({ error: 'user_id, lesson_id, status required' });
  const created = await Progress.create({ user_id, lesson_id, status });
  res.status(201).json(created);
});

exports.updateProgress = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const updated = await Progress.update(id, { status });
  res.json(updated);
});

exports.deleteProgress = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await Progress.remove(id);
  res.status(204).send();
});
