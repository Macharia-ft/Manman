
const express = require("express");
const router = express.Router();
const { getUserProgress } = require("../controllers/userController");

router.get("/progress", getUserProgress);

module.exports = router;
