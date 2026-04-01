const pool = require('../db');

class LessonModel {
  static async create({ course_id, title, content, position }) {
    const { rows } = await pool.query(
      'INSERT INTO lessons (course_id, title, content, order_index, order_number) VALUES ($1, $2, $3, $4, $4) RETURNING *',
      [course_id, title, content, position || 0]
    );
    return rows[0];
  }
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM lessons WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findByCourse(course_id) {
    const { rows } = await pool.query('SELECT * FROM lessons WHERE course_id=$1 ORDER BY order_index, id', [course_id]);
    return rows;
  }
  static async update(id, { title, content, position }) {
    // Use COALESCE so that omitted fields don't overwrite existing values with NULL
    const { rows } = await pool.query(
      'UPDATE lessons SET title = COALESCE($1, title), content = COALESCE($2, content), order_index = COALESCE($3, order_index), order_number = COALESCE($3, order_number), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [title, content, position, id]
    );
    return rows[0];
  }
  static async remove(id) {
    await pool.query('DELETE FROM lessons WHERE id=$1', [id]);
    return true;
  }
}

module.exports = LessonModel;
