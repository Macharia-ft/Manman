
const express = require("express");
const router = express.Router();
const { uploadIdentity } = require("../controllers/userController");

router.post("/upload-identity", uploadIdentity);

module.exports = router;
