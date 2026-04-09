#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

async function migrateFreeCourses() {
  try {
    console.log('🔄 Migrating courses to free flag only...\n');

    // Add is_free column if it doesn't exist
    await pool.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true
    `);

    await pool.query(`
      UPDATE courses
      SET is_free = true
      WHERE is_free IS DISTINCT FROM true
    `);

    await pool.query(`
      ALTER TABLE courses
      DROP COLUMN IF EXISTS price
    `);

    // Verify the update
    const verification = await pool.query(`
      SELECT COUNT(*)::int as total, 
             SUM(CASE WHEN is_free = true THEN 1 ELSE 0 END)::int as free_courses
      FROM courses
    `);

    const stats = verification.rows[0];
    console.log(`\n📊 Final Status:`);
    console.log(`   Total Courses: ${stats.total}`);
    console.log(`   Free Courses (is_free=true): ${stats.free_courses}`);

    if (stats.total === stats.free_courses) {
      console.log(`\n🎉 All courses are now set as free flag only!`);
    }

  } catch (error) {
    console.error('❌ Error migrating courses:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateFreeCourses()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
