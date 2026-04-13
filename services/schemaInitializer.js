const pool = require('../db');

let initialized = false;

async function initializeSchema() {
  if (initialized) return;

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS enrolled_courses INTEGER[] NOT NULL DEFAULT '{}'::integer[];
  `);

  await pool.query(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_status_check;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD CONSTRAINT users_status_check
    CHECK (status IN ('active', 'blocked'));
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, course_id)
    );
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      certificate_code VARCHAR(120) NOT NULL UNIQUE,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, course_id)
    );
  `);

  await pool.query(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true;
  `);

  await pool.query(`
    UPDATE courses
    SET is_free = true
    WHERE is_free IS DISTINCT FROM true;
  `);

  await pool.query(`
    ALTER TABLE courses
    DROP COLUMN IF EXISTS price;
  `);

  await pool.query(`
    ALTER TABLE enrollments
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  `);

  await pool.query(`
    ALTER TABLE user_progress
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS lecture_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_assets (
      id SERIAL PRIMARY KEY,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      public_id VARCHAR(255),
      source_url TEXT NOT NULL,
      playback_url TEXT,
      mime_type VARCHAR(120),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (lesson_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_tags (
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (course_id, tag_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_classes (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      room_id VARCHAR(120) NOT NULL UNIQUE,
      status VARCHAR(40) NOT NULL DEFAULT 'scheduled',
      scheduled_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_class_participants (
      id SERIAL PRIMARY KEY,
      live_class_id INTEGER NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      left_at TIMESTAMPTZ,
      role VARCHAR(40) NOT NULL DEFAULT 'student',
      UNIQUE (live_class_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      live_class_id INTEGER REFERENCES live_classes(id) ON DELETE CASCADE,
      room_type VARCHAR(40) NOT NULL DEFAULT 'course',
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(80) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(80),
      entity_id VARCHAR(120),
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address VARCHAR(80),
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_live_classes_course_status ON live_classes(course_id, status);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_live_class_participants_class_user ON live_class_participants(live_class_id, user_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_course_created ON chat_messages(course_id, created_at DESC);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_private_created ON chat_messages(sender_id, recipient_id, created_at DESC);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);');

  initialized = true;
}

module.exports = {
  initializeSchema
};
