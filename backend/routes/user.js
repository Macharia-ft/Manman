const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getUserProgress,
  resetUserSubmission,
  resetIdentityOnly,
  resetPersonalOnly,
  savePersonalInfo,
  savePreferences,
  getCurrentPreferences,
  updatePreferences,
  getUserProfilePhoto
} = require("../controllers/userController");

// Configure multer for personal info files
const personalUpload = multer({
  dest: path.join(__dirname, "../temp"),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

router.get("/progress", getUserProgress);
router.post("/reset-submission", resetUserSubmission);
router.post("/reset-identity", resetIdentityOnly);
router.post("/reset-personal", resetPersonalOnly);
router.post("/personal", personalUpload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'profileVideo', maxCount: 1 }
]), savePersonalInfo);
router.post("/preferences", savePreferences);
router.get("/current-preferences", getCurrentPreferences);
router.put("/update-preferences", updatePreferences);
router.get("/profile-photo/:email", getUserProfilePhoto);
router.post("/update-media", personalUpload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'profileVideo', maxCount: 1 }
]), require("../controllers/userController").updateMedia);

// Add subscription status endpoint
router.get("/subscription-status", async (req, res) => {
  try {
    const jwt = require("jsonwebtoken");
    const { createClient } = require("@supabase/supabase-js");
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.json({ subscription: 'free' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, subscription')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.json({ subscription: 'free' });
    }

    // Check for active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    if (subscription) {
      res.json({ subscription: subscription.plan });
    } else {
      // Update user subscription to free if no active subscription found
      await supabase
        .from('users')
        .update({ subscription: 'free' })
        .eq('id', user.id);
      
      res.json({ subscription: 'free' });
    }
  } catch (error) {
    console.error('Subscription check error:', error);
    res.json({ subscription: 'free' });
  }
});

// Add conversations endpoint
router.get("/conversations", async (req, res) => {
  try {
    // Return empty array for now - implement when you have the conversations table
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;