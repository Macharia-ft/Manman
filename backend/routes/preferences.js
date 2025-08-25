
const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router();

// ✅ Save Match Preferences
router.post("/user/preferences", userController.savePreferences);

// ✅ Get Smart Session Progress
router.get("/user/progress", userController.getUserProgress);

module.exports = router;
