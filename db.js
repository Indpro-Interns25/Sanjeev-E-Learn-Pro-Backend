require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
