require('dotenv').config();
const pool = require('../db');

async function main() {
  const { rows: updated } = await pool.query(
    `UPDATE users
     SET role = 'instructor'
     WHERE email IN ($1, $2)
     RETURNING id, name, email, role`,
    ['testinstructor@gmail.com', 'testinstructor1@gmail.com']
  );

  console.log('Updated users:');
  console.log(JSON.stringify(updated, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
