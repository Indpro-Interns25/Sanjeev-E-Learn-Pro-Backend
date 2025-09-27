#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db');

(async () => {
  console.log('Creating test user...');
  const client = await pool.connect();
  try {
    // Hash password for test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insert test user
    await client.query(`
      INSERT INTO users (email, name, password, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO UPDATE SET 
        password = $3, 
        role = $4
    `, ['bhai708@gmail.com', 'Test User', hashedPassword, 'student']);

    console.log('Test user created successfully:');
    console.log('Email: bhai708@gmail.com');
    console.log('Password: password123');
    console.log('Role: student');
  } catch (err) {
    console.error('Failed to create test user:', err.message);
  } finally {
    client.release();
    pool.end();
  }
})();