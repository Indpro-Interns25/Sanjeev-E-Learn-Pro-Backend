const pool = require('../db');

class CourseModel {
  static async create({ title, description }) {
    const { rows } = await pool.query(
      'INSERT INTO courses (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    return rows[0];
  }
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM courses WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM courses ORDER BY id');
    return rows;
  }
  static async remove(id) {
    await pool.query('DELETE FROM courses WHERE id=$1', [id]);
    return true;
  }
}

module.exports = CourseModel;
