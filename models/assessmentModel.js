const pool = require('../db');

function normalizeOptions(options) {
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function getRandomQuestionCount(totalCount) {
  if (totalCount < 10) return totalCount;
  const max = Math.min(20, totalCount);
  return Math.floor(Math.random() * (max - 10 + 1)) + 10;
}

class AssessmentModel {
  static async countLessonQuizQuestions(lessonId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM lesson_quizzes
       WHERE lesson_id = $1`,
      [lessonId]
    );

    return rows[0]?.total || 0;
  }

  static async countFinalTestQuestions(courseId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM final_tests
       WHERE course_id = $1`,
      [courseId]
    );

    return rows[0]?.total || 0;
  }

  static async getLessonById(lessonId) {
    const { rows } = await pool.query(
      `SELECT id, course_id, order_index
       FROM lessons
       WHERE id = $1`,
      [lessonId]
    );

    return rows[0] || null;
  }

  static async isUserEnrolledInCourse(userId, courseId) {
    const { rows } = await pool.query(
      `SELECT 1
       FROM enrollments
       WHERE user_id = $1 AND course_id = $2 AND is_active = true
       LIMIT 1`,
      [userId, courseId]
    );

    return rows.length > 0;
  }

  static async isLessonUnlocked(userId, courseId, lessonId) {
    const lesson = await this.getLessonById(lessonId);
    if (!lesson || Number(lesson.course_id) !== Number(courseId)) {
      return false;
    }

    const { rows } = await pool.query(
      `SELECT id
       FROM lessons
       WHERE course_id = $1
       ORDER BY order_index ASC, id ASC`,
      [courseId]
    );

    const lessons = rows;
    const currentIndex = lessons.findIndex((item) => Number(item.id) === Number(lessonId));
    if (currentIndex <= 0) return true;

    const previousLessonId = lessons[currentIndex - 1].id;
    const prevProgress = await pool.query(
      `SELECT completed
       FROM user_progress
       WHERE user_id = $1 AND lecture_id = $2
       LIMIT 1`,
      [userId, previousLessonId]
    );

    return prevProgress.rows.length > 0 && Boolean(prevProgress.rows[0].completed);
  }

  static async getLessonQuizQuestions(lessonId) {
    const total = await this.countLessonQuizQuestions(lessonId);
    const limit = getRandomQuestionCount(total);

    if (limit === 0) {
      return [];
    }

    const { rows } = await pool.query(
      `SELECT id, lesson_id, question, options
       FROM lesson_quizzes
       WHERE lesson_id = $1
       ORDER BY RANDOM()
       LIMIT $2`,
      [lessonId, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      lesson_id: row.lesson_id,
      question: row.question,
      options: normalizeOptions(row.options)
    }));
  }

  static async gradeLessonQuiz(lessonId, answers) {
    const answerMap = new Map();
    for (const answer of answers) {
      const questionId = Number(answer.question_id || answer.id);
      const selectedAnswer = answer.answer;
      if (!Number.isNaN(questionId) && selectedAnswer !== undefined) {
        answerMap.set(questionId, selectedAnswer);
      }
    }

    const questionIds = Array.from(answerMap.keys());
    if (questionIds.length === 0) {
      return { score: 0, total: 0, correctCount: 0 };
    }

    const { rows } = await pool.query(
      `SELECT id, correct_answer
       FROM lesson_quizzes
       WHERE lesson_id = $1
         AND id = ANY($2::int[])`,
      [lessonId, questionIds]
    );

    let correctCount = 0;
    for (const row of rows) {
      const selected = answerMap.get(Number(row.id));
      if (selected !== undefined && String(selected) === String(row.correct_answer)) {
        correctCount += 1;
      }
    }

    const total = rows.length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return { score, total, correctCount };
  }

  static async saveLessonQuizAttempt(userId, lessonId) {
    const { rows } = await pool.query(
      `INSERT INTO lesson_quiz_attempts (user_id, lesson_id, attempted, attempted_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET attempted = true, attempted_at = NOW()
       RETURNING *`,
      [userId, lessonId]
    );

    return rows[0];
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

  static async getFinalTestQuestions(courseId) {
    const total = await this.countFinalTestQuestions(courseId);
    const limit = getRandomQuestionCount(total);

    if (limit === 0) {
      return [];
    }

    const { rows } = await pool.query(
      `SELECT id, course_id, question, options
       FROM final_tests
       WHERE course_id = $1
       ORDER BY RANDOM()
       LIMIT $2`,
      [courseId, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      course_id: row.course_id,
      question: row.question,
      options: normalizeOptions(row.options)
    }));
  }

  static async gradeFinalTest(courseId, answers) {
    const answerMap = new Map();
    for (const answer of answers) {
      const questionId = Number(answer.question_id || answer.id);
      const selectedAnswer = answer.answer;
      if (!Number.isNaN(questionId) && selectedAnswer !== undefined) {
        answerMap.set(questionId, selectedAnswer);
      }
    }

    const questionIds = Array.from(answerMap.keys());
    if (questionIds.length === 0) {
      return { score: 0, passed: false, total: 0, correctCount: 0 };
    }

    const { rows } = await pool.query(
      `SELECT id, correct_answer
       FROM final_tests
       WHERE course_id = $1
         AND id = ANY($2::int[])`,
      [courseId, questionIds]
    );

    let correctCount = 0;
    const total = rows.length;

    for (const question of rows) {
      const selected = answerMap.get(Number(question.id));
      if (selected !== undefined && String(selected) === String(question.correct_answer)) {
        correctCount += 1;
      }
    }

    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const passed = score >= 70;

    return { score, passed, total, correctCount };
  }

  static async saveFinalTestAttempt(userId, courseId, score, passed) {
    const { rows } = await pool.query(
      `INSERT INTO final_test_attempts (user_id, course_id, score, passed, attempted_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [userId, courseId, score, passed]
    );

    return rows[0];
  }

  static async getLatestFinalTestAttempt(userId, courseId) {
    const { rows } = await pool.query(
      `SELECT id, user_id, course_id, score, passed, attempted_at
       FROM final_test_attempts
       WHERE user_id = $1 AND course_id = $2
       ORDER BY attempted_at DESC, id DESC
       LIMIT 1`,
      [userId, courseId]
    );

    return rows[0] || null;
  }
}

module.exports = AssessmentModel;
