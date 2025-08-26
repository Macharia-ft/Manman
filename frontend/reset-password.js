const form = document.getElementById("resetPasswordForm");
const spinner = document.getElementById("spinner");
let email, otp;

function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const type = field.type === 'password' ? 'text' : 'password';
  field.type = type;
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  email = urlParams.get('email');
  otp = urlParams.get('otp');

  if (!email || !otp) {
    document.getElementById('error-message').textContent = 'Invalid reset link. Please request a new password reset.';
    document.getElementById('reset-form').style.display = 'none';
    return;
  }

  // Verify the reset token
  try {
    const response = await fetch(`${config.API_BASE_URL}/api/auth/verify-reset-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, otp })
    });

    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Server returned non-JSON response:', await response.text());
      document.getElementById('error-message').textContent = 'Server error. Please try again later.';
      document.getElementById('reset-form').style.display = 'none';
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      document.getElementById('error-message').textContent = result.error || 'Invalid or expired reset link. Please request a new password reset.';
      document.getElementById('reset-form').style.display = 'none';
      return;
    }

    // Set email and otp in hidden fields
    document.getElementById('email').value = email;
    document.getElementById('otp').value = otp;
  } catch (error) {
    console.error('Error verifying reset token:', error);
    document.getElementById('error-message').textContent = 'Error verifying reset link. Please try again.';
    document.getElementById('reset-form').style.display = 'none';
  }
});

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
        otp: otp,
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