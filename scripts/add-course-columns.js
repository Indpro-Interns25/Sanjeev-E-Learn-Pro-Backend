#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

(async () => {
  console.log('🔄 Adding missing columns to courses and lessons tables...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add missing columns to courses table
    console.log('📚 Adding columns to courses table...');
    
    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Beginner'
    `);
    
    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS duration VARCHAR(100)
    `);
    
    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0
    `);
    
    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS thumbnail TEXT
    `);
    
    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS preview_video TEXT
    `);
    
    await client.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    // Add check constraint for course level
    await client.query(`
      ALTER TABLE courses 
      DROP CONSTRAINT IF EXISTS courses_level_check
    `);

    await client.query(`
      ALTER TABLE courses 
      ADD CONSTRAINT courses_level_check 
      CHECK (level IN ('Beginner', 'Intermediate', 'Advanced'))
    `);

    // Update lessons table to match the seeder data structure
    console.log('📝 Adding columns to lessons table...');
    
    await client.query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS duration VARCHAR(20)
    `);

    await client.query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);

    // Make sure order_index exists (it should, but let's be safe)
    await client.query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0
    `);

    await client.query('COMMIT');
    console.log('✅ Columns added successfully!');
    
    // Show summary
    console.log('\n📊 Migration Summary:');
    console.log('✅ Added level, duration, rating, thumbnail, preview_video to courses');
    console.log('✅ Added duration and updated_at to lessons');
    console.log('✅ Added level constraint (Beginner/Intermediate/Advanced)');
    console.log('\n🚀 Database is ready for course seeding!');

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
