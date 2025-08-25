
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// ✅ Admin login
router.post("/admin/login", adminController.adminLogin);

// ✅ Get all users
router.get("/admin/users", adminController.getAllUsers);

// ✅ Get a single user's full info
router.get("/admin/user/:id", adminController.getUserById);

// ✅ Approve/disapprove user
router.post("/admin/user/:id/status", adminController.updateUserStatus);

module.exports = router;
