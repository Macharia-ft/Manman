
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read the SQL file
    const sqlScript = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
    
    // Execute the SQL script
    await pool.query(sqlScript);
    
    console.log("✅ Database tables created successfully!");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
