const pool = require('../db');

class UserModel {
  static async create({ email, name, password, role, status = 'active', enrolledCourses = [] }) {
    const { rows } = await pool.query(
      'INSERT INTO users (email, name, password, role, status, enrolled_courses, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *',
      [email, name, password, role, status, enrolledCourses]
    );
    return rows[0];
  }
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findByIdSafe(id) {
    const { rows } = await pool.query('SELECT id, name, email, role, status, enrolled_courses, created_at FROM users WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows;
  }
  static async findAllSafe() {
    const { rows } = await pool.query('SELECT id, name, email, role, status, enrolled_courses, created_at FROM users ORDER BY created_at DESC');
    return rows;
  }
  static async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    return rows[0] || null;
  }
  static async remove(id) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    return true;
  }
}

module.exports = UserModel;
