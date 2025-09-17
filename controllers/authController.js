const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcrypt');

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = await User.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  // You can add JWT or session logic here
  res.json({ message: 'Login successful', user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});
