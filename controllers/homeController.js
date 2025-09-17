const pool = require('../db');

exports.index = async (req, res) => {
  try {
    // Simple query to test DB connection
    await pool.query('SELECT 1');
    res.json({ message: 'Welcome to E-Learn Pro Backend!', db: 'Connected' });
  } catch (err) {
    res.status(500).json({ message: 'Welcome to E-Learn Pro Backend!', db: 'Connection failed', error: err.message });
  }
};
