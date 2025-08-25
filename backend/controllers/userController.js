require("dotenv").config({ path: "./backend/.env" });
const jwt = require("jsonwebtoken");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadIdentity = async (req, res) => {
  console.log("📦 Incoming /api/upload-identity request...");

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 Authenticated:", decoded.email);
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  const userEmail = decoded.email;

  try {
    // Check if user exists in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("🔥 Upload Identity Error:", checkError);
      return res.status(500).json({
        success: false,
        message: checkError.message
      });
    }

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Handle file uploads if present
    let photoUrl = null;
    let videoUrl = null;

    if (req.files) {
      if (req.files.photo) {
        const photoResult = await cloudinary.uploader.upload(req.files.photo.tempFilePath, {
          folder: "takeyours/identity_photos",
          resource_type: "image",
        });
        photoUrl = photoResult.secure_url;
        fs.unlinkSync(req.files.photo.tempFilePath);
      }

      if (req.files.video) {
        const videoResult = await cloudinary.uploader.upload(req.files.video.tempFilePath, {
          folder: "takeyours/identity_videos",
          resource_type: "video",
        });
        videoUrl = videoResult.secure_url;
        fs.unlinkSync(req.files.video.tempFilePath);
      }
    }

    // Update user with identity information
    const updateData = {
      current_step: 'personal',
      ...(photoUrl && { profile_photo_url: photoUrl }),
      ...(videoUrl && { profile_video_url: videoUrl })
    };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', userEmail)
      .select();

    if (error) {
      console.error("🔥 Upload Identity Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log("✅ Identity uploaded successfully for:", userEmail);
    res.status(200).json({
      success: true,
      message: "Identity uploaded successfully",
      current_step: 'personal'
    });

  } catch (err) {
    console.error("🔥 Upload Identity Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error during identity upload"
    });
  }
};

module.exports = { uploadIdentity };