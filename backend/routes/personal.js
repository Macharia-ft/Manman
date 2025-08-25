
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const userController = require("../controllers/userController");

const router = express.Router();

// ✅ Temp storage + file filtering
const upload = multer({
  dest: "temp/",
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "video/mp4", "video/webm"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// ✅ Save personal info (photo + video + data)
router.post(
  "/user/personal",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  userController.savePersonalInfo
);

module.exports = router;
