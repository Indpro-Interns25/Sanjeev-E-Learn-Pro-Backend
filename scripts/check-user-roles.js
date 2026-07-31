require('dotenv').config();
const pool = require('../db');

async function main() {
  const { rows } = await pool.query(
    'SELECT id, name, email, role FROM users ORDER BY id DESC LIMIT 20'
  );
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
