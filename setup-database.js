const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  console.log('🔧 Setting up database...\n');
  
  // First connect to postgres database to check if pfadmin exists
  const adminPool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: 'postgres', // Connect to default postgres database
    ssl: process.env.PG_SSL === 'true'
  });

  try {
    // Check if pfadmin database exists
    console.log('📋 Checking if database exists...');
    const result = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'pfadmin'");
    
    if (result.rows.length === 0) {
      console.log('🔨 Creating pfadmin database...');
      await adminPool.query('CREATE DATABASE pfadmin');
      console.log('✅ Database pfadmin created successfully!');
    } else {
      console.log('✅ Database pfadmin already exists!');
    }
    
    await adminPool.end();
    
    // Now connect to pfadmin database to create tables
    const pfadminPool = new Pool({
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: 'pfadmin',
      ssl: process.env.PG_SSL === 'true'
    });
    
    console.log('📋 Checking tables in pfadmin database...');
    const tables = await pfadminPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:');
    if (tables.rows.length === 0) {
      console.log('   No tables found. Creating tables...');
      
      // Create users table
      await pfadminPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'student'
        )
      `);
      
      // Create other tables as needed
      await pfadminPool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT
        )
      `);
      
      await pfadminPool.query(`
        CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          instructor_id INTEGER REFERENCES users(id),
          category_id INTEGER REFERENCES categories(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await pfadminPool.query(`
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
      
      await pfadminPool.query(`
        CREATE TABLE IF NOT EXISTS enrollments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          course_id INTEGER REFERENCES courses(id),
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, course_id)
        )
      `);
      
      await pfadminPool.query(`
        CREATE TABLE IF NOT EXISTS progress (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          lesson_id INTEGER REFERENCES lessons(id),
          completed BOOLEAN DEFAULT false,
          completed_at TIMESTAMP,
          UNIQUE(user_id, lesson_id)
        )
      `);
      
      await pfladminPool.query(`
        CREATE TABLE IF NOT EXISTS feedback (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          course_id INTEGER REFERENCES courses(id),
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await pfladminPool.query(`
        CREATE TABLE IF NOT EXISTS contact_submissions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await pfladminPool.query(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
          id SERIAL PRIMARY KEY,
          type VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ All tables created successfully!');
    } else {
      tables.rows.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    }
    
    await pfladminPool.end();
    console.log('\n🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
  }
}

setupDatabase();