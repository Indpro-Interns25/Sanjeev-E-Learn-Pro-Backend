require('dotenv').config();
const { Pool } = require('pg');

const useSsl = ['true', '1', 'yes', 'require'].includes((process.env.PG_SSL || '').toLowerCase());

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT || 5432),
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD || '',
    };

const pool = new Pool({
  ...poolConfig,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
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
