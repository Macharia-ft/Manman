
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem("token");
  const spinnerOverlay = document.getElementById("spinnerOverlay");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    spinnerOverlay.style.display = "flex";

    // Fetch current user preferences and profile data
    const res = await fetch(`${config.API_BASE_URL}/api/user/current-preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const userData = await res.json();
      populateForm(userData);
      loadCurrentMedia(userData);
    }

    spinnerOverlay.style.display = "none";
  } catch (err) {
    console.error("Failed to load profile data:", err);
    spinnerOverlay.style.display = "none";
    alert("❌ Failed to load profile data. Please try again.");
  }
});

function populateForm(userData) {
  // Populate all form fields with current user data
  const fields = [
    'pref_gender', 'pref_age_min', 'pref_age_max', 'pref_country_of_birth',
    'pref_country_of_residence', 'pref_county_of_residence', 'pref_country',
    'pref_languages', 'pref_religion', 'pref_religion_importance', 'pref_height',
    'pref_weight', 'pref_body_type', 'pref_skin_color', 'pref_ethnicity',
    'pref_diet', 'pref_smoking', 'pref_drinking', 'pref_exercise', 'pref_pets',
    'pref_children', 'pref_living_situation', 'pref_willing_to_relocate',
    'pref_relationship_type'
  ];

  fields.forEach(field => {
    const element = document.getElementById(field);
    if (element && userData[field] !== null && userData[field] !== undefined) {
      element.value = userData[field];
    }
  });
}

function loadCurrentMedia(userData) {
  const currentPhoto = document.getElementById('currentPhoto');
  const currentVideo = document.getElementById('currentVideo');

  if (userData.profile_photo_url) {
    currentPhoto.src = userData.profile_photo_url;
  }

  if (userData.profile_video_url) {
    currentVideo.src = userData.profile_video_url;
    currentVideo.style.display = 'block';
  } else {
    currentVideo.style.display = 'none';
  }
}

function openFullscreen(src, type) {
  const overlay = document.getElementById('fullscreenOverlay');
  const content = document.getElementById('fullscreenContent');
  
  if (type === 'image') {
    content.innerHTML = `<img src="${src}" class="fullscreen-content" alt="Fullscreen Image">`;
  } else if (type === 'video') {
    content.innerHTML = `<video src="${src}" class="fullscreen-content" controls autoplay></video>`;
  }
  
  overlay.style.display = 'flex';
}

function closeFullscreen() {
  document.getElementById('fullscreenOverlay').style.display = 'none';
}

async function updatePreferences() {
  const form = document.getElementById("preferencesForm");
  const formData = new FormData(form);
  const token = localStorage.getItem("token");
  const spinnerOverlay = document.getElementById("spinnerOverlay");

  if (!token) {
    alert("Session expired. Please log in again.");
    return;
  }

  spinnerOverlay.style.display = "flex";

  const payload = {
    pref_gender: formData.get("pref_gender"),
    pref_age_min: parseInt(formData.get("pref_age_min")),
    pref_age_max: parseInt(formData.get("pref_age_max")),
    pref_country_of_birth: formData.get("pref_country_of_birth"),
    pref_country_of_residence: formData.get("pref_country_of_residence"),
    pref_county_of_residence: formData.get("pref_county_of_residence"),
    pref_country: formData.get("pref_country"),
    pref_languages: formData.get("pref_languages"),
    pref_religion: formData.get("pref_religion"),
    pref_religion_importance: formData.get("pref_religion_importance"),
    pref_height: parseInt(formData.get("pref_height")),
    pref_weight: parseInt(formData.get("pref_weight")),
    pref_body_type: formData.get("pref_body_type"),
    pref_skin_color: formData.get("pref_skin_color"),
    pref_ethnicity: formData.get("pref_ethnicity"),
    pref_diet: formData.get("pref_diet"),
    pref_smoking: formData.get("pref_smoking"),
    pref_drinking: formData.get("pref_drinking"),
    pref_exercise: formData.get("pref_exercise"),
    pref_pets: formData.get("pref_pets"),
    pref_children: formData.get("pref_children"),
    pref_living_situation: formData.get("pref_living_situation"),
    pref_willing_to_relocate: formData.get("pref_willing_to_relocate"),
    pref_relationship_type: formData.get("pref_relationship_type")
  };

  try {
    const response = await fetch(`${config.API_BASE_URL}/api/user/update-preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    spinnerOverlay.style.display = "none";

    if (response.ok && result.success) {
      alert("✅ Preferences updated successfully!");
    } else {
      alert("❌ " + (result.message || "Error updating preferences."));
    }
  } catch (error) {
    spinnerOverlay.style.display = "none";
    alert("❌ Network error. Try again.");
    console.error(error);
  }
}

async function updateMedia() {
  const photoFile = document.getElementById('profilePhoto').files[0];
  const videoFile = document.getElementById('profileVideo').files[0];
  const token = localStorage.getItem("token");
  const spinnerOverlay = document.getElementById("spinnerOverlay");

  if (!photoFile && !videoFile) {
    alert("Please select at least one file to update.");
    return;
  }

  if (!token) {
    alert("Session expired. Please log in again.");
    return;
  }

  spinnerOverlay.style.display = "flex";

  const formData = new FormData();
  if (photoFile) formData.append('profilePhoto', photoFile);
  if (videoFile) formData.append('profileVideo', videoFile);

  try {
    const response = await fetch(`${config.API_BASE_URL}/api/user/update-media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();
    spinnerOverlay.style.display = "none";

    if (response.ok && result.success) {
      alert("✅ Media update request submitted successfully! Admin will review and approve your changes within 24 hours.");
      // Don't reload as changes are pending approval
    } else {
      alert("❌ " + (result.message || "Error updating media."));
    }
  } catch (error) {
    spinnerOverlay.style.display = "none";
    alert("❌ Network error. Try again.");
    console.error(error);
  }
}

// Close fullscreen when clicking outside content
document.getElementById('fullscreenOverlay').addEventListener('click', function(e) {
  if (e.target === this) {
    closeFullscreen();
  }
});
