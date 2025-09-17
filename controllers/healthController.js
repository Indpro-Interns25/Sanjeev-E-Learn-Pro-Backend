const pool = require('../db');

exports.health = async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const duration = Date.now() - start;
    res.json({ status: 'ok', db: 'connected', latencyMs: duration, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'unreachable', error: err.message, timestamp: new Date().toISOString() });
  }
};
