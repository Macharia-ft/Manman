const express = require("express");
const router = express.Router();
const multer = require("multer");
const { savePreferences } = require("../controllers/userController");

// Configure multer for form data
const upload = multer({
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.post("/user/preferences", upload.any(), savePreferences);

module.exports = router;