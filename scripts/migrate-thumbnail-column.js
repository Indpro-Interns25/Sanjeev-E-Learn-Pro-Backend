require('dotenv').config();
const { initializeSchema } = require('../services/schemaInitializer');
const pool = require('../db');

initializeSchema()
  .then(() => {
    console.log('Schema migration completed');
  })
  .catch((error) => {
    console.error('Schema migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
