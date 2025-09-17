const pool = require('../db');

class LessonModel {
  static async create({ course_id, title, content, position }) {
    const { rows } = await pool.query(
      'INSERT INTO lessons (course_id, title, content, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [course_id, title, content, position || 0]
    );
    return rows[0];
  }
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM lessons WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findByCourse(course_id) {
    const { rows } = await pool.query('SELECT * FROM lessons WHERE course_id=$1 ORDER BY position, id', [course_id]);
    return rows;
  }
  static async remove(id) {
    await pool.query('DELETE FROM lessons WHERE id=$1', [id]);
    return true;
  }
}

module.exports = LessonModel;
