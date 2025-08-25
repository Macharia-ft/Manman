
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/reset-submission", userController.resetUserSubmission);
router.post("/reset-identity", userController.resetIdentityOnly);
router.post("/reset-personal", userController.resetPersonalOnly);
router.get("/progress", userController.getUserProgress);
router.post("/save-personal-info", userController.savePersonalInfo);
router.post("/save-preferences", userController.savePreferences);

module.exports = router;
