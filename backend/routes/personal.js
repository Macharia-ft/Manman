const express = require("express");
const router = express.Router();
const { savePersonalInfo } = require("../controllers/userController");

router.post("/user/personal", savePersonalInfo);

module.exports = router;