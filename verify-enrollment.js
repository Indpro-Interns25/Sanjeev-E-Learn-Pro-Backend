require('dotenv').config();
const pool = require('./db');

async function verify() {
  console.log('✅ VERIFICATION REPORT\n');
  
  console.log('1. Enrollments Table Structure:');
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'enrollments' ORDER BY ordinal_position");
  console.log('   Columns:', cols.rows.map(r => r.column_name).join(', '));
  
  const enrollCount = await pool.query('SELECT COUNT(*) as count FROM enrollments');
  console.log('\n2. Total Enrollments:', enrollCount.rows[0].count);
  
  const activeEnroll = await pool.query('SELECT COUNT(*) as count FROM enrollments WHERE is_active = true');
  console.log('   Active Enrollments:', activeEnroll.rows[0].count);
  
  console.log('\n3. Sample My Learning Query:');
  const sample = await pool.query("SELECT c.title, ce.is_active, ce.progress FROM courses c JOIN enrollments ce ON c.id = ce.course_id WHERE ce.is_active = true LIMIT 3");
  sample.rows.forEach(r => console.log('   -', r.title, '| Active:', r.is_active, '| Progress:', r.progress + '%'));
  
  console.log('\n✅ System ready!');
  pool.end();
}

verify().catch(err => {
  console.error(err.message);
  pool.end();
});
