document.getElementById("otpForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = document.getElementById("otpMsg");
  const loader = document.getElementById("otpLoading");
  const otp = document.getElementById("otp").value.trim();
  const email = sessionStorage.getItem("resetEmail");

  msg.innerText = "";
  loader.style.display = "block";

  if (!email) {
    loader.style.display = "none";
    msg.innerText = "❌ Session expired. Start again.";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return;
  }

  try {
    const res = await fetch(`${config.API_BASE_URL}/verify-reset-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, otp })
    });

    const data = await res.json();
    loader.style.display = "none";

    if (res.ok) {
      msg.innerText = "✅ OTP verified!";
      setTimeout(() => {
        window.location.href = "reset-password.html";
      }, 1500);
    } else {
      msg.innerText = `❌ ${data.error || "Invalid OTP."}`;
    }
  } catch (err) {
    loader.style.display = "none";
    msg.innerText = "❌ Network error. Try again.";
  }
});

document.getElementById("resendBtn").addEventListener("click", async () => {
  const msg = document.getElementById("otpMsg");
  const email = sessionStorage.getItem("resetEmail");

  if (!email) {
    msg.innerText = "❌ Session expired. Please go back and try again.";
    return;
  }

  msg.innerText = "Resending OTP...";

  try {
    const res = await fetch(`${config.API_BASE_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok) {
      msg.innerText = "✅ OTP resent. Please check your email.";
    } else {
      msg.innerText = `❌ ${data.error || "Could not resend OTP."}`;
    }
  } catch (err) {
    msg.innerText = "❌ Network error. Try again.";
  }
});
