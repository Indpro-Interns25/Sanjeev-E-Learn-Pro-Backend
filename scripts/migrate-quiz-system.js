#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

async function migrateQuizSystem() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (course_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS options (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        option_text TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT false
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, course_id)
      );
    `);

    await client.query(`
      ALTER TABLE quiz_results
      ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    await client.query(`
      UPDATE quiz_results qr
      SET course_id = q.course_id
      FROM quizzes q
      WHERE qr.course_id IS NULL
      AND qr.quiz_id = q.id;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions (quiz_id);
      CREATE INDEX IF NOT EXISTS idx_options_question_id ON options (question_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_results_user_course ON quiz_results (user_id, course_id);
    `);

    await client.query('COMMIT');
    console.log('Quiz system migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Quiz system migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateQuizSystem();
