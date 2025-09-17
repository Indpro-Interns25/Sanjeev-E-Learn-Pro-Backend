// Basic progressModel stub for REST endpoints
const pool = require('../db');

const Progress = {
  async findAll() {
    const { rows } = await pool.query('SELECT * FROM progress');
    return rows;
  },
  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM progress WHERE id = $1', [id]);
    return rows[0];
  },
  async create({ user_id, lesson_id, status }) {
    const { rows } = await pool.query(
      'INSERT INTO progress (user_id, lesson_id, status) VALUES ($1, $2, $3) RETURNING *',
      [user_id, lesson_id, status]
    );
    return rows[0];
  },
  async update(id, { status }) {
    const { rows } = await pool.query(
      'UPDATE progress SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0];
  },
  async remove(id) {
    await pool.query('DELETE FROM progress WHERE id = $1', [id]);
  }
};

module.exports = Progress;
