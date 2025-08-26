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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Get file inputs
  const profilePhotoInput = document.getElementById("profilePhoto");
  const profileVideoInput = document.getElementById("profileVideo");

  if (!profilePhotoInput.files[0]) {
    alert("Profile photo is required!");
    return;
  }

  // Show loading state
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Uploading...";
  submitBtn.disabled = true;

  const formData = new FormData();

  // Add files
  formData.append("profilePhoto", profilePhotoInput.files[0]);
  if (profileVideoInput.files[0]) {
    formData.append("profileVideo", profileVideoInput.files[0]);
  }

  // Add form data
  const personalFormData = new FormData(form);
  personalFormData.forEach((value, key) => {
    if (key !== "profilePhoto" && key !== "profileVideo") {
      if (key === "languages") {
        if (!formData.has("languages[]")) {
          formData.append("languages[]", value);
        } else {
          formData.append("languages[]", value);
        }
      } else {
        formData.append(key, value);
      }
    }
  });

  // Validate video file
  const videoFile = profileVideoInput.files[0];
  if (videoFile) {
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (videoFile.size > maxSize) {
      alert("❌ Video file is too large. Please upload a video under 200MB.");
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }

    // Check video duration
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = function() {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 60) {
        alert("❌ Video is too long. Please upload a video that is 1 minute or less.");
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      // Continue with form submission
      submitForm(formData, token, submitBtn, originalText);
    }

    video.src = URL.createObjectURL(videoFile);
  } else {
    submitForm(formData, token, submitBtn, originalText);
  }
});

async function submitForm(formData, token, submitBtn, originalText) {
  try {
    const response = await fetch(`${config.API_BASE_URL}/api/user/personal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      window.location.href = "preferences.html";
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.message || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Network error. Please try again.");
  } finally {
    // Reset button state
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}