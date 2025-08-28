const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    console.log('Admin login attempt:', username);

    // Query admin from Supabase
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!data) {
      console.log('No admin found with username:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(password, data.password);
    if (!isValid) {
      console.log('Invalid password for admin:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: data.id, username: data.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Admin login successful:', username);
    res.json({ 
      message: 'Login successful',
      token,
      admin: { id: data.id, username: data.username }
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