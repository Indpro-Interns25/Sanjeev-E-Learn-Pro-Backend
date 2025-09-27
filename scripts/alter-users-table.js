#!/usr/bin/env node
require('dotenv').config();
const pool = require('../db');

(async () => {
  console.log('Altering users table to add password and role columns...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add password column if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    `);

    // Add role column if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';
    `);

    // Add check constraint for role if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'instructor', 'admin'));
    `);

    await client.query('COMMIT');
    console.log('Users table alteration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Table alteration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
})();