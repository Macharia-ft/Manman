const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getUserProgress,
  resetUserSubmission,
  resetIdentityOnly,
  resetPersonalOnly,
  savePersonalInfo,
  savePreferences,
  getCurrentPreferences,
  updatePreferences,
  getUserProfilePhoto
} = require("../controllers/userController");

// Configure multer for personal info files
const personalUpload = multer({
  dest: path.join(__dirname, "../temp"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

router.get("/progress", getUserProgress);
router.post("/reset-submission", resetUserSubmission);
router.post("/reset-identity", resetIdentityOnly);
router.post("/reset-personal", resetPersonalOnly);
router.post("/personal", personalUpload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'profileVideo', maxCount: 1 }
]), savePersonalInfo);
router.post("/preferences", savePreferences);
router.get("/current-preferences", getCurrentPreferences);
router.post("/update-preferences", updatePreferences);
router.get("/profile-photo/:email", getUserProfilePhoto);

module.exports = router;