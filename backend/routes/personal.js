const express = require("express");
const router = express.Router();
const multer = require("multer");
const { savePersonalInfo } = require("../controllers/userController");

// Configure multer for form data
const upload = multer({
  dest: 'backend/temp/',
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
});

// Use upload.any() to handle all form fields including files
router.post("/user/personal", upload.any(), savePersonalInfo);

module.exports = router;