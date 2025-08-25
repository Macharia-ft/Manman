const bcrypt = require("bcrypt");
const { Pool } = require("pg");
require("dotenv").config();

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const email = "takeyours001@gmail.com";
  const password = "0768012671is"; // change this!
  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO admins (email, password_hash) VALUES ($1, $2)",
    [email, hashed]
  );

  console.log("✅ Admin created successfully.");
  process.exit();
})();
