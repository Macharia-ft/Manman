
(async () => {
  const token = localStorage.getItem("token");
  const spinnerOverlay = document.getElementById("spinnerOverlay");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    spinnerOverlay.style.display = "flex";

    const res = await fetch(`${config.API_BASE_URL}/api/user/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const step = data.current_step || "identity";
    const status = data.status || "pending";

    if (status === "approved") {
      window.location.href = "dashboard_page.html";
      return;
    }

    if (status === "disapproved") {
      window.location.href = "submission.html";
      return;
    }

    if (step !== "personal") {
      if (step === "identity") window.location.href = "identity-verification.html";
      else if (step === "preferences") window.location.href = "preferences.html";
      else if (step === "submission") window.location.href = "submission.html";
      else window.location.href = "identity-verification.html";
      return;
    }

    spinnerOverlay.style.display = "none";
  } catch (err) {
    console.error("Progress check failed:", err);
    spinnerOverlay.style.display = "none";
    window.location.href = "login.html";
  }
})();

const form = document.getElementById("personalForm");
const spinner = document.getElementById("spinner");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  spinner.style.display = "block";

  const formData = new FormData(form);
  const token = localStorage.getItem("token");

  if (!token) {
    alert("❌ Session expired. Please log in again.");
    spinner.style.display = "none";
    return;
  }

  try {
    const response = await fetch(`${config.API_BASE_URL}/api/user/personal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    spinner.style.display = "none";

    if (response.ok && result.success) {
      window.location.href = "preferences.html";
    } else {
      alert("❌ " + (result.message || "Unknown error occurred."));
    }
  } catch (error) {
    spinner.style.display = "none";
    alert("❌ Network error. Please try again.");
    console.error("Submission error:", error);
  }
});
