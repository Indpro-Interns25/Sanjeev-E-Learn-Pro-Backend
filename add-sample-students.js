const pool = require('./db');

async function addSampleStudents() {
  try {
    console.log('Adding sample students...');
    
    const students = [
      { name: 'John Doe', email: 'john.doe@student.com', password: 'hashedpassword123', role: 'student' },
      { name: 'Jane Smith', email: 'jane.smith@student.com', password: 'hashedpassword123', role: 'student' },
      { name: 'Mike Johnson', email: 'mike.johnson@student.com', password: 'hashedpassword123', role: 'student' }
    ];
    
    for (const student of students) {
      try {
        await pool.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
          [student.name, student.email, student.password, student.role]
        );
        console.log(`✅ Added student: ${student.name}`);
      } catch (error) {
        console.log(`❌ Error adding ${student.name}:`, error.message);
      }
    }
    
    // Check total students
    const result = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    console.log(`📊 Total students in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

addSampleStudents();