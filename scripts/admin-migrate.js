#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

(async () => {
  console.log('🔄 Running admin system migrations...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add status and enrolled course columns to users table if they don't exist
    console.log('📋 Adding status columns to users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);

    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);

    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS suspension_reason TEXT
    `);

    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS enrolled_courses INTEGER[] NOT NULL DEFAULT '{}'::integer[]
    `);

    // Add check constraint for user status
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_status_check
    `);

    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_status_check 
      CHECK (status IN ('active', 'blocked'))
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
      WHERE u.role = 'student'
    `);

    await client.query(`
      UPDATE users
      SET status = 'blocked'
      WHERE status IN ('pending', 'suspended', 'rejected')
    `);

    // Add instructor_id and status to courses table
    console.log('📚 Updating courses table...');
    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
    `);

    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true
    `);

    await client.query(`
      UPDATE courses
      SET is_free = true
      WHERE is_free IS DISTINCT FROM true
    `);

    await client.query(`
      ALTER TABLE courses
      DROP COLUMN IF EXISTS price
    `);

    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS category VARCHAR(255)
    `);

    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS category_id INTEGER
    `);

    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `);

    // Add status to lessons table
    console.log('📝 Updating lessons table...');
    await client.query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
    `);

    // Create categories table
    console.log('🏷️ Creating categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add foreign key constraint for category_id in courses
    await client.query(`
      ALTER TABLE courses 
      DROP CONSTRAINT IF EXISTS courses_category_id_fkey
    `);

    await client.query(`
      ALTER TABLE courses 
      ADD CONSTRAINT courses_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    `);

    // Create feedback table
    console.log('💬 Creating feedback table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        status VARCHAR(50) DEFAULT 'pending',
        admin_response TEXT,
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create contact_submissions table
    console.log('📧 Creating contact submissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        response TEXT,
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create admin_notifications table
    console.log('🔔 Creating admin notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create progress table if it doesn't exist (enhanced version)
    console.log('📈 Creating/updating progress table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'not_started',
        completion_percentage INTEGER DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        last_accessed TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, lesson_id)
      )
    `);

    // Add check constraint for progress status
    await client.query(`
      ALTER TABLE progress 
      DROP CONSTRAINT IF EXISTS progress_status_check
    `);

    await client.query(`
      ALTER TABLE progress 
      ADD CONSTRAINT progress_status_check 
      CHECK (status IN ('not_started', 'in_progress', 'completed'))
    `);

    // Insert some default categories
    console.log('🎯 Adding default categories...');
    await client.query(`
      INSERT INTO categories (name, description, icon) VALUES 
      ('Programming', 'Software development and coding courses', '💻'),
      ('Design', 'Graphic design and UI/UX courses', '🎨'),
      ('Business', 'Business and entrepreneurship courses', '💼'),
      ('Marketing', 'Digital marketing and SEO courses', '📈'),
      ('Data Science', 'Data analysis and machine learning courses', '📊'),
      ('Language', 'Language learning courses', '🌍'),
      ('Photography', 'Photography and videography courses', '📸'),
      ('Music', 'Music theory and instrument courses', '🎵')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create some sample admin notifications
    console.log('📢 Creating sample admin notifications...');
    await client.query(`
      INSERT INTO admin_notifications (title, message, type) VALUES 
      ('Welcome to Admin Dashboard', 'Your admin dashboard is now fully configured and ready to use!', 'success'),
      ('System Update', 'New admin features have been added including bulk operations and advanced reporting.', 'info'),
      ('Pending Approvals', 'There are new instructor registration requests waiting for approval.', 'warning')
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Admin system migrations completed successfully!');
    
    // Show summary
    console.log('\n📊 Migration Summary:');
    console.log('✅ Added status management to users');
    console.log('✅ Added enrolled course tracking to users');
    console.log('✅ Enhanced courses table with pricing and categories');
    console.log('✅ Added lesson status management');
    console.log('✅ Created categories system');
    console.log('✅ Created feedback system');
    console.log('✅ Created contact form system');
    console.log('✅ Created admin notifications');
    console.log('✅ Enhanced progress tracking');
    console.log('✅ Added default categories');
    console.log('\n🚀 Admin dashboard backend is ready!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    console.error('Stack:', err.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
})();