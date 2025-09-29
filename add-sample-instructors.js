const pool = require('./db');

async function addSampleInstructors() {
  try {
    console.log('Adding sample instructors...');
    
    const instructors = [
      { name: 'Dr. Sarah Wilson', email: 'sarah.wilson@instructor.com', password: 'hashedpassword123', role: 'instructor' },
      { name: 'Prof. Michael Brown', email: 'michael.brown@instructor.com', password: 'hashedpassword123', role: 'instructor' },
      { name: 'Dr. Emily Davis', email: 'emily.davis@instructor.com', password: 'hashedpassword123', role: 'instructor' }
    ];
    
    for (const instructor of instructors) {
      try {
        await pool.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
          [instructor.name, instructor.email, instructor.password, instructor.role]
        );
        console.log(`✅ Added instructor: ${instructor.name}`);
      } catch (error) {
        console.log(`❌ Error adding ${instructor.name}:`, error.message);
      }
    }
    
    // Check total instructors
    const result = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'instructor'");
    console.log(`📊 Total instructors in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

addSampleInstructors();