
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

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
      .eq('password', password)
      .single();

    if (error || !data) {
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
    const { data, error } = await supabase
      .from('users')
      .update({ 
        status: status,
        admin_message: adminMessage || null,
        updated_at: new Date().toISOString()
      })
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

        const subject = status === "approved" ? "Profile Approved - Takeyours" : "Profile Update - Takeyours";
        const loginLink = `${process.env.FRONTEND_URL || 'http://0.0.0.0:5000'}/login.html`;
        
        let emailContent;
        if (status === "approved") {
          emailContent = `
            <h2>Congratulations! Your profile has been approved.</h2>
            <p>You can now access your dashboard and start using Takeyours.</p>
            <p><a href="${loginLink}" style="background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dashboard</a></p>
          `;
        } else {
          emailContent = `
            <h2>Profile Update Required</h2>
            <p>Your profile submission needs some updates.</p>
            ${adminMessage ? `<p><strong>Admin Message:</strong> ${adminMessage}</p>` : ''}
            <p>Please login and resubmit your information.</p>
            <p><a href="${loginLink}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Update</a></p>
          `;
        }

        await transporter.sendMail({
          from: process.env.EMAIL_USER || process.env.GMAIL_USER,
          to: user.email,
          subject: subject,
          html: emailContent,
        });

        console.log(`📧 Email sent to ${user.email} for status: ${status}`);
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
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Get user error:", error.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: data });
  } catch (err) {
    console.error("Get user error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
