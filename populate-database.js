const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.PG_SSL === 'true'
});

async function populateDatabase() {
  console.log('🚀 Populating Database with Test Users...\n');
  
  const testUsers = [
    { name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'student' },
    { name: 'Jane Smith', email: 'jane@example.com', password: 'password123', role: 'instructor' },
    { name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' },
    { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123', role: 'student' },
    { name: 'Bob Wilson', email: 'bob@example.com', password: 'password123', role: 'instructor' }
  ];

  try {
    console.log('📝 Creating test users...');
    
    for (const user of testUsers) {
      // Check if user already exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
      
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const result = await pool.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
          [user.name, user.email, hashedPassword, user.role]
        );
        console.log(`✅ Created: ${result.rows[0].name} (${result.rows[0].email}) - ID: ${result.rows[0].id}`);
      } else {
        console.log(`⚠️ Already exists: ${user.name} (${user.email})`);
      }
    }
    
    // Show all users
    console.log('\n👥 All Users in Database:');
    const allUsers = await pool.query('SELECT id, name, email, role FROM users ORDER BY id');
    
    if (allUsers.rows.length === 0) {
      console.log('   No users found');
    } else {
      allUsers.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id} | ${user.name} | ${user.email} | ${user.role}`);
      });
    }
    
    console.log(`\n🎉 Database population completed! Total users: ${allUsers.rows.length}`);
    
    console.log('\n🔐 Test Login Credentials:');
    console.log('   Student: john@example.com / password123');
    console.log('   Instructor: jane@example.com / password123');
    console.log('   Admin: admin@example.com / admin123');
    
  } catch (error) {
    console.error('❌ Error populating database:', error.message);
  } finally {
    await pool.end();
  }
}

populateDatabase();