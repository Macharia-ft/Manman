const { Pool } = require("pg");
require("dotenv").config({ path: "./backend/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
