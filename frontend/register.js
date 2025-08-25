function toggleVisibility(id) {
  const input = document.getElementById(id);
  const toggleBtn = input.nextElementSibling;
  if (input.type === "password") {
    input.type = "text";
    toggleBtn.innerText = "Hide";
  } else {
    input.type = "password";
    toggleBtn.innerText = "Show";
  }
}

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("registerMsg");
  const loader = document.getElementById("loadingMsg");
  msg.innerText = "";
  loader.style.display = "block";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    loader.style.display = "none";
    msg.innerText = "❌ Passwords do not match.";
    return;
  }

  try {
    const res = await fetch(`${config.API_BASE_URL}/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    loader.style.display = "none";

    if (res.ok) {
      localStorage.setItem("email", email);
      localStorage.setItem("password", password);
      window.location.href = "confirm.html";
    } else {
      msg.innerText = `❌ ${data.error || "Failed to send OTP."}`;
    }
  } catch (error) {
    loader.style.display = "none";
    msg.innerText = "❌ Network error. Try again later.";
  }
});
