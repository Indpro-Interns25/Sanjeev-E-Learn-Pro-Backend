const pool = require('../db');

class LessonModel {
  static async create({ course_id, title, content, position }) {
    const { rows } = await pool.query(
      'INSERT INTO course_lessons (course_id, title, content, order_sequence) VALUES ($1, $2, $3, $4) RETURNING *',
      [course_id, title, content, position || 0]
    );
    return rows[0];
  }
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM course_lessons WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findByCourse(course_id) {
    const { rows } = await pool.query('SELECT * FROM course_lessons WHERE course_id=$1 ORDER BY order_sequence, id', [course_id]);
    return rows;
  }
  static async update(id, { title, content, position }) {
    const { rows } = await pool.query(
      'UPDATE course_lessons SET title = $1, content = $2, order_sequence = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [title, content, position, id]
    );
    return rows[0];
  }
  static async remove(id) {
    await pool.query('DELETE FROM course_lessons WHERE id=$1', [id]);
    return true;
  }
}

module.exports = LessonModel;
