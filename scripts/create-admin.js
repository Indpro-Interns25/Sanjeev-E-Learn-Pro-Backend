#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db');

(async () => {
  console.log('👑 Creating admin user...');
  const client = await pool.connect();
  
  try {
    // Hash password for admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Insert admin user
    await client.query(`
      INSERT INTO users (email, name, password, role, status) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (email) DO UPDATE SET 
        password = $3, 
        role = $4,
        status = $5
    `, ['admin@edulearnpro.com', 'Admin User', hashedPassword, 'admin', 'active']);

    console.log('✅ Admin user created successfully:');
    console.log('📧 Email: admin@edulearnpro.com');
    console.log('🔐 Password: admin123');
    console.log('👑 Role: admin');
    console.log('✅ Status: active');
    
  } catch (err) {
    console.error('❌ Failed to create admin user:', err.message);
  } finally {
    client.release();
    pool.end();
  }
})();