const { Pool } = require('pg');
require('dotenv').config();

async function createUserProgressTable() {
  const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📋 Creating user_progress table...');
    
    // Create user_progress table with all required fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lecture_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        completed BOOLEAN NOT NULL DEFAULT false,
        watched_time INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, lecture_id)
      );
    `);
    console.log('✅ user_progress table created!');

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id 
      ON user_progress(user_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_progress_course_id 
      ON user_progress(course_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_course 
      ON user_progress(user_id, course_id);
    `);

    console.log('✅ Indexes created!');
    console.log('🎉 User progress tracking system ready!');

  } catch (error) {
    console.error('❌ Error creating user_progress table:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createUserProgressTable()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
