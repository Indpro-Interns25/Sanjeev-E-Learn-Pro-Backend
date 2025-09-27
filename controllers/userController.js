const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcrypt');

exports.list = asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

exports.get = asyncHandler(async (req, res) => {
  const user = await User.findById(parseInt(req.params.id, 10));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

exports.create = asyncHandler(async (req, res) => {
  const { email, name, password, role } = req.body;
  if (!email || !name || !password || !role) return res.status(400).json({ error: 'email, name, password, and role required' });
  const existing = await User.findByEmail(email);
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const created = await User.create({ email, name, password: hashed, role });
  console.log("created");
  res.status(201).json("created");
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await User.findById(id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  await User.remove(id);
  res.status(204).send();
});
