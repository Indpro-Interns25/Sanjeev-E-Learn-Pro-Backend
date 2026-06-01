require('dotenv').config();
const { Pool } = require('pg');

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

const databaseUrl = readEnv('DATABASE_URL', 'DB_URL');
const pgHost = readEnv('PG_HOST', 'DB_HOST');
const pgPort = Number(readEnv('PG_PORT', 'DB_PORT') || 5432);
const pgDatabase = readEnv('PG_DATABASE', 'DB_DATABASE', 'DB_NAME');
const pgUser = readEnv('PG_USER', 'DB_USER');
const pgPassword = readEnv('PG_PASSWORD', 'DB_PASSWORD');
const pgSsl = readEnv('PG_SSL', 'DB_SSL');

const useSsl = ['true', '1', 'yes', 'require'].includes(pgSsl.toLowerCase()) ||
  Boolean(databaseUrl && databaseUrl.includes('neon.tech')) ||
  Boolean(pgHost && pgHost.includes('neon.tech'));

const poolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
    }
  : {
      host: pgHost,
      port: pgPort,
      database: pgDatabase,
      user: pgUser,
      password: pgPassword,
    };

const pool = new Pool({
  ...poolConfig,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: Number(readEnv('PG_POOL_MAX', 'DB_POOL_MAX') || 20),
  idleTimeoutMillis: Number(readEnv('PG_IDLE_TIMEOUT_MS', 'DB_IDLE_TIMEOUT_MS') || 30000),
  connectionTimeoutMillis: Number(readEnv('PG_CONNECTION_TIMEOUT_MS', 'DB_CONNECTION_TIMEOUT_MS') || 15000),
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
