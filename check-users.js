const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.PG_SSL === 'true'
});

async function checkAndCreateUser() {
  try {
    console.log('🔍 Checking existing users in database...');
    
    // Check existing users
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    
    if (result.rows.length === 0) {
      console.log('📝 No users found in database');
    } else {
      console.log(`👥 Found ${result.rows.length} users:`);
      result.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
    // Create a test user if it doesn't exist
    const testEmail = 'your.email@example.com';
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [testEmail]);
    
    if (existingUser.rows.length === 0) {
      console.log('\n🆕 Creating test user for login...');
      
      const hashedPassword = await bcrypt.hash('yourpassword123', 10);
      const newUser = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
        ['Test User', testEmail, hashedPassword, 'student']
      );
      
      console.log('✅ Test user created successfully:');
      console.log(`  - ID: ${newUser.rows[0].id}`);
      console.log(`  - Name: ${newUser.rows[0].name}`);
      console.log(`  - Email: ${newUser.rows[0].email}`);
      console.log(`  - Role: ${newUser.rows[0].role}`);
      console.log('\n🔐 Use these credentials in Postman:');
      console.log(`  Email: ${testEmail}`);
      console.log(`  Password: yourpassword123`);
    } else {
      console.log(`\n✅ Test user already exists: ${testEmail}`);
      console.log('🔐 Use these credentials in Postman:');
      console.log(`  Email: ${testEmail}`);
      console.log(`  Password: yourpassword123`);
    }
    
    // Also create admin user if doesn't exist
    const adminEmail = 'admin@example.com';
    const existingAdmin = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length === 0) {
      console.log('\n🔑 Creating admin user...');
      
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await pool.query(
        'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
        ['Admin User', adminEmail, hashedAdminPassword, 'admin', 'approved']
      );
      
      console.log('👑 Admin user created:');
      console.log(`  - Email: ${adminEmail}`);
      console.log(`  - Password: admin123`);
    } else {
      console.log(`\n👑 Admin user already exists: ${adminEmail}`);
      console.log('🔐 Admin credentials:');
      console.log(`  Email: ${adminEmail}`);
      console.log(`  Password: admin123`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkAndCreateUser();