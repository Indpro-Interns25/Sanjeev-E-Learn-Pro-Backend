const pool = require('../db');

class QuizSystemModel {
  static async upsertQuiz({ courseId, title, createdBy, questions }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let quiz;
      const existing = await client.query('SELECT id FROM quizzes WHERE course_id = $1', [courseId]);
      if (existing.rows.length > 0) {
        quiz = (await client.query(
          'UPDATE quizzes SET title = $1, created_by = $2 WHERE course_id = $3 RETURNING *',
          [title, createdBy, courseId]
        )).rows[0];

        await client.query('DELETE FROM questions WHERE quiz_id = $1', [quiz.id]);
      } else {
        quiz = (await client.query(
          'INSERT INTO quizzes (course_id, title, created_by, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
          [courseId, title, createdBy]
        )).rows[0];
      }

      for (const q of questions) {
        const question = (await client.query(
          'INSERT INTO questions (quiz_id, question_text) VALUES ($1, $2) RETURNING *',
          [quiz.id, q.question_text]
        )).rows[0];

        for (const opt of q.options) {
          await client.query(
            'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3)',
            [question.id, opt.option_text, Boolean(opt.is_correct)]
          );
        }
      }

      await client.query('COMMIT');
      return quiz;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getQuizByCourseId(courseId) {
    const quizRes = await pool.query('SELECT id, course_id, title FROM quizzes WHERE course_id = $1', [courseId]);
    if (quizRes.rows.length === 0) return null;

    const quiz = quizRes.rows[0];

    const questionsRes = await pool.query(
      'SELECT id, question_text FROM questions WHERE quiz_id = $1 ORDER BY id',
      [quiz.id]
    );

    const questions = [];
    for (const question of questionsRes.rows) {
      const optionsRes = await pool.query(
        'SELECT id, option_text, is_correct FROM options WHERE question_id = $1 ORDER BY id',
        [question.id]
      );

      questions.push({
        id: question.id,
        question_text: question.question_text,
        options: optionsRes.rows
      });
    }

    return {
      ...quiz,
      questions
    };
  }

  static async saveResult({ userId, courseId, score, total }) {
    const { rows } = await pool.query(
      `INSERT INTO quiz_results (user_id, course_id, score, total, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total, created_at = NOW()
       RETURNING *`,
      [userId, courseId, score, total]
    );

    return rows[0];
  }

  static async getResultByUserCourse(userId, courseId) {
    const { rows } = await pool.query(
      'SELECT id, user_id, course_id, score, total, created_at FROM quiz_results WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    return rows[0] || null;
  }
}

module.exports = QuizSystemModel;
