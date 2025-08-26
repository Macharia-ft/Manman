require("dotenv").config({ path: "./backend/.env" });
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const {
  generateOTP,
  storeOTP,
  verifyOTP,
  canSendOTP,
  incrementOTPAttempt
} = require("../otpStore");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER,
    pass: process.env.GMAIL_PASS || process.env.EMAIL_PASS
  }
});

// ---------- REGISTER: Send OTP ----------
router.post("/send-otp", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email or password." });

  try {
    const { data: existing, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existing && !error) {
      return res.status(400).json({ error: "Account with this email already exists." });
    }

    if (!canSendOTP(email)) {
      return res.status(429).json({ error: "You have reached the maximum number of OTPs. Please check your spam folder or try again after 12 hours." });
    }

    const otp = generateOTP();
    storeOTP(email, otp);

    console.log(`📧 Attempting to send OTP to: ${email}`);
    console.log(`📧 Using sender email: ${process.env.EMAIL_USER || process.env.GMAIL_USER}`);
    
    const mailOptions = {
      from: `"Takeyours" <${process.env.EMAIL_USER || process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Takeyours OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Takeyours!</h2>
          <p>Your OTP verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666;">This code expires in 5 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ OTP sent successfully to: ${email}`);
    incrementOTPAttempt(email);
    res.status(200).json({ message: "OTP sent successfully." });
  } catch (err) {
    console.error("📧 Send OTP error:", err);
    console.error("📧 Email config:", {
      user: process.env.EMAIL_USER || process.env.GMAIL_USER,
      hasPass: !!(process.env.EMAIL_PASS || process.env.GMAIL_PASS)
    });
    res.status(500).json({ error: "Failed to send OTP. Please check your email address and try again." });
  }
});

// ---------- VERIFY OTP + Create User ----------
router.post("/verify-otp", async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ error: "Missing email, OTP or password." });
  }

  const valid = verifyOTP(email, otp);
  if (!valid) {
    return res.status(400).json({ error: "Wrong OTP." });
  }

  try {
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existing && !checkError) {
      return res.status(400).json({ error: "User already exists." });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: email,
        password: password,
        current_step: 'identity',
        status: 'pending'
      }])
      .select();

    if (error) {
      console.error("Insert error:", error);
      return res.status(500).json({ error: "Failed to save user." });
    }

    res.status(200).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Save user error:", err.message);
    res.status(500).json({ error: "Failed to save user." });
  }
});

// ---------- LOGIN ----------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password." });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Account does not exist. Please sign up." });
    }

    if (data.password !== password) {
      return res.status(401).json({ error: "Wrong password." });
    }

    // ✅ Ensure current_step is always set
    let currentStep = data.current_step;
    if (!currentStep) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ current_step: 'identity' })
        .eq('email', email);

      if (updateError) {
        console.error("Update error:", updateError);
      }
      currentStep = 'identity';
    }

    const token = jwt.sign(
      { email: data.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      email: data.email,
      current_step: currentStep,
      status: data.status || "pending"
    });
  } catch (err) {
    console.error("🔥 Login error:", err.message);
    return res.status(500).json({ error: "Server error during login." });
  }
});

// ---------- FORGOT PASSWORD ----------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email || email.trim() === "") {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "User does not exist. Please sign up." });
    }

    if (!canSendOTP(email)) {
      return res.status(429).json({ error: "You have reached your maximum try. Try again later." });
    }

    const otp = generateOTP();
    storeOTP(email, otp);

    console.log(`📧 Sending reset OTP to: ${email}`);
    
    const mailOptions = {
      from: `"Takeyours" <${process.env.EMAIL_USER || process.env.GMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Your OTP to reset your password is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666;">This code expires in 5 minutes.</p>
          <p style="color: #666;">If you didn't request this reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Reset OTP sent successfully to: ${email}`);
    incrementOTPAttempt(email);
    res.status(200).json({ message: "OTP sent." });
  } catch (err) {
    console.error("📧 Forgot password error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please check your email address and try again." });
  }
});

// ---------- VERIFY RESET OTP ----------
router.post("/verify-reset-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Missing email or OTP." });
  }

  const isValid = verifyOTP(email, otp);
  if (!isValid) {
    return res.status(400).json({ error: "Wrong OTP." });
  }

  res.status(200).json({ message: "OTP verified." });
});

// ---------- RESET PASSWORD ----------
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Missing email or new password." });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('email', email)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// ---------- USER PROGRESS ----------
router.get("/user/progress", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 User progress request for:", decoded.email);
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }

  const email = decoded.email;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('current_step, status')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      current_step: data.current_step || "identity",
      status: data.status || "pending"
    });
  } catch (err) {
    console.error("🔥 Progress fetch error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
// Add this route to the existing auth.js file
router.post("/reset-password", async (req, res) => {
  console.log("📦 Incoming /api/auth/reset-password request...");
  
  const { email, newPassword } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email and new password are required"
    });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long"
    });
  }
  
  try {
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error("🔥 Password reset error:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    console.log("✅ Password reset successful for:", email);
    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
    
  } catch (err) {
    console.error("🔥 Password reset error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error during password reset"
    });
  }
});
