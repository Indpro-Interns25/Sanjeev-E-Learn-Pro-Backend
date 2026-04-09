const pool = require('../db');

const Progress = {
  /**
   * Mark a lecture as completed for a user
   */
  async markLectureComplete({ user_id, course_id, lecture_id }) {
    const { rows } = await pool.query(
      `INSERT INTO user_progress 
       (user_id, course_id, lecture_id, completed, completed_at, created_at, updated_at) 
       VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
       ON CONFLICT (user_id, lecture_id) 
       DO UPDATE SET completed = true, completed_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [user_id, course_id, lecture_id]
    );
    return rows[0];
  },

  /**
   * Save watch time for a lecture
   */
  async updateWatchTime({ user_id, course_id, lecture_id, watched_time }) {
    const { rows } = await pool.query(
      `INSERT INTO user_progress 
       (user_id, course_id, lecture_id, watched_time, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id, lecture_id) 
       DO UPDATE SET watched_time = GREATEST(user_progress.watched_time, $4), updated_at = NOW()
       RETURNING *`,
      [user_id, course_id, lecture_id, watched_time]
    );
    return rows[0];
  },

  /**
   * Get user progress for a specific course
   */
  async getCourseProgress(user_id, course_id) {
    const { rows } = await pool.query(
      `SELECT 
         l.id as lecture_id,
         l.title as lecture_title,
         l.order_index,
         COALESCE(up.completed, false) as completed,
         COALESCE(up.watched_time, 0) as watched_time,
         up.completed_at,
         up.updated_at
       FROM lessons l
       LEFT JOIN user_progress up ON l.id = up.lecture_id AND up.user_id = $1
       WHERE l.course_id = $2
       ORDER BY l.order_index ASC, l.id ASC`,
      [user_id, course_id]
    );
    return rows;
  },

  /**
   * Calculate overall progress percentage for a course
   */
  async calculateCourseProgress(user_id, course_id) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int as total_lectures,
         SUM(CASE WHEN up.completed = true THEN 1 ELSE 0 END)::int as completed_lectures
       FROM lessons l
       LEFT JOIN user_progress up ON l.id = up.lecture_id AND up.user_id = $1
       WHERE l.course_id = $2`,
      [user_id, course_id]
    );

    const result = rows[0];
    const totalLectures = result.total_lectures || 0;
    const completedLectures = result.completed_lectures || 0;
    const progress = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

    return {
      progress,
      totalLectures,
      completedLectures
    };
  },

  /**
   * Get all progress records (admin)
   */
  async findAll() {
    const { rows } = await pool.query(
      `SELECT up.*, u.name, u.email, c.title as course_title, l.title as lecture_title
       FROM user_progress up
       JOIN users u ON up.user_id = u.id
       JOIN courses c ON up.course_id = c.id
       JOIN lessons l ON up.lecture_id = l.id
       ORDER BY up.updated_at DESC`
    );
    return rows;
  },

  async findByUser(user_id) {
    const { rows } = await pool.query(
      `SELECT up.*, c.title as course_title, l.title as lecture_title
       FROM user_progress up
       JOIN courses c ON up.course_id = c.id
       JOIN lessons l ON up.lecture_id = l.id
       WHERE up.user_id = $1
       ORDER BY up.updated_at DESC`,
      [user_id]
    );
    return rows;
  },

  /**
   * Get single progress record
   */
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT up.*, u.name, u.email, c.title as course_title, l.title as lecture_title
       FROM user_progress up
       JOIN users u ON up.user_id = u.id
       JOIN courses c ON up.course_id = c.id
       JOIN lessons l ON up.lecture_id = l.id
       WHERE up.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Remove progress record
   */
  async remove(id) {
    await pool.query('DELETE FROM user_progress WHERE id = $1', [id]);
  }
};

module.exports = Progress;
