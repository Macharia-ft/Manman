
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// ✅ Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query("SELECT * FROM admins WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { adminId: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Admin login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const result = await db.query(`
      SELECT id, email, full_name, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (err) {
    console.error("Get users error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get single user by ID (INCLUDES NATIONAL ID)
exports.getUserById = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const userId = req.params.id;

    const result = await db.query(
      `SELECT *, national_id_number FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Get user by ID error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Approve/disapprove user
exports.updateUserStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const userId = req.params.id;
    const { status, admin_message } = req.body;

    if (!["approved", "disapproved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await db.query(
      `UPDATE users 
       SET status = $1, admin_message = $2, current_step = 
         CASE 
           WHEN $1 = 'approved' THEN 'dashboard'
           ELSE current_step 
         END 
       WHERE id = $3`,
      [status, admin_message || null, userId]
    );

    res.json({ success: true, message: "User status updated" });
  } catch (err) {
    console.error("Update user status error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
