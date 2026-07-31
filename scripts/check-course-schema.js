const pool = require('../db');

async function main() {
  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('tags','course_tags','courses')"
  );
  console.log('Tables:', tables.rows.map((r) => r.tablename));

  const cols = await pool.query(
    "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='courses' AND column_name='thumbnail'"
  );
  console.log('thumbnail col:', cols.rows);

  try {
    await pool.query('SELECT 1 FROM tags LIMIT 1');
    console.log('tags table: ok');
  } catch (error) {
    console.log('tags table error:', error.message);
  }

  try {
    await pool.query('SELECT 1 FROM course_tags LIMIT 1');
    console.log('course_tags table: ok');
  } catch (error) {
    console.log('course_tags table error:', error.message);
  }

  const instructors = await pool.query(
    "SELECT id, email, role FROM users WHERE role = 'instructor' LIMIT 3"
  );
  console.log('instructors:', instructors.rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
