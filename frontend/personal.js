
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp && payload.exp < now;
  } catch (e) {
    console.error("Token check failed:", e);
    return true;
  }
}

// Check authentication and redirect if necessary
(async () => {
  const token = localStorage.getItem("token");
  const spinnerOverlay = document.getElementById("spinnerOverlay");

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    return (window.location.href = "login.html");
  }

  try {
    spinnerOverlay.style.display = "flex";

    const res = await fetch(`${config.API_BASE_URL}/api/user/progress`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Progress check failed');
    }

    const step = data.current_step || "identity";
    const status = data.status || "pending";

    if (status === "approved") return (window.location.href = "dashboard_page.html");
    if (status === "disapproved") return (window.location.href = "submission.html");

    if (step !== "personal") {
      const map = {
        identity: "identity-verification.html",
        preferences: "preferences.html",
        submission: "submission.html"
      };
      return (window.location.href = map[step] || "personal.html");
    }

    spinnerOverlay.style.display = "none";
  } catch (err) {
    console.error("Progress check failed:", err.message);
    spinnerOverlay.style.display = "none";
    // Don't redirect to login on API errors, just show the form
    console.log("Continuing with personal form despite progress check error");
  }
})();

// Handle form submission
document.getElementById("personalForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) {
    alert("Session expired. Please log in again.");
    window.location.href = "login.html";
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  const spinner = document.getElementById("submitSpinner");
  
  submitBtn.disabled = true;
  spinner.style.display = "inline-block";

  try {
    const formData = new FormData();
    
    // Add all form fields to FormData
    const formElements = e.target.elements;
    for (let element of formElements) {
      if (element.name) {
        if (element.type === 'file') {
          if (element.files.length > 0) {
            if (element.name === 'photo') {
              formData.append('profilePhoto', element.files[0]);
            } else if (element.name === 'video') {
              formData.append('profileVideo', element.files[0]);
            }
          }
        } else if (element.type === 'checkbox') {
          if (element.checked) {
            formData.append(element.name, element.value);
          }
        } else if (element.type !== 'submit') {
          formData.append(element.name, element.value);
        }
      }
    }

    // Handle languages specially
    const languageCheckboxes = document.querySelectorAll('input[name="languages[]"]:checked');
    languageCheckboxes.forEach(checkbox => {
      formData.append('languages[]', checkbox.value);
    });

    console.log("Submitting personal information...");

    const response = await fetch(`${config.API_BASE_URL}/api/user/personal`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Personal information saved successfully");
      alert("Personal information saved successfully!");
      window.location.href = "preferences.html";
    } else {
      console.error("❌ Save failed:", result.message);
      alert(`Error: ${result.message || "Failed to save personal information"}`);
    }

  } catch (error) {
    console.error("❌ Submit error:", error);
    alert("An error occurred while saving personal information. Please try again.");
  } finally {
    submitBtn.disabled = false;
    spinner.style.display = "none";
  }
});

// Handle file preview functionality
document.querySelector('input[name="photo"]').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      let preview = document.getElementById('photoPreview');
      if (!preview) {
        preview = document.createElement('img');
        preview.id = 'photoPreview';
        preview.style.maxWidth = '200px';
        preview.style.maxHeight = '200px';
        preview.style.marginTop = '10px';
        e.target.parentNode.appendChild(preview);
      }
      preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

document.querySelector('input[name="video"]').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    let preview = document.getElementById('videoPreview');
    if (!preview) {
      preview = document.createElement('video');
      preview.id = 'videoPreview';
      preview.controls = true;
      preview.style.maxWidth = '300px';
      preview.style.maxHeight = '200px';
      preview.style.marginTop = '10px';
      e.target.parentNode.appendChild(preview);
    }
    preview.src = URL.createObjectURL(file);
  }
});
