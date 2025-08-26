
const form = document.getElementById("resetPasswordForm");
const spinner = document.getElementById("spinner");

// Get email from URL parameters (passed from OTP confirmation)
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get('email');

if (!email) {
  alert("❌ Invalid reset link. Please try again.");
  window.location.href = "login.html";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const newPassword = form.newPassword.value;
  const confirmPassword = form.confirmPassword.value;
  
  if (newPassword !== confirmPassword) {
    alert("❌ Passwords do not match. Please try again.");
    return;
  }
  
  if (newPassword.length < 8) {
    alert("❌ Password must be at least 8 characters long.");
    return;
  }
  
  spinner.style.display = "block";
  
  try {
    const response = await fetch(`${config.API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email,
        newPassword: newPassword
      })
    });
    
    const result = await response.json();
    spinner.style.display = "none";
    
    if (response.ok && result.success) {
      alert("✅ Password updated successfully! You can now login with your new password.");
      window.location.href = "login.html";
    } else {
      alert("❌ " + (result.message || "Failed to update password."));
    }
  } catch (error) {
    spinner.style.display = "none";
    alert("❌ Network error. Please try again.");
    console.error("Reset password error:", error);
  }
});
