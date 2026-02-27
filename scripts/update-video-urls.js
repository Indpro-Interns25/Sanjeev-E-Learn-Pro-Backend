#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

/**
 * This script updates all video URLs from watch format to embed format
 * Run this to fix videos showing wrong content
 */

async function updateVideoUrls() {
  console.log('🔄 Updating video URLs to embed format...\n');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Update all lessons with YouTube watch URLs to embed URLs
    const result = await client.query(`
      UPDATE lessons
      SET video_url = REPLACE(video_url, 'youtube.com/watch?v=', 'youtube.com/embed/')
      WHERE video_url LIKE '%youtube.com/watch?v=%'
      RETURNING id, title, video_url
    `);

    await client.query('COMMIT');

    console.log(`✅ Updated ${result.rows.length} video URLs successfully!\n`);
    
    if (result.rows.length > 0) {
      console.log('Sample updates:');
      result.rows.slice(0, 5).forEach(lesson => {
        console.log(`   - ${lesson.title}`);
        console.log(`     ${lesson.video_url}`);
      });
    } else {
      console.log('ℹ️  No URLs needed updating (already using embed format)');
    }

    console.log('\n🎉 Video URL update completed!');
    console.log('💡 Now refresh your frontend to see properly embedded videos.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update failed:', error.message);
    console.error('Stack:', error.stack);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
}

// Run the update
if (require.main === module) {
  updateVideoUrls();
}

module.exports = { updateVideoUrls };
