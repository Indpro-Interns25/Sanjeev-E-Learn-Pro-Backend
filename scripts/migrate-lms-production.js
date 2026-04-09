#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

async function migrateLmsProduction() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'student';
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS enrolled_courses INTEGER[] NOT NULL DEFAULT '{}'::integer[];
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_role_check'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT users_role_check
          CHECK (role IN ('admin', 'instructor', 'student'));
        END IF;
      END;
      $$;
    `);

    await client.query(`
      UPDATE users u
      SET enrolled_courses = COALESCE(
        (
          SELECT ARRAY_AGG(DISTINCT e.course_id ORDER BY e.course_id)
          FROM enrollments e
          WHERE e.user_id = u.id AND e.is_active = true
        ),
        '{}'::integer[]
      )
      WHERE u.role = 'student';
    `);

      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'users_status_check'
          ) THEN
            ALTER TABLE users
            ADD CONSTRAINT users_status_check
            CHECK (status IN ('active', 'blocked'));
          END IF;
        END;
        $$;
      `);

    await client.query(`
      ALTER TABLE courses
      ADD COLUMN IF NOT EXISTS category VARCHAR(120) DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'beginner',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, course_id)
      );
    `);

    await client.query(`
      ALTER TABLE lessons
      ADD COLUMN IF NOT EXISTS video_url TEXT,
      ADD COLUMN IF NOT EXISTS order_number INTEGER,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    await client.query(`
      UPDATE lessons
      SET order_number = COALESCE(order_number, order_index, position, 0)
      WHERE order_number IS NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lecture_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        completed BOOLEAN NOT NULL DEFAULT false,
        watched_time INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, lecture_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_course
      ON user_progress(user_id, course_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lecture_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        passing_score INTEGER NOT NULL DEFAULT 60,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage INTEGER NOT NULL,
        passed BOOLEAN NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (quiz_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        certificate_code VARCHAR(120) NOT NULL UNIQUE,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, course_id)
      );
    `);

    await client.query('COMMIT');
    console.log('LMS production migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('LMS production migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateLmsProduction();
