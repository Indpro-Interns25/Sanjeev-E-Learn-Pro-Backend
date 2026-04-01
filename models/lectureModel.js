const pool = require('../db');

class LectureModel {
  static async findByCourse(courseId) {
    const { rows } = await pool.query(
      `SELECT
         id,
         course_id,
         title,
         video_url,
         COALESCE(order_number, order_index, position, 0) AS order_number
       FROM lessons
       WHERE course_id = $1
       ORDER BY COALESCE(order_number, order_index, position, 0), id`,
      [courseId]
    );

    return rows;
  }

  static async findById(lectureId) {
    const { rows } = await pool.query(
      `SELECT
         id,
         course_id,
         title,
         video_url,
         COALESCE(order_number, order_index, position, 0) AS order_number
       FROM lessons
       WHERE id = $1`,
      [lectureId]
    );

    return rows[0] || null;
  }
}

module.exports = LectureModel;
