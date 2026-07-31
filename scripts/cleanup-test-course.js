require('dotenv').config();
const pool = require('../db');

pool
  .query("DELETE FROM courses WHERE title = 'Schema test'")
  .then((result) => {
    console.log('deleted', result.rowCount);
  })
  .finally(() => pool.end());
