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

module.exports = {
  uploadIdentity: async (req, res) => {
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
      let idFrontUrl = null;
      let idBackUrl = null;

      const { photo, video, idFront, idBack, nationalIdNumber } = req.body;

      if (photo) {
        const photoResult = await cloudinary.uploader.upload(photo, {
          resource_type: "image",
          folder: "identity_photos"
        });
        photoUrl = photoResult.secure_url;
      }

      if (video) {
        const videoResult = await cloudinary.uploader.upload(video, {
          resource_type: "video",
          folder: "identity_videos"
        });
        videoUrl = videoResult.secure_url;
      }

      if (idFront) {
        const idFrontResult = await cloudinary.uploader.upload(idFront, {
          resource_type: "image",
          folder: "id_documents"
        });
        idFrontUrl = idFrontResult.secure_url;
      }

      if (idBack) {
        const idBackResult = await cloudinary.uploader.upload(idBack, {
          resource_type: "image",
          folder: "id_documents"
        });
        idBackUrl = idBackResult.secure_url;
      }

      // Validate required identity fields
      if (!nationalIdNumber || (!photoUrl && !photo) || (!idFrontUrl && !idFront)) {
        return res.status(400).json({
          success: false,
          message: "Missing required identity verification data"
        });
      }

      // Update user record with uploaded files and national ID
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (photoUrl) updateData.photo_url = photoUrl;
      if (videoUrl) updateData.liveness_video_url = videoUrl;
      if (idFrontUrl) updateData.id_front_url = idFrontUrl;
      if (idBackUrl) updateData.id_back_url = idBackUrl;
      if (nationalIdNumber) updateData.national_id_number = nationalIdNumber;

      // Only update current_step if identity verification is complete
      if (nationalIdNumber && (photoUrl || photo) && (idFrontUrl || idFront)) {
        updateData.current_step = 'personal';
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', userEmail);

      if (updateError) {
        console.error("🔥 Update Error:", updateError);
        return res.status(500).json({
          success: false,
          message: updateError.message
        });
      }

      console.log("✅ Identity verification data saved for:", userEmail);
      res.status(200).json({
        success: true,
        message: "Identity verification data uploaded successfully",
        current_step: 'personal'
      });

    } catch (error) {
      console.error("🔥 Identity upload error:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error during identity verification save"
      });
    }
  },

  savePersonalInfo: async (req, res) => {
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

      // Get personal info from request body
      const personalData = req.body;

      // Update user record with personal information
      const updateData = {
        ...personalData,
        current_step: 'preferences',
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', userEmail);

      if (updateError) {
        console.error("🔥 Update Error:", updateError);
        return res.status(500).json({
          success: false,
          message: updateError.message
        });
      }

      console.log("✅ Personal info saved for:", userEmail);
      res.status(200).json({
        success: true,
        message: "Personal information saved successfully",
        current_step: 'preferences'
      });

    } catch (error) {
      console.error("🔥 Personal info save error:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error during personal info save"
      });
    }
  },

  savePreferences: async (req, res) => {
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

      // Get preferences from request body
      const preferencesData = req.body;

      // Update user record with preferences
      const updateData = {
        ...preferencesData,
        current_step: 'submission',
        is_complete: true,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', userEmail);

      if (updateError) {
        console.error("🔥 Update Error:", updateError);
        return res.status(500).json({
          success: false,
          message: updateError.message
        });
      }

      console.log("✅ Preferences saved for:", userEmail);
      res.status(200).json({
        success: true,
        message: "Preferences saved successfully",
        current_step: 'submission'
      });

    } catch (error) {
      console.error("🔥 Preferences save error:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error during preferences save"
      });
    }
  },

  getCurrentPreferences: async (req, res) => {
    console.log("📦 Incoming /api/user/current-preferences request...");

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
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (error) {
        console.error("🔥 Get Preferences Error:", error);
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

      console.log("✅ Preferences fetched for:", userEmail);
      res.status(200).json(user);

    } catch (error) {
      console.error("🔥 Get preferences error:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error during preferences fetch"
      });
    }
  },

  updatePreferences: async (req, res) => {
    console.log("📦 Incoming /api/user/update-preferences request...");

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
        console.error("🔥 Update Preferences Error:", checkError);
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

      // Get preferences from request body (don't update current_step for existing users)
      const preferencesData = req.body;
      const updateData = {
        ...preferencesData,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', userEmail);

      if (updateError) {
        console.error("🔥 Update Error:", updateError);
        return res.status(500).json({
          success: false,
          message: updateError.message
        });
      }

      console.log("✅ Preferences updated for:", userEmail);
      res.status(200).json({
        success: true,
        message: "Preferences updated successfully"
      });

    } catch (error) {
      console.error("🔥 Preferences update error:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error during preferences update"
      });
    }
  },

  getUserProgress: async (req, res) => {
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
      console.error("🔥 Get progress error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server error during progress retrieval"
      });
    }
  },

  resetUserSubmission: async (req, res) => {
    console.log("📦 Incoming /api/user/reset-submission request...");

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
      const { data, error } = await supabase
        .from('users')
        .update({
          current_step: 'identity',
          status: 'pending',
          admin_message: null,
          full_name: null,
          dob: null,
          gender: null,
          orientation: null,
          country_of_birth: null,
          country_of_residence: null,
          city: null,
          willing_to_relocate: null,
          languages: null,
          preferred_language: null,
          education: null,
          occupation: null,
          employment_type: null,
          religion: null,
          religious_importance: null,
          political_views: null,
          height: null,
          weight: null,
          skin_color: null,
          body_type: null,
          eye_color: null,
          hair_color: null,
          ethnicity: null,
          diet: null,
          smoking: null,
          drinking: null,
          exercise: null,
          pets: null,
          living_situation: null,
          children: null,
          photo_url: null,
          video_url: null,
          profile_photo_url: null,
          profile_video_url: null,
          id_front_url: null,
          id_back_url: null,
          liveness_video_url: null,
          national_id_number: null,
          is_complete: false
        })
        .eq('email', userEmail)
        .select();

      if (error) {
        console.error("🔥 Reset Submission Error:", error);
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }

      console.log("✅ User submission reset successfully for:", userEmail);
      res.status(200).json({
        success: true,
        message: "User submission reset successfully"
      });

    } catch (err) {
      console.error("🔥 Reset Submission Error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server error during submission reset"
      });
    }
  },

  resetIdentityOnly: async (req, res) => {
    console.log("📦 Incoming /api/user/reset-identity request...");

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
      const { data, error } = await supabase
        .from('users')
        .update({
          current_step: 'identity',
          status: 'pending',
          admin_message: null,
          id_front_url: null,
          id_back_url: null,
          liveness_video_url: null,
          national_id_number: null
        })
        .eq('email', userEmail)
        .select();

      if (error) {
        console.error("🔥 Reset Identity Error:", error);
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }

      console.log("✅ Identity reset successfully for:", userEmail);
      res.status(200).json({
        success: true,
        message: "Identity reset successfully"
      });

    } catch (err) {
      console.error("🔥 Reset Identity Error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server error during identity reset"
      });
    }
  },

  resetPersonalOnly: async (req, res) => {
    console.log("📦 Incoming /api/user/reset-personal request...");

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
      const { data, error } = await supabase
        .from('users')
        .update({
          current_step: 'personal',
          status: 'pending',
          admin_message: null,
          full_name: null,
          dob: null,
          gender: null,
          orientation: null,
          country_of_birth: null,
          country_of_residence: null,
          city: null,
          willing_to_relocate: null,
          languages: null,
          preferred_language: null,
          education: null,
          occupation: null,
          employment_type: null,
          religion: null,
          religious_importance: null,
          political_views: null,
          height: null,
          weight: null,
          skin_color: null,
          body_type: null,
          eye_color: null,
          hair_color: null,
          ethnicity: null,
          diet: null,
          smoking: null,
          drinking: null,
          exercise: null,
          pets: null,
          living_situation: null,
          children: null,
          photo_url: null,
          video_url: null,
          profile_photo_url: null,
          profile_video_url: null
        })
        .eq('email', userEmail)
        .select();

      if (error) {
        console.error("🔥 Reset Personal Error:", error);
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }

      console.log("✅ Personal info reset successfully for:", userEmail);
      res.status(200).json({
        success: true,
        message: "Personal info reset successfully"
      });

    } catch (err) {
      console.error("🔥 Reset Personal Error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server error during personal reset"
      });
    }
  },

  getUserProfilePhoto: async (req, res) => {
    console.log("📦 Incoming /api/user/profile-photo request...");

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

    const userEmail = req.params.email || decoded.email;

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('profile_photo_url')
        .eq('email', userEmail)
        .single();

      if (error) {
        console.error("🔥 Get Profile Photo Error:", error);
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

      console.log("✅ Profile photo fetched for:", userEmail);
      res.status(200).json({
        success: true,
        profile_photo_url: user.profile_photo_url || 'https://via.placeholder.com/100'
      });

    } catch (error) {
      console.error("🔥 Get profile photo error:", error.message);
      res.status(500).json({
        success: false,
        message: "Server error during profile photo fetch"
      });
    }
  }
};