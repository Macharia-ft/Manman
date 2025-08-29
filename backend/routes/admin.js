const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Admin login attempt:', email);

    // Query admin from Supabase
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!data) {
      console.log('No admin found with email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(password, data.password_hash);
    if (!isValid) {
      console.log('Invalid password for admin:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: data.id, email: data.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Admin login successful:', email);
    res.json({ 
      message: 'Login successful',
      token,
      admin: { id: data.id, email: data.email }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users (admin only)
router.get("/users", authenticateAdmin, adminController.getAllUsers);

// Update user status (admin only)
router.post("/user/status", authenticateAdmin, adminController.updateUserStatus);

// Get user by ID (admin only)
router.get("/users/:id", authenticateAdmin, adminController.getUserById);

// Grant premium access to a user (admin only)
router.post("/grant-premium", authenticateAdmin, adminController.grantPremiumAccess);

// Remove premium access from a user (admin only)
router.post("/remove-premium", authenticateAdmin, adminController.removePremiumAccess);

module.exports = router;