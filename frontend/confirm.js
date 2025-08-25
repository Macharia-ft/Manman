const otpMsg = document.getElementById("otpMsg");
const otpLoading = document.getElementById("otpLoading");
const resendBtn = document.getElementById("resendBtn");

document.getElementById("confirmForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = localStorage.getItem("email");
  const password = localStorage.getItem("password");
  const otp = document.getElementById("otp").value;

  otpMsg.innerText = "";
  otpLoading.style.display = "block";

  try {
    const res = await fetch(`${config.API_BASE_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, password })
    });

    const data = await res.json();
    otpLoading.style.display = "none";

    if (res.ok) {
      otpMsg.classList.add("ty-success");
      otpMsg.innerText = "✅ Email confirmed! You are now registered.";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } else {
      otpMsg.classList.remove("ty-success");
      otpMsg.innerText = `❌ ${data.error || "Invalid OTP."}`;
    }
  } catch (err) {
    otpLoading.style.display = "none";
    otpMsg.innerText = "❌ Network error. Try again.";
  }
});

resendBtn.addEventListener("click", async () => {
  const email = localStorage.getItem("email");
  const password = localStorage.getItem("password");

  otpMsg.innerText = "";
  otpLoading.style.display = "block";

  try {
    const res = await fetch(`${config.API_BASE_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    otpLoading.style.display = "none";

    if (res.ok) {
      otpMsg.classList.add("ty-success");
      otpMsg.innerText = "✅ OTP resent successfully.";
    } else {
      otpMsg.classList.remove("ty-success");
      otpMsg.innerText = `❌ ${data.error || "Failed to resend OTP."}`;
    }
  } catch (err) {
    otpLoading.style.display = "none";
    otpMsg.innerText = "❌ Resend failed. Try again later.";
  }
});
