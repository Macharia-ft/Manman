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

const savePersonalInfo = async (req, res) => {
  console.log("📦 Incoming /api/user/personal request...");

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
      console.error("🔥 Save Personal Info Error:", checkError);
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
        const photoResult = await cloudinary.uploader.upload(req.files.photo[0].path, {
          folder: "takeyours/personal_photos",
          resource_type: "image",
        });
        photoUrl = photoResult.secure_url;
        fs.unlinkSync(req.files.photo[0].path);
      }

      if (req.files.video) {
        const videoResult = await cloudinary.uploader.upload(req.files.video[0].path, {
          folder: "takeyours/personal_videos",
          resource_type: "video",
        });
        videoUrl = videoResult.secure_url;
        fs.unlinkSync(req.files.video[0].path);
      }
    }

    // Extract personal information from request body
    const {
      full_name,
      dob,
      country_of_birth,
      city_of_birth,
      gender,
      occupation,
      education_level,
      marital_status,
      children_count,
      hobbies,
      interests,
      bio
    } = req.body;

    // Update user with personal information
    const updateData = {
      current_step: 'preferences',
      full_name,
      dob,
      country_of_birth,
      city_of_birth,
      gender,
      occupation,
      education_level,
      marital_status,
      children_count: children_count ? parseInt(children_count) : null,
      hobbies,
      interests,
      bio,
      ...(photoUrl && { profile_photo_url: photoUrl }),
      ...(videoUrl && { profile_video_url: videoUrl })
    };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', userEmail)
      .select();

    if (error) {
      console.error("🔥 Save Personal Info Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log("✅ Personal info saved successfully for:", userEmail);
    res.status(200).json({
      success: true,
      message: "Personal information saved successfully",
      current_step: 'preferences'
    });

  } catch (err) {
    console.error("🔥 Save Personal Info Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error during personal info save"
    });
  }
};

const savePreferences = async (req, res) => {
  console.log("📦 Incoming /api/user/preferences request...");

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
      console.error("🔥 Save Preferences Error:", checkError);
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

    // Extract preferences from request body
    const {
      pref_gender,
      pref_age_min,
      pref_age_max,
      pref_country_of_birth,
      pref_country_of_residence,
      pref_county_of_residence,
      pref_country,
      pref_languages,
      pref_religion,
      pref_religion_importance,
      pref_height,
      pref_weight,
      pref_body_type,
      pref_skin_color,
      pref_ethnicity,
      pref_diet,
      pref_smoking,
      pref_drinking,
      pref_exercise,
      pref_pets,
      pref_children,
      pref_living_situation,
      pref_willing_to_relocate,
      pref_relationship_type
    } = req.body;

    // Update user with preferences
    const updateData = {
      current_step: 'submission',
      pref_gender,
      pref_age_min,
      pref_age_max,
      pref_country_of_birth,
      pref_country_of_residence,
      pref_county_of_residence,
      pref_country,
      pref_languages,
      pref_religion,
      pref_religion_importance,
      pref_height,
      pref_weight,
      pref_body_type,
      pref_skin_color,
      pref_ethnicity,
      pref_diet,
      pref_smoking,
      pref_drinking,
      pref_exercise,
      pref_pets,
      pref_children,
      pref_living_situation,
      pref_willing_to_relocate,
      pref_relationship_type
    };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', userEmail)
      .select();

    if (error) {
      console.error("🔥 Save Preferences Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log("✅ Preferences saved successfully for:", userEmail);
    res.status(200).json({
      success: true,
      message: "Preferences saved successfully",
      current_step: 'submission'
    });

  } catch (err) {
    console.error("🔥 Save Preferences Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error during preferences save"
    });
  }
};

const getUserProgress = async (req, res) => {
  console.log("📦 Incoming /api/user/progress request...");

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
    // Get user progress from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('current_step, status')
      .eq('email', userEmail)
      .single();

    if (error) {
      console.error("🔥 Get Progress Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("✅ Progress retrieved for:", userEmail, "Step:", user.current_step, "Status:", user.status);
    res.status(200).json({
      success: true,
      current_step: user.current_step || 'identity',
      status: user.status || 'pending'
    });

  } catch (err) {
    console.error("🔥 Get Progress Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error during progress retrieval"
    });
  }
};

module.exports = { uploadIdentity, savePersonalInfo, savePreferences, getUserProgress };