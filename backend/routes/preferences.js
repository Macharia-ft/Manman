
const express = require("express");
const router = express.Router();
const { savePreferences } = require("../controllers/userController");

router.post("/user/preferences", savePreferences);

module.exports = router;
