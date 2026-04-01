const pool = require('../db');

class QuizModel {
  static async createQuiz({ courseId, title, passingScore, createdBy, questions }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const quizRes = await client.query(
        'INSERT INTO quizzes (course_id, title, passing_score, created_by, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [courseId, title, passingScore, createdBy]
      );

      const quiz = quizRes.rows[0];

      for (const q of questions) {
        await client.query(
          'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer) VALUES ($1, $2, $3, $4)',
          [quiz.id, q.question, JSON.stringify(q.options), q.correct_answer]
        );
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

  static async getQuizWithQuestions(quizId) {
    const quiz = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
    if (quiz.rows.length === 0) return null;

    const questions = await pool.query(
      'SELECT id, question, options, correct_answer FROM quiz_questions WHERE quiz_id = $1 ORDER BY id',
      [quizId]
    );

    return { ...quiz.rows[0], questions: questions.rows };
  }

  static async saveResult({ quizId, userId, score, total, percentage, passed }) {
    const { rows } = await pool.query(
      `INSERT INTO quiz_results (quiz_id, user_id, score, total, percentage, passed, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (quiz_id, user_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         total = EXCLUDED.total,
         percentage = EXCLUDED.percentage,
         passed = EXCLUDED.passed,
         submitted_at = NOW()
       RETURNING *`,
      [quizId, userId, score, total, percentage, passed]
    );

    return rows[0];
  }
}

module.exports = QuizModel;
