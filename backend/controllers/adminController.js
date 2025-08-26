const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Email transporter setup
let transporter;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    console.warn("⚠️ Email credentials not found. Email functionality disabled.");
    transporter = null;
  }
} catch (error) {
  console.error("❌ Email transporter setup failed:", error.message);
  transporter = null;
}

// Admin login
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }

  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Import bcrypt for password verification
    const bcrypt = require("bcrypt");
    const passwordMatch = await bcrypt.compare(password, data.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ email: data.email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      admin: { email: data.email, name: data.name }
    });
  } catch (err) {
    console.error("Admin login error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Get users error:", error.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    res.json({ success: true, users: data });
  } catch (err) {
    console.error("Get users error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  const { userId, status, adminMessage } = req.body;

  if (!userId || !status) {
    return res.status(400).json({ success: false, message: "User ID and status required" });
  }

  try {
    let updateData = {
      status: status,
      admin_message: adminMessage || null,
      updated_at: new Date().toISOString()
    };

    // If approved, set current_step to dashboard
    if (status === "approved") {
      updateData.current_step = "dashboard";
    }
    // If disapproved, keep current_step as submission for upload again functionality
    else if (status === "disapproved") {
      updateData.current_step = "submission";
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) {
      console.error("Update status error:", error.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Send email notification
    const user = data[0];
    if (user.email) {
      try {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
          console.error(`❌ Invalid email format: ${user.email}`);
          return res.json({ success: true, message: "User status updated successfully (email invalid)" });
        }

        const subject = status === "approved" ? "Profile Approved - Takeyours" : "Profile Disapproved - Takeyours";
        const loginLink = `${process.env.FRONTEND_URL || 'http://0.0.0.0:5000'}/login.html`;

        let emailContent;
        if (status === "approved") {
          emailContent = `
            <h2>🎉 Congratulations! Your profile has been approved.</h2>
            <p>You can now access your dashboard and start using Takeyours to find your perfect match.</p>
            <p><strong>Admin Message:</strong> ${adminMessage || 'Welcome to Takeyours!'}</p>
            <p><a href="${loginLink}" style="background-color: #2ecc71; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Access Your Dashboard</a></p>
          `;
        } else {
          emailContent = `
            <h2>❌ Profile Disapproved - Action Required</h2>
            <p>Your profile submission has been disapproved and requires updates.</p>
            <p><strong>Admin Message:</strong> ${adminMessage || 'Please review and resubmit your information.'}</p>
            <p>Please login to your account and use the "Upload Again" button to restart your verification process.</p>
            <p><a href="${loginLink}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Login to Resubmit</a></p>
          `;
        }

        if (transporter) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER || process.env.GMAIL_USER,
            to: user.email,
            subject: subject,
            html: emailContent,
          });
          console.log(`📧 Email sent to ${user.email} for status: ${status}`);
        } else {
          console.warn(`📧 Email not sent to ${user.email} due to missing transporter.`);
        }
      } catch (emailError) {
        console.error("❌ Email sending error:", emailError.message);
        if (emailError.message.includes('550') || emailError.message.includes('NoSuchUser')) {
          console.error(`❌ Invalid email address: ${user.email}`);
        }
        // Don't fail the request if email fails
      }
    }

    res.json({ success: true, message: "User status updated successfully" });
  } catch (err) {
    console.error("Update status error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Get user error:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!data || error?.code === 'PGRST116') {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    console.error("Get user error:", err.message);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};