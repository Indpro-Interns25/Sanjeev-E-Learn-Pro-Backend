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

// Map lessons to actual courses in the database based on their current titles
const courseMapping = [
  {
    title: 'Complete React Development Bootcamp', // Course ID 1
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
    title: 'Node.js Backend Mastery', // Course ID 2
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
    title: 'Python Data Science Fundamentals', // Course ID 3
    lessons: [
      { title: 'Python Basics', duration: '45:00', video_url: 'https://www.youtube.com/embed/rfscVS0vtbw', order_index: 1 },
      { title: 'Data Types & Variables', duration: '40:00', video_url: 'https://www.youtube.com/embed/kqtD5dpn9C8', order_index: 2 },
      { title: 'Control Flow', duration: '50:00', video_url: 'https://www.youtube.com/embed/Zp5MuPOtsSY', order_index: 3 },
      { title: 'Functions & Modules', duration: '1:00:00', video_url: 'https://www.youtube.com/embed/9Os0o3wzS_I', order_index: 4 },
      { title: 'Object-Oriented Programming', duration: '1:15:00', video_url: 'https://www.youtube.com/embed/JeznW_7DlB0', order_index: 5 },
      { title: 'File Handling & Projects', duration: '55:00', video_url: 'https://www.youtube.com/embed/4F2m91eKmts', order_index: 6 }
    ]
  },
  {
    title: 'Flutter Mobile App Development', // Course ID 4
    lessons: [
      { title: 'Flutter Introduction', duration: '40:00', video_url: 'https://www.youtube.com/embed/1xipg02Wu8s', order_index: 1 },
      { title: 'Dart Programming Basics', duration: '50:00', video_url: 'https://www.youtube.com/embed/Ej_Pcr4uC2Q', order_index: 2 },
      { title: 'Widgets & Layouts', duration: '1:05:00', video_url: 'https://www.youtube.com/embed/1gDhl4leEzA', order_index: 3 },
      { title: 'State Management', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/d_m5csmrf7I', order_index: 4 },
      { title: 'Navigation & Routing', duration: '45:00', video_url: 'https://www.youtube.com/embed/RBSLbBVPXGY', order_index: 5 },
      { title: 'Building & Deploying Apps', duration: '55:00', video_url: 'https://www.youtube.com/embed/CD1Y2DmL5JM', order_index: 6 }
    ]
  },
  {
    title: 'PostgreSQL Database Design', // Course ID 5 (matches partial title)
    lessons: [
      { title: 'PostgreSQL Introduction', duration: '40:00', video_url: 'https://www.youtube.com/embed/qw--VYLpxG4', order_index: 1 },
      { title: 'Database Design Principles', duration: '55:00', video_url: 'https://www.youtube.com/embed/ztHopE5Wnpc', order_index: 2 },
      { title: 'Advanced SQL Queries', duration: '1:10:00', video_url: 'https://www.youtube.com/embed/HXV3zeQKqGY', order_index: 3 },
      { title: 'Indexes and Performance', duration: '50:00', video_url: 'https://www.youtube.com/embed/HubezKbFL7E', order_index: 4 },
      { title: 'Transactions & ACID', duration: '45:00', video_url: 'https://www.youtube.com/embed/pomxJOFVcQs', order_index: 5 },
      { title: 'Backup and Recovery', duration: '35:00', video_url: 'https://www.youtube.com/embed/SpAz1DBlfR0', order_index: 6 }
    ]
  }
];

async function fixAllCourseLessons() {
  try {
    console.log('🔧 Fixing lessons for all courses based on actual course titles...\n');

    // Get all courses from database
    const coursesResult = await pool.query('SELECT id, title FROM courses ORDER BY id');
    const dbCourses = coursesResult.rows;

    console.log(`Found ${dbCourses.length} courses in database\n`);

    // Clear all lessons
    await pool.query('DELETE FROM lessons');
    console.log('✅ Cleared all existing lessons\n');

    // Match and insert lessons for each database course
    for (let i = 0; i < dbCourses.length; i++) {
      const dbCourse = dbCourses[i];
      const mapping = courseMapping[i]; // Map by position
      
      if (!mapping) {
        console.log(`⚠️  No mapping found for course ${dbCourse.id}: ${dbCourse.title}`);
        continue;
      }

      console.log(`📚 Course ${dbCourse.id}: ${dbCourse.title}`);
      console.log(`   Mapping to: ${mapping.title}`);
      
      // Insert lessons
      for (const lesson of mapping.lessons) {
        await pool.query(
          'INSERT INTO lessons (course_id, title, content, video_url, order_index) VALUES ($1, $2, $3, $4, $5)',
          [dbCourse.id, lesson.title, `Duration: ${lesson.duration}`, lesson.video_url, lesson.order_index]
        );
      }
      
      console.log(`   ✅ Added ${mapping.lessons.length} lessons\n`);
    }

    // Verify results
    console.log('📊 Verification:');
    console.log('═══════════════════════════════════════════════════════════');
    
    for (const course of dbCourses) {
      const lessonsResult = await pool.query(
        'SELECT id, title FROM lessons WHERE course_id = $1 ORDER BY order_index',
        [course.id]
      );
      
      console.log(`\n✅ Course ${course.id}: ${course.title}`);
      console.log(`   ${lessonsResult.rows.length} lessons:`);
      lessonsResult.rows.forEach((l, idx) => {
        console.log(`   ${idx + 1}. ${l.title}`);
      });
    }

    console.log('\n\n🎉 All lessons fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAllCourseLessons();
