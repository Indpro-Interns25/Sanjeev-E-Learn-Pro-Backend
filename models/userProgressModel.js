const pool = require('../db');

class UserProgressModel {
  static async upsertProgress({ userId, courseId, lectureId, completed = false, watchedTime = 0 }) {
    const { rows } = await pool.query(
      `INSERT INTO user_progress (user_id, course_id, lecture_id, completed, watched_time, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (user_id, lecture_id)
       DO UPDATE SET
         course_id = EXCLUDED.course_id,
         completed = EXCLUDED.completed,
         watched_time = GREATEST(user_progress.watched_time, EXCLUDED.watched_time),
         completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE user_progress.completed_at END,
         updated_at = NOW()
       RETURNING *`,
      [userId, courseId, lectureId, completed, watchedTime]
    );

    return rows[0];
  }

  static async findCompletedLectureIds(userId, courseId) {
    const { rows } = await pool.query(
      `SELECT lecture_id
       FROM user_progress
       WHERE user_id = $1 AND course_id = $2 AND completed = true`,
      [userId, courseId]
    );

    return rows.map((row) => row.lecture_id);
  }

  static async getCourseCompletion(userId, courseId) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_lectures,
         COUNT(*) FILTER (WHERE up.completed = true)::int AS completed_lectures
       FROM lessons l
       LEFT JOIN user_progress up ON up.lecture_id = l.id AND up.user_id = $1
       WHERE l.course_id = $2`,
      [userId, courseId]
    );

    const totalLectures = rows[0]?.total_lectures || 0;
    const completedLectures = rows[0]?.completed_lectures || 0;
    const completionPercentage = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

    return { totalLectures, completedLectures, completionPercentage };
  }
}

module.exports = UserProgressModel;
