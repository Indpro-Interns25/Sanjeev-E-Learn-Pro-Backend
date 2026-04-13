const pool = require('../db');

class LessonProgress {
  /**
   * Update or insert lesson progress
   * If progress >= 90, automatically mark as completed
   */
  static async updateProgress(userId, courseId, lessonId, progressValue) {
    const completed = progressValue >= 90;

    const result = await pool.query(
      `INSERT INTO lesson_progress (user_id, course_id, lesson_id, progress, completed, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET
         progress = $4,
         completed = $5,
         updated_at = NOW()
       RETURNING *`,
      [userId, courseId, lessonId, progressValue, completed]
    );

    return result.rows[0];
  }

  /**
   * Get lesson progress for a user
   */
  static async getProgress(userId, courseId, lessonId) {
    const result = await pool.query(
      `SELECT * FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND lesson_id = $3`,
      [userId, courseId, lessonId]
    );

    if (result.rows.length === 0) {
      return {
        progress: 0,
        completed: false
      };
    }

    const row = result.rows[0];
    return {
      progress: row.progress,
      completed: row.completed
    };
  }

  /**
   * Check if lesson is completed
   */
  static async isLessonCompleted(userId, lessonId) {
    const result = await pool.query(
      `SELECT completed FROM lesson_progress
       WHERE user_id = $1 AND lesson_id = $2`,
      [userId, lessonId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].completed;
  }

  /**
   * Get all completed lessons for a course
   */
  static async getCompletedLessons(userId, courseId) {
    const result = await pool.query(
      `SELECT lesson_id, progress, completed FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND completed = true
       ORDER BY updated_at DESC`,
      [userId, courseId]
    );

    return result.rows;
  }

  /**
   * Get all lessons for a course (with progress)
   */
  static async getCourseProgress(userId, courseId) {
    const result = await pool.query(
      `SELECT lp.lesson_id, lp.progress, lp.completed, lp.updated_at, l.title, l.order_index
       FROM lesson_progress lp
       LEFT JOIN lessons l ON lp.lesson_id = l.id
       WHERE lp.user_id = $1 AND lp.course_id = $2
       ORDER BY l.order_index ASC`,
      [userId, courseId]
    );

    return result.rows;
  }

  /**
   * Count completed lessons in a course
   */
  static async countCompletedLessons(userId, courseId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND completed = true`,
      [userId, courseId]
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if all lessons in a course are completed
   */
  static async isAllLessonsCompleted(userId, courseId) {
    // Get total lessons in course
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count FROM lessons
       WHERE course_id = $1`,
      [courseId]
    );

    const totalLessons = parseInt(totalResult.rows[0].count, 10);

    // Get completed lessons
    const completedResult = await pool.query(
      `SELECT COUNT(*) as count FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND completed = true`,
      [userId, courseId]
    );

    const completedLessons = parseInt(completedResult.rows[0].count, 10);

    return totalLessons > 0 && totalLessons === completedLessons;
  }

  /**
   * Mark lesson as completed directly (bypass progress threshold)
   */
  static async markCompleted(userId, courseId, lessonId) {
    const result = await pool.query(
      `INSERT INTO lesson_progress (user_id, course_id, lesson_id, progress, completed, updated_at)
       VALUES ($1, $2, $3, 100, true, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET
         progress = 100,
         completed = true,
         updated_at = NOW()
       RETURNING *`,
      [userId, courseId, lessonId]
    );

    return result.rows[0];
  }

  /**
   * Get progress for a specific user-lesson combination
   */
  static async getByUserAndLesson(userId, lessonId) {
    const result = await pool.query(
      `SELECT * FROM lesson_progress
       WHERE user_id = $1 AND lesson_id = $2`,
      [userId, lessonId]
    );

    return result.rows[0] || null;
  }
}

module.exports = LessonProgress;
