const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// Admin login
router.post("/admin/login", adminController.adminLogin);

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