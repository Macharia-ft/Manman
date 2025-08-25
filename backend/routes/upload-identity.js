const express = require("express");
const router = express.Router();
const { uploadIdentity } = require("../controllers/userController");

// Updated to include Supabase client and connection testing
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error("❌ Supabase connection test failed:", error.message);
      return false;
    }
    console.log("✅ Supabase connection successful");
    return true;
  } catch (err) {
    console.error("❌ Supabase connection error:", err.message);
    return false;
  }
}

// Updated to include connection test before processing uploads
router.post("/upload-identity", upload.fields([
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
  { name: "video", maxCount: 1 }
]), async (req, res) => {
  console.log("📦 Incoming /api/upload-identity request...");

  // Test Supabase connection first
  const connectionTest = await testSupabaseConnection();
  if (!connectionTest) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed. Please check your Supabase configuration."
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  const { idFront, idBack, video } = req.files;
  const { userEmail } = req.body;

  if (!userEmail || (!idFront && !idBack && !video)) {
    return res.status(400).json({
      success: false,
      message: "Missing user email or identity files.",
    });
  }

  try {
    let idFrontUrl = null;
    let idBackUrl = null;
    let livenessVideoUrl = null;
    let idFrontPublicId = null;
    let idBackPublicId = null;
    let livenessPublicId = null;

    // Upload idFront if exists
    if (idFront && idFront.length > 0) {
      const idFrontUploadResult = await uploadToCloudinary(idFront[0].path, "identity_front");
      idFrontUrl = idFrontUploadResult.url;
      idFrontPublicId = idFrontUploadResult.public_id;
      fs.unlink(idFront[0].path, () => {}); // Delete temp file
    }

    // Upload idBack if exists
    if (idBack && idBack.length > 0) {
      const idBackUploadResult = await uploadToCloudinary(idBack[0].path, "identity_back");
      idBackUrl = idBackUploadResult.url;
      idBackPublicId = idBackUploadResult.public_id;
      fs.unlink(idBack[0].path, () => {}); // Delete temp file
    }

    // Upload video if exists
    if (video && video.length > 0) {
      const videoUploadResult = await uploadToCloudinary(video[0].path, "liveness_video");
      livenessVideoUrl = videoUploadResult.url;
      livenessPublicId = videoUploadResult.public_id;
      fs.unlink(video[0].path, () => {}); // Delete temp file
    }

    // Update user record in Supabase
    const { data, error } = await supabase
      .from('users')
      .update({
        current_step: 'personal',
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        liveness_video_url: livenessVideoUrl,
        id_front_public_id: idFrontPublicId,
        id_back_public_id: idBackPublicId,
        liveness_public_id: livenessPublicId
      })
      .eq('email', userEmail)
      .select();

    if (error) {
      console.error("❌ Database update error:", error);
      console.error("❌ Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database update failed: ${error.message}`);
    }

    console.log("✅ Database update successful for:", userEmail);
    console.log("✅ Updated data:", data);

    res.status(200).json({
      success: true,
      message: "Identity uploaded and user record updated successfully.",
      data: data,
    });
  } catch (err) {
    console.error("❌ Identity upload failed:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;