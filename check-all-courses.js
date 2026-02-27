require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.PG_SSL === 'true'
});

async function checkAll() {
  try {
    const courses = await pool.query('SELECT id, title FROM courses ORDER BY id');
    
    console.log('📚 Checking all courses and their lessons:\n');
    console.log(`Total courses found: ${courses.rows.length}\n`);
    
    for (const course of courses.rows) {
      const lessons = await pool.query(
        'SELECT id, title, order_index, video_url FROM lessons WHERE course_id = $1 ORDER BY order_index, id',
        [course.id]
      );
      
      console.log(`Course ${course.id}: ${course.title}`);
      console.log(`   Total lessons: ${lessons.rows.length}`);
      
      if (lessons.rows.length > 0) {
        lessons.rows.forEach((l, i) => {
          const hasVideo = l.video_url ? '📹' : '❌';
          console.log(`   ${i+1}. [${l.order_index}] ${l.title} ${hasVideo}`);
        });
      } else {
        console.log('   ⚠️  NO LESSONS FOUND!');
      }
      console.log('');
    }
    
    // Summary
    const summary = await pool.query(`
      SELECT 
        c.id,
        c.title,
        COUNT(l.id) as lesson_count
      FROM courses c
      LEFT JOIN lessons l ON c.id = l.course_id
      GROUP BY c.id, c.title
      ORDER BY c.id
    `);
    
    console.log('📊 SUMMARY:');
    console.log('════════════════════════════════════════════════════');
    summary.rows.forEach(row => {
      const status = row.lesson_count > 0 ? '✅' : '❌';
      console.log(`${status} Course ${row.id}: ${row.lesson_count} lessons`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAll();
