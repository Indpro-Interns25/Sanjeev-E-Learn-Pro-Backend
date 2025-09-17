const pool = require('../db');

class UserModel {
  static async create({ email, name, password, role }) {
    const { rows } = await pool.query(
      'INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, name, password, role]
    );
    return rows[0];
  }
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
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
