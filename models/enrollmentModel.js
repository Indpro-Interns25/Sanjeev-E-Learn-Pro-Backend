const pool = require('../db');

class EnrollmentModel {
  static async enroll({ user_id, course_id }) {
    const { rows } = await pool.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) ON CONFLICT (user_id, course_id) DO NOTHING RETURNING *',
      [user_id, course_id]
    );
    return rows[0] || null; // null if already enrolled
  }
  static async listByUser(user_id) {
    const { rows } = await pool.query(
      `SELECT e.*, c.title AS course_title
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id=$1
       ORDER BY e.id`,
      [user_id]
    );
    return rows;
  }
  static async listByCourse(course_id) {
    const { rows } = await pool.query(
      `SELECT e.*, u.email AS user_email
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       WHERE e.course_id=$1
       ORDER BY e.id`,
      [course_id]
    );
    return rows;
  }
  static async unenroll({ user_id, course_id }) {
    await pool.query('DELETE FROM enrollments WHERE user_id=$1 AND course_id=$2', [user_id, course_id]);
    return true;
  }
}

module.exports = EnrollmentModel;
