
const jwt = require("jsonwebtoken");
const db = require("../db");

exports.getUserStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const result = await db.query("SELECT status, admin_message FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const { status, admin_message } = result.rows[0];

    return res.json({ status, adminMessage: admin_message });
  } catch (err) {
    console.error("Status check error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};
