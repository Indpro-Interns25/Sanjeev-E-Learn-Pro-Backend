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

async function updateEnrollmentsTable() {
  try {
    console.log('🔧 Updating enrollments table structure...\n');

    // Add missing columns to enrollments table
    console.log('Adding is_active column...');
    await pool.query(`
      ALTER TABLE enrollments 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);
    
    console.log('Adding progress column...');
    await pool.query(`
      ALTER TABLE enrollments 
      ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0
    `);
    
    console.log('Adding completed_at column...');
    await pool.query(`
      ALTER TABLE enrollments 
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
    `);
    
    console.log('Adding last_accessed_at column...');
    await pool.query(`
      ALTER TABLE enrollments 
      ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP
    `);

    console.log('\n✅ Enrollments table updated successfully!');

    // Show the updated structure
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'enrollments' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated enrollments table structure:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}) ${row.column_default ? 'DEFAULT: ' + row.column_default : ''}`);
    });

    // Update existing enrollments to have is_active = true
    console.log('\n🔄 Updating existing enrollments...');
    const updateResult = await pool.query(`
      UPDATE enrollments 
      SET is_active = true 
      WHERE is_active IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} existing enrollments`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateEnrollmentsTable();
