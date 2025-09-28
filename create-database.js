const { Pool } = require('pg');
require('dotenv').config();

async function createDatabase() {
  console.log('🔧 Creating pfadmin database...\n');
  
  // Connect to postgres database (default) to create pfadmin
  const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: 'postgres', // Connect to default postgres database
    ssl: process.env.PG_SSL === 'true'
  });

  try {
    // Check if pfadmin database exists
    const result = await pool.query("SELECT 1 FROM pg_database WHERE datname = 'pfadmin'");
    
    if (result.rows.length === 0) {
      console.log('🔨 Creating pfadmin database...');
      await pool.query('CREATE DATABASE pfadmin');
      console.log('✅ Database pfadmin created successfully!');
    } else {
      console.log('✅ Database pfadmin already exists!');
    }
    
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
  } finally {
    await pool.end();
  }
}

createDatabase();