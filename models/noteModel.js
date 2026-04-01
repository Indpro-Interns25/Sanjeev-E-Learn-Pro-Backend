const pool = require('../db');

class NoteModel {
  static async create({ userId, lectureId, content }) {
    const { rows } = await pool.query(
      'INSERT INTO notes (user_id, lecture_id, content, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [userId, lectureId, content]
    );
    return rows[0];
  }

  static async listByLecture(userId, lectureId) {
    const { rows } = await pool.query(
      'SELECT * FROM notes WHERE user_id = $1 AND lecture_id = $2 ORDER BY updated_at DESC',
      [userId, lectureId]
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async update(id, content) {
    const { rows } = await pool.query(
      'UPDATE notes SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [content, id]
    );
    return rows[0] || null;
  }

  static async remove(id) {
    await pool.query('DELETE FROM notes WHERE id = $1', [id]);
  }
}

module.exports = NoteModel;
