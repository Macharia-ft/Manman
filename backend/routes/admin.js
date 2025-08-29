const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
router.get("/admin/users", adminController.getAllUsers);

// Update user status (admin only)
router.post("/admin/user/status", adminController.updateUserStatus);

// Get user by ID (admin only)
router.get("/admin/users/:id", adminController.getUserById);

// Grant premium access to a user (admin only)
router.post("/admin/grant-premium", adminController.grantPremiumAccess);

// Remove premium access from a user (admin only)
router.post("/admin/remove-premium", adminController.removePremiumAccess);

module.exports = router;