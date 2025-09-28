#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

// Create connection to default postgres database first to create pfadmin database
const defaultPool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: 'postgres', // Connect to default database first
  ssl: process.env.PG_SSL === 'true'
});

(async () => {
  console.log('Creating pfadmin database if not exists...');
  
  // First create the database if it doesn't exist
  try {
    await defaultPool.query(`CREATE DATABASE pfadmin`);
    console.log('Database pfadmin created successfully.');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database pfadmin already exists.');
    } else {
      console.error('Error creating database:', err.message);
      process.exit(1);
    }
  } finally {
    await defaultPool.end();
  }

  console.log('Running migrations...');
  const pool = require('../db');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'instructor', 'admin')) DEFAULT 'student'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, course_id)
      );
    `);

    await client.query('COMMIT');
    console.log('Migrations complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
})();
