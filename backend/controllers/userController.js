
require("dotenv").config({ path: "./backend/.env" });
const jwt = require("jsonwebtoken");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🌥️ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Upload Helper
const uploadToCloudinary = async (filePath, resourceType = "auto") => {
  try {
    const result = await cloudinary.uploader.unsigned_upload(filePath, "takeyours", {
      resource_type: resourceType,
    });
    fs.unlinkSync(filePath);
    return result;
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new Error("Upload failed");
  }
};

// ✅ Delete Helper
const deleteCloudinaryAsset = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.warn(`⚠️ Cloudinary delete failed for ${publicId}:`, err.message);
  }
};

// ✅ Save Personal Info
exports.savePersonalInfo = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: "Missing token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const photo = req.files?.photo?.[0] || null;
    const video = req.files?.video?.[0] || null;
    let photoUrl = null, videoUrl = null;
    let photoId = null, videoId = null;

    if (photo) {
      const result = await uploadToCloudinary(photo.path, "image");
      photoUrl = result.secure_url;
      photoId = result.public_id;
    }
    if (video) {
      const result = await uploadToCloudinary(video.path, "video");
      videoUrl = result.secure_url;
      videoId = result.public_id;
    }

    const {
      full_name = null, dob = null, gender = null, orientation = null,
      country_of_birth = null, country_of_residence = null, county_of_residence = null,
      willing_to_relocate = null, preferred_language = null, education = null, occupation = null,
      employment_type = null, religion = null, religious_importance = null, political_views = null,
      height = null, weight = null, skin_color = null, body_type = null, eye_color = null,
      hair_color = null, ethnicity = null, diet = null, smoking = null, drinking = null,
      exercise = null, pets = null, living_situation = null, children = null
    } = req.body;

    const languagesRaw = req.body.languages || [];
    const languages = Array.isArray(languagesRaw)
      ? languagesRaw.filter(Boolean)
      : [languagesRaw].filter(Boolean);

    const updateData = {
      full_name, dob, gender, orientation,
      country_of_birth, country_of_residence, county_of_residence,
      willing_to_relocate, languages, preferred_language,
      education, occupation, employment_type,
      religion, religious_importance, political_views,
      height, weight, skin_color, body_type,
      eye_color, hair_color, ethnicity,
      diet, smoking, drinking, exercise,
      pets, living_situation, children,
      current_step: 'preferences'
    };

    if (photoUrl) updateData.profile_photo_url = photoUrl;
    if (videoUrl) updateData.profile_video_url = videoUrl;
    if (photoId) updateData.profile_photo_public_id = photoId;
    if (videoId) updateData.profile_video_public_id = videoId;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', email)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ success: false, message: "Server error saving personal info." });
    }

    return res.json({ success: true, message: "Personal info saved", userId: decoded.userId || null });
  } catch (err) {
    console.error("🔥 Personal Info Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error saving personal info." });
  }
};

// ✅ Save Match Preferences
exports.savePreferences = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: "Missing token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const {
      pref_gender = null, pref_age_min = null, pref_age_max = null,
      pref_country_of_birth = null, pref_country_of_residence = null, pref_county_of_residence = null,
      pref_country = null, pref_languages = [],
      pref_religion = null, pref_religion_importance = null,
      pref_height = null, pref_weight = null, pref_body_type = null,
      pref_skin_color = null, pref_ethnicity = null, pref_diet = null,
      pref_smoking = null, pref_drinking = null, pref_exercise = null,
      pref_pets = null, pref_children = null, pref_living_situation = null,
      pref_willing_to_relocate = null, pref_relationship_type = null
    } = req.body;

    const prefLangs = Array.isArray(pref_languages)
      ? pref_languages.filter(Boolean)
      : [pref_languages].filter(Boolean);

    const { data, error } = await supabase
      .from('users')
      .update({
        pref_gender, pref_age_min, pref_age_max,
        pref_country_of_birth, pref_country_of_residence, pref_county_of_residence,
        pref_country, pref_languages: prefLangs,
        pref_religion, pref_religion_importance,
        pref_height, pref_weight, pref_body_type,
        pref_skin_color, pref_ethnicity, pref_diet,
        pref_smoking, pref_drinking, pref_exercise,
        pref_pets, pref_children, pref_living_situation,
        pref_willing_to_relocate, pref_relationship_type,
        current_step: 'submission',
        is_complete: true
      })
      .eq('email', email)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ success: false, message: "Server error saving preferences." });
    }

    return res.status(200).json({ success: true, message: "Preferences updated successfully." });
  } catch (error) {
    console.error("🔥 Preferences Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error saving preferences." });
  }
};

// ✅ Get User Progress (includes admin_message)
exports.getUserProgress = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const { data, error } = await supabase
      .from('users')
      .select('current_step, status, admin_message')
      .eq('email', email)
      .single();

    if (error || !data) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          email: email,
          current_step: 'identity',
          status: 'pending'
        }]);

      if (insertError) {
        console.error("Insert error:", insertError);
      }

      return res.status(200).json({
        current_step: "identity",
        status: "pending",
        adminMessage: null
      });
    }

    return res.status(200).json({
      current_step: data.current_step || "identity",
      status: data.status || "pending",
      adminMessage: data.admin_message || null
    });

  } catch (err) {
    console.error("🔥 Progress Error:", err.message);
    return res.status(500).json({ message: "Server error fetching progress" });
  }
};

// ✅ Reset All
exports.resetUserSubmission = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id_front_public_id, id_back_public_id, liveness_public_id, profile_photo_public_id, profile_video_public_id')
      .eq('email', email)
      .single();

    if (!fetchError && user) {
      await deleteCloudinaryAsset(user.id_front_public_id);
      await deleteCloudinaryAsset(user.id_back_public_id);
      await deleteCloudinaryAsset(user.liveness_public_id);
      await deleteCloudinaryAsset(user.profile_photo_public_id);
      await deleteCloudinaryAsset(user.profile_video_public_id);
    }

    const { error } = await supabase
      .from('users')
      .update({
        id_front_url: null, id_back_url: null, liveness_video_url: null,
        full_name: null, dob: null, gender: null, orientation: null,
        country_of_birth: null, country_of_residence: null, county_of_residence: null,
        willing_to_relocate: null, languages: null, preferred_language: null,
        education: null, occupation: null, employment_type: null,
        religion: null, religious_importance: null, political_views: null,
        height: null, weight: null, skin_color: null, body_type: null,
        eye_color: null, hair_color: null, ethnicity: null,
        diet: null, smoking: null, drinking: null, exercise: null,
        pets: null, living_situation: null, children: null,
        profile_photo_url: null, profile_video_url: null,
        pref_gender: null, pref_age_min: null, pref_age_max: null,
        pref_country_of_birth: null, pref_country_of_residence: null, pref_county_of_residence: null,
        pref_country: null, pref_languages: null, pref_religion: null,
        pref_religion_importance: null, pref_height: null, pref_weight: null,
        pref_body_type: null, pref_skin_color: null, pref_ethnicity: null,
        pref_diet: null, pref_smoking: null, pref_drinking: null, pref_exercise: null,
        pref_pets: null, pref_children: null, pref_living_situation: null,
        pref_willing_to_relocate: null, pref_relationship_type: null,
        is_complete: false, current_step: 'identity', status: 'pending',
        admin_message: null,
        id_front_public_id: null, id_back_public_id: null, liveness_public_id: null,
        profile_photo_public_id: null, profile_video_public_id: null
      })
      .eq('email', email);

    if (error) {
      console.error("Reset error:", error);
      return res.status(500).json({ success: false, message: "Server error resetting submission." });
    }

    return res.status(200).json({ success: true, message: "User data reset." });
  } catch (err) {
    console.error("🔥 Reset Submission Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error resetting submission." });
  }
};

// ✅ Reset Identity Only
exports.resetIdentityOnly = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id_front_public_id, id_back_public_id, liveness_public_id')
      .eq('email', email)
      .single();

    if (!fetchError && user) {
      await deleteCloudinaryAsset(user.id_front_public_id);
      await deleteCloudinaryAsset(user.id_back_public_id);
      await deleteCloudinaryAsset(user.liveness_public_id);
    }

    const { error } = await supabase
      .from('users')
      .update({
        id_front_url: null, id_back_url: null, liveness_video_url: null,
        id_front_public_id: null, id_back_public_id: null, liveness_public_id: null,
        current_step: 'identity', status: 'pending', is_complete: false
      })
      .eq('email', email);

    if (error) {
      console.error("Reset error:", error);
      return res.status(500).json({ success: false, message: "Server error resetting identity" });
    }

    return res.json({ success: true, message: "Identity reset complete" });
  } catch (err) {
    console.error("🔥 Reset Identity Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error resetting identity" });
  }
};

// ✅ Reset Personal Only
exports.resetPersonalOnly = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('profile_photo_public_id, profile_video_public_id')
      .eq('email', email)
      .single();

    if (!fetchError && user) {
      await deleteCloudinaryAsset(user.profile_photo_public_id);
      await deleteCloudinaryAsset(user.profile_video_public_id);
    }

    const { error } = await supabase
      .from('users')
      .update({
        full_name: null, dob: null, gender: null, orientation: null,
        country_of_birth: null, country_of_residence: null, county_of_residence: null,
        willing_to_relocate: null, languages: null, preferred_language: null,
        education: null, occupation: null, employment_type: null,
        religion: null, religious_importance: null, political_views: null,
        height: null, weight: null, skin_color: null, body_type: null,
        eye_color: null, hair_color: null, ethnicity: null,
        diet: null, smoking: null, drinking: null, exercise: null,
        pets: null, living_situation: null, children: null,
        profile_photo_url: null, profile_video_url: null,
        profile_photo_public_id: null, profile_video_public_id: null,
        current_step: 'personal', status: 'pending', is_complete: false
      })
      .eq('email', email);

    if (error) {
      console.error("Reset error:", error);
      return res.status(500).json({ success: false, message: "Server error resetting personal info" });
    }

    return res.json({ success: true, message: "Personal data reset complete" });
  } catch (err) {
    console.error("🔥 Reset Personal Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error resetting personal info" });
  }
};
