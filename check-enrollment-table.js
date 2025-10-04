const pool = require('./db');

async function checkEnrollmentTable() {
  try {
    console.log('🔍 Checking enrollment table structure...\n');
    
    // Check if enrollments table exists
    const enrollmentsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enrollments'
      );
    `);
    console.log('❓ enrollments table exists:', enrollmentsTable.rows[0].exists);
    
    // Check if course_enrollments table exists
    const courseEnrollmentsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'course_enrollments'
      );
    `);
    console.log('❓ course_enrollments table exists:', courseEnrollmentsTable.rows[0].exists);
    
    // Check course_enrollments structure
    if (courseEnrollmentsTable.rows[0].exists) {
      console.log('\n📋 course_enrollments table structure:');
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'course_enrollments' 
        ORDER BY ordinal_position;
      `);
      console.table(structure.rows);
      
      // Check sample data
      const sampleData = await pool.query('SELECT * FROM course_enrollments LIMIT 5');
      console.log('\n📊 Sample course_enrollments data:');
      console.table(sampleData.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkEnrollmentTable();