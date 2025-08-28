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
router.put("/update-preferences", updatePreferences);
router.get("/profile-photo/:email", getUserProfilePhoto);
router.post("/update-media", personalUpload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'profileVideo', maxCount: 1 }
]), require("../controllers/userController").updateMedia);

// Add subscription status endpoint
router.get("/subscription-status", async (req, res) => {
  try {
    // For now, return free for all users - you can implement subscription logic later
    res.json({ subscription: 'free' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add conversations endpoint
router.get("/conversations", async (req, res) => {
  try {
    // Return empty array for now - implement when you have the conversations table
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;