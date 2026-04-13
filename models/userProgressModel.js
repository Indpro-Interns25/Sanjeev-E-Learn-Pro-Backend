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

  static async hasLessonQuizAttempt(userId, lessonId) {
    const { rows } = await pool.query(
      `SELECT attempted
       FROM lesson_quiz_attempts
       WHERE user_id = $1 AND lesson_id = $2
       LIMIT 1`,
      [userId, lessonId]
    );

    return rows.length > 0 && Boolean(rows[0].attempted);
  }

  static async getLessonProgressState(userId, lessonId) {
    const { rows } = await pool.query(
      `SELECT watched_time, completed
       FROM user_progress
       WHERE user_id = $1 AND lecture_id = $2
       LIMIT 1`,
      [userId, lessonId]
    );

    if (!rows[0]) {
      return { watchedTime: 0, completed: false };
    }

    return {
      watchedTime: Number(rows[0].watched_time) || 0,
      completed: Boolean(rows[0].completed)
    };
  }

  static async getCourseCompletion(userId, courseId) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_lectures,
         COUNT(*) FILTER (WHERE up.completed = true)::int AS completed_lectures,
         (
           SELECT COUNT(DISTINCT lq.lesson_id)::int
           FROM lesson_quizzes lq
           JOIN lessons ls ON ls.id = lq.lesson_id
           WHERE ls.course_id = $2
         ) AS total_quiz_lessons,
         (
           SELECT COUNT(DISTINCT lqa.lesson_id)::int
           FROM lesson_quiz_attempts lqa
           JOIN lessons ls ON ls.id = lqa.lesson_id
           WHERE ls.course_id = $2 AND lqa.user_id = $1 AND lqa.attempted = true
         ) AS attempted_quiz_lessons
       FROM lessons l
       LEFT JOIN user_progress up ON up.lecture_id = l.id AND up.user_id = $1
       WHERE l.course_id = $2`,
      [userId, courseId]
    );

    const totalLectures = rows[0]?.total_lectures || 0;
    const completedLectures = rows[0]?.completed_lectures || 0;
    const totalQuizLessons = rows[0]?.total_quiz_lessons || 0;
    const attemptedQuizLessons = rows[0]?.attempted_quiz_lessons || 0;

    const lessonProgress = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;
    const quizProgress = totalQuizLessons > 0 ? (attemptedQuizLessons / totalQuizLessons) * 100 : 100;

    const completionReady =
      totalLectures > 0 &&
      completedLectures >= totalLectures &&
      attemptedQuizLessons >= totalQuizLessons;

    const completionPercentage = completionReady
      ? 100
      : Math.round((lessonProgress + quizProgress) / 2);

    return {
      totalLectures,
      completedLectures,
      totalQuizLessons,
      attemptedQuizLessons,
      completionPercentage,
      completionReady
    };
  }
}

module.exports = UserProgressModel;
