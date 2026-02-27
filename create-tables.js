const { Pool } = require('pg');
require('dotenv').config();

async function createTables() {
  const dbName = process.env.PG_DATABASE || 'pfadmin';
  console.log(`🔧 Creating tables in ${dbName} database...\n`);
  
  const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: dbName,
    ssl: process.env.PG_SSL === 'true'
  });

  try {
    console.log('📋 Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student'
      )
    `);
    console.log('✅ Users table created!');
    
    console.log('📋 Creating categories table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      )
    `);
    console.log('✅ Categories table created!');
    
    console.log('📋 Creating courses table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        instructor_id INTEGER REFERENCES users(id),
        category_id INTEGER REFERENCES categories(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Courses table created!');
    
    console.log('📋 Creating lessons table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        video_url VARCHAR(500),
        order_index INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Lessons table created!');
    
    console.log('📋 Creating enrollments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        course_id INTEGER REFERENCES courses(id),
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id)
      )
    `);
    console.log('✅ Enrollments table created!');
    
    console.log('📋 Creating progress table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        lesson_id INTEGER REFERENCES lessons(id),
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      )
    `);
    console.log('✅ Progress table created!');
    
    console.log('📋 Creating feedback table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        course_id INTEGER REFERENCES courses(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Feedback table created!');
    
    console.log('📋 Creating contact_submissions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Contact_submissions table created!');
    
    console.log('📋 Creating admin_notifications table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admin_notifications table created!');
    
    // List all tables to confirm
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 All tables in ${dbName} database:`);
    tables.rows.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    console.log('\n🎉 All tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await pool.end();
  }
}

createTables();