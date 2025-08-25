
const express = require("express");
const userController = require("../controllers/userController");
const router = express.Router();

// ✅ Save Match Preferences
router.post("/user/preferences", (req, res) => userController.savePreferences(req, res));

// ✅ Get Smart Session Progress
router.get("/user/progress", (req, res) => userController.getUserProgress(req, res));

module.exports = router;
