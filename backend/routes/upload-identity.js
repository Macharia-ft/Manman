
const express = require("express");
const multer = require("multer");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: "temp/" });

const uploadToCloudinary = async (filePath, resourceType = "auto") => {
  try {
    const result = await cloudinary.uploader.unsigned_upload(filePath, "takeyours", {
      resource_type: resourceType,
    });
    fs.unlinkSync(filePath);
    return result;
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new Error("Cloud upload failed");
  }
};

router.post(
  "/upload-identity",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
  ]),
  async (req, res) => {
    console.log("📦 Incoming /api/upload-identity request...");

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ success: false, message: "Missing token" });
      }

      const token = authHeader.split(" ")[1];
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token" });
      }

      const email = decoded.email;
      console.log("🔐 Authenticated:", email);

      if (!req.files || !req.files.video || !req.files.idFront || !req.files.idBack) {
        return res.status(400).json({ success: false, message: "Missing required files" });
      }

      const videoRes = await uploadToCloudinary(req.files.video[0].path, "video");
      const frontRes = await uploadToCloudinary(req.files.idFront[0].path, "image");
      const backRes = await uploadToCloudinary(req.files.idBack[0].path, "image");

      const result = await pool.query(
        `UPDATE users 
         SET id_front_url = $1, 
             id_back_url = $2, 
             liveness_video_url = $3,
             id_front_public_id = $4,
             id_back_public_id = $5,
             liveness_public_id = $6,
             current_step = 'personal'
         WHERE email = $7`,
        [
          frontRes.secure_url,
          backRes.secure_url,
          videoRes.secure_url,
          frontRes.public_id,
          backRes.public_id,
          videoRes.public_id,
          email
        ]
      );

      if (result.rowCount === 0) {
        console.error("❌ No user updated. Email might not exist:", email);
        return res.status(404).json({
          success: false,
          message: "User not found. Identity not saved.",
        });
      }

      console.log("✅ Identity info saved for:", email);
      return res.json({ success: true, message: "Identity uploaded successfully." });

    } catch (err) {
      console.error("🔥 Upload Identity Error:", err.message);
      return res.status(500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  }
);

module.exports = router;
