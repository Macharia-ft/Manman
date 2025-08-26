
const uploadAgainBtn = document.getElementById("uploadAgainBtn");
const adminMessageContainer = document.getElementById("adminMessageContainer");
const adminMessageText = document.getElementById("adminMessageText");
const reviewMessage = document.getElementById("reviewMessage");
const mainContent = document.getElementById("mainContent");
const spinnerOverlay = document.getElementById("spinnerOverlay");

const token = localStorage.getItem("token");

uploadAgainBtn.addEventListener("click", async () => {
  if (!token) return (window.location.href = "login.html");

  spinnerOverlay.style.display = "flex";
  uploadAgainBtn.disabled = true;

  try {
    const statusRes = await fetch(`${config.API_BASE_URL}/api/user/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const statusData = await statusRes.json();
    const message = statusData.adminMessage || "";

    let endpoint = "reset-submission"; // default
    let redirectTo = "identity-verification.html";

    if (message.toLowerCase().includes("identity")) {
      endpoint = "reset-identity";
      redirectTo = "identity-verification.html";
    } else if (message.toLowerCase().includes("personal")) {
      endpoint = "reset-personal";
      redirectTo = "personal.html";
    }

    const resetRes = await fetch(`${config.API_BASE_URL}/api/user/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    const resetData = await resetRes.json();

    spinnerOverlay.style.display = "none";

    if (resetRes.ok && resetData.success) {
      window.location.href = redirectTo;
    } else {
      uploadAgainBtn.disabled = false;
      alert("❌ Failed to reset: " + (resetData.message || "Unknown error."));
    }
  } catch (err) {
    spinnerOverlay.style.display = "none";
    uploadAgainBtn.disabled = false;
    console.error("❌ Reset error:", err);
    alert("❌ Network error during reset.");
  }
});

(async () => {
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Show spinner initially
  spinnerOverlay.style.display = "flex";
  mainContent.style.display = "none";

  try {
    const progressRes = await fetch(`${config.API_BASE_URL}/api/user/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const progressData = await progressRes.json();
    const step = progressData.current_step || "identity";
    const status = progressData.status || "pending";

    if (status === "approved") {
      window.location.href = "dashboard_page.html";
      return;
    }

    if (status !== "disapproved" && step !== "submission") {
      if (step === "identity") window.location.href = "identity-verification.html";
      else if (step === "personal") window.location.href = "personal.html";
      else if (step === "preferences") window.location.href = "preferences.html";
      else window.location.href = "identity-verification.html";
      return;
    }

    if (status === "disapproved") {
      const statusRes = await fetch(`${config.API_BASE_URL}/api/user/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.adminMessage) {
          adminMessageText.textContent = statusData.adminMessage;
          adminMessageContainer.style.display = "block";
        }
      }

      // Add upload again button for disapproved users
      const uploadAgainBtn = document.createElement('button');
      uploadAgainBtn.textContent = 'Upload Again';
      uploadAgainBtn.className = 'upload-again-btn';
      uploadAgainBtn.onclick = async () => {
        try {
          const resetRes = await fetch(`${config.API_BASE_URL}/api/user/reset-submission`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (resetRes.ok) {
            window.location.href = "identity-verification.html";
          } else {
            alert("Failed to reset submission. Please try again.");
          }
        } catch (error) {
          alert("Network error. Please try again.");
        }
      };
      
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(uploadAgainBtn);
      }
      }

      reviewMessage.textContent = "❌ Your submission was disapproved by admin.";
      uploadAgainBtn.style.display = "inline-block";
    } else {
      reviewMessage.textContent = "⏳ Your profile is under review, please wait for approval and be aware it can take up to 24 hours.";
      uploadAgainBtn.style.display = "none";
    }

    // Hide spinner and show content
    spinnerOverlay.style.display = "none";
    mainContent.style.display = "block";
  } catch (err) {
    console.error("❌ Submission page error:", err.message);
    spinnerOverlay.style.display = "none";
    window.location.href = "login.html";
  }
})();
