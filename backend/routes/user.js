const express = require("express");
const router = express.Router();
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

router.get("/progress", getUserProgress);
router.post("/reset-submission", resetUserSubmission);
router.post("/reset-identity", resetIdentityOnly);
router.post("/reset-personal", resetPersonalOnly);
router.post("/personal", savePersonalInfo);
router.post("/preferences", savePreferences);
router.get("/current-preferences", getCurrentPreferences);
router.post("/update-preferences", updatePreferences);
router.get("/profile-photo/:email", getUserProfilePhoto);

module.exports = router;