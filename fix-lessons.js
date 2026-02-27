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

// Correct lessons for all courses based on the seeder
const coursesLessons = [
  {
    course_id: 1,
    title: 'Full Stack Web Development (MERN)',
    lessons: [
      { title: 'Introduction to MERN Stack', duration: '45:00', video_url: 'https://www.youtube.com/embed/7CqJlxBYj-M', order_index: 1 },
      { title: 'React Fundamentals', duration: '1:20:00', video_url: 'https://www.youtube.com/embed/bMknfKXIFA8', order_index: 2 },
      { title: 'Node.js & Express Basics', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/Oe421EPjeBE', order_index: 3 },
      { title: 'MongoDB Integration', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/fgTGADljAeg', order_index: 4 },
      { title: 'Authentication with JWT', duration: '55:00', video_url: 'https://www.youtube.com/embed/mbsmsi7l3r4', order_index: 5 },
      { title: 'Deployment to Cloud', duration: '40:00', video_url: 'https://www.youtube.com/embed/l134cBAJCuc', order_index: 6 }
    ]
  },
  {
    course_id: 2,
    title: 'React.js Complete Guide',
    lessons: [
      { title: 'React Introduction', duration: '35:00', video_url: 'https://www.youtube.com/embed/w7ejDZ8SWv8', order_index: 1 },
      { title: 'Components & Props', duration: '50:00', video_url: 'https://www.youtube.com/embed/Rh3tobg7hEo', order_index: 2 },
      { title: 'Hooks (useState, useEffect)', duration: '1:05:00', video_url: 'https://www.youtube.com/embed/O6P86uwfdR0', order_index: 3 },
      { title: 'Context API', duration: '45:00', video_url: 'https://www.youtube.com/embed/5LrDIWkK_Bc', order_index: 4 },
      { title: 'Routing with React Router', duration: '55:00', video_url: 'https://www.youtube.com/embed/Law7wfdg_ls', order_index: 5 },
      { title: 'Performance Optimization', duration: '40:00', video_url: 'https://www.youtube.com/embed/uojLJFt9SzY', order_index: 6 }
    ]
  },
  {
    course_id: 3,
    title: 'Node.js Backend Mastery',
    lessons: [
      { title: 'Node.js Fundamentals', duration: '50:00', video_url: 'https://www.youtube.com/embed/TlB_eWDSMt4', order_index: 1 },
      { title: 'Express Framework', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/L72fhGm1tfE', order_index: 2 },
      { title: 'REST API Development', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/pKd0Rpw7O48', order_index: 3 },
      { title: 'Authentication & Authorization', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/mbsmsi7l3r4', order_index: 4 },
      { title: 'Error Handling & Middleware', duration: '45:00', video_url: 'https://www.youtube.com/embed/lY6icfhap2o', order_index: 5 },
      { title: 'Deployment', duration: '35:00', video_url: 'https://www.youtube.com/embed/l134cBAJCuc', order_index: 6 }
    ]
  },
  {
    course_id: 4,
    title: 'PostgreSQL Database Design',
    lessons: [
      { title: 'PostgreSQL Introduction', duration: '40:00', video_url: 'https://www.youtube.com/embed/qw--VYLpxG4', order_index: 1 },
      { title: 'Database Design Principles', duration: '55:00', video_url: 'https://www.youtube.com/embed/ztHopE5Wnpc', order_index: 2 },
      { title: 'Advanced SQL Queries', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/HXV3zeQKqGY', order_index: 3 },
      { title: 'Indexes and Performance', duration: '50:00', video_url: 'https://www.youtube.com/embed/HubezKbFL7E', order_index: 4 },
      { title: 'Transactions & ACID', duration: '45:00', video_url: 'https://www.youtube.com/embed/pomxJOFVcQs', order_index: 5 },
      { title: 'Backup and Recovery', duration: '35:00', video_url: 'https://www.youtube.com/embed/SpAz1DBlfR0', order_index: 6 }
    ]
  },
  {
    course_id: 5,
    title: 'Python for Beginners',
    lessons: [
      { title: 'Python Basics', duration: '45:00', video_url: 'https://www.youtube.com/embed/rfscVS0vtbw', order_index: 1 },
      { title: 'Data Types & Variables', duration: '40:00', video_url: 'https://www.youtube.com/embed/kqtD5dpn9C8', order_index: 2 },
      { title: 'Control Flow', duration: '50:00', video_url: 'https://www.youtube.com/embed/Zp5MuPOtsSY', order_index: 3 },
      { title: 'Functions & Modules', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/9Os0o3wzS_I', order_index: 4 },
      { title: 'Object-Oriented Programming', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/JeznW_7DlB0', order_index: 5 },
      { title: 'File Handling & Projects', duration: '55:00', video_url: 'https://www.youtube.com/embed/4F2m91eKmts', order_index: 6 }
    ]
  }
];

async function fixLessons() {
  try {
    console.log('🔧 Fixing lessons for all courses...\n');

    // Clear all existing lessons
    await pool.query('DELETE FROM lessons');
    console.log('✅ Cleared all existing lessons\n');

    // Insert correct lessons for each course
    for (const course of coursesLessons) {
      console.log(`📚 Adding lessons for Course ${course.course_id}: ${course.title}`);
      
      for (const lesson of course.lessons) {
        await pool.query(
          'INSERT INTO lessons (course_id, title, content, video_url, order_index) VALUES ($1, $2, $3, $4, $5)',
          [course.course_id, lesson.title, `Duration: ${lesson.duration}`, lesson.video_url, lesson.order_index]
        );
      }
      
      console.log(`   ✅ Added ${course.lessons.length} lessons`);
    }

    // Verify results
    console.log('\n📊 Final lesson count per course:');
    const result = await pool.query(`
      SELECT course_id, COUNT(*) as count 
      FROM lessons 
      GROUP BY course_id 
      ORDER BY course_id
    `);
    
    result.rows.forEach(row => {
      console.log(`   Course ${row.course_id}: ${row.count} lessons`);
    });

    console.log('\n🎉 All lessons fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixLessons();
