require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool
  .connect()
  .then(client => {
    return client
      .query('SELECT 1')
      .then(() => {
        console.log('[DB] PostgreSQL connection established.');
        client.release();
      })
      .catch(err => {
        client.release();
        console.error('[DB] Connection test failed:', err.message);
      });
  })
  .catch(err => console.error('[DB] Could not connect to PostgreSQL:', err.message));

module.exports = pool;
