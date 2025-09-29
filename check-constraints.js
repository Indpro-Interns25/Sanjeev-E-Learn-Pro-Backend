const pool = require('./db');

async function checkConstraints() {
  try {
    const result = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'courses'::regclass 
      AND contype = 'c'
    `);
    
    console.log('Check constraints on courses table:');
    result.rows.forEach(row => {
      console.log(`${row.constraint_name}: ${row.constraint_definition}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkConstraints();