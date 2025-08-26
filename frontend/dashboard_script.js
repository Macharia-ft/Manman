document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('user-container');
  const filterButtons = document.querySelectorAll('.filters button');

  const token = localStorage.getItem("token");
  if (!token) {
    container.innerHTML = "<p>Please log in first!</p>";
    return;
  }

  const currentUser = getCurrentUserFromToken();
  const currentUserEmail = currentUser ? currentUser.email : null;

  if (!currentUserEmail) {
    container.innerHTML = "<p>Unable to retrieve user info from token.</p>";
    return;
  }

  // Make local storage user-specific to prevent conflicts when multiple users use same device
  const userStorageKey = (key) => `${key}_${currentUserEmail}`;

  let allProfiles = JSON.parse(localStorage.getItem(userStorageKey("allProfiles"))) || [];
  let selectedProfiles = JSON.parse(localStorage.getItem(userStorageKey("selectedProfiles"))) || [];
  let selectedYouProfiles = JSON.parse(localStorage.getItem(userStorageKey("selectedYouProfiles"))) || [];
  let removedProfiles = JSON.parse(localStorage.getItem(userStorageKey("removedProfiles"))) || [];
  let acceptedProfiles = JSON.parse(localStorage.getItem(userStorageKey("acceptedProfiles"))) || [];
  let activeSection = "all";

  try {
    const response = await fetch(`${config.API_BASE_URL}/api/user/profile-photo/${currentUserEmail}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    let profile_photo_url = null;
    if (response.ok) {
      const data = await response.json();
      profile_photo_url = data.profile_photo_url;
      console.log('✅ Current user profile photo URL:', profile_photo_url);
    } else {
      console.error('❌ Failed to fetch current user profile photo:', response.status);
    }

    const profileIcon = document.querySelector('.profile-icon img');
    if (profileIcon) {
      profileIcon.src = profile_photo_url && profile_photo_url.trim() !== '' ? profile_photo_url : 'https://via.placeholder.com/100?text=No+Photo';
      profileIcon.onerror = function() {
        console.error('❌ Profile icon failed to load:', this.src);
        this.src = 'https://via.placeholder.com/100?text=No+Photo';
      };
      profileIcon.onload = function() {
        console.log('✅ Profile icon loaded:', this.src);
      };
    }

    // Show the big profile photo when clicked
    profileIcon.addEventListener('click', () => {
      showFloatingProfile(currentUser, 'edit'); // Show the floating profile with "Edit" button
    });

    const userResponse = await fetch(`${config.API_BASE_URL}/api/users/${currentUserEmail}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      throw new Error(errorData.message);
    }

    const responseData = await userResponse.json();

    // Handle new response format with pre-filtering - only for all profiles
    if (responseData.shouldAdjustPreferences) {
      // Store the no users state
      allProfiles = [];
      localStorage.setItem(userStorageKey("allProfiles"), JSON.stringify(allProfiles));
      
      // Don't return here - let renderProfiles() handle showing the message only for "all" section
    }

    // Filter out already selected, removed, or accepted profiles
    allProfiles = (responseData.users || responseData).filter(profile => 
      !selectedProfiles.some(selected => selected.id === profile.id) &&
      !removedProfiles.some(removed => removed.id === profile.id) &&
      !acceptedProfiles.some(accepted => accepted.id === profile.id)
    );

    const selectedYouResponse = await fetch(`${config.API_BASE_URL}/api/users/selected-you/${currentUserEmail}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (selectedYouResponse.ok) {
      selectedYouProfiles = await selectedYouResponse.json();
      localStorage.setItem(userStorageKey("selectedYouProfiles"), JSON.stringify(selectedYouProfiles));
    } else {
      console.error("Error fetching selected-you profiles.");
    }

    renderProfiles();

  } catch (error) {
    console.error(error);
    container.innerHTML = `<p>Error: ${error.message}</p>`;
  }

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeSection = btn.dataset.section;
      renderProfiles();
    });
  });

  function renderProfiles() {
    container.innerHTML = "";

    let profilesToRender = [];
    if (activeSection === "all") profilesToRender = allProfiles;
    if (activeSection === "selected") profilesToRender = selectedProfiles;
    if (activeSection === "selected-you") profilesToRender = selectedYouProfiles;
    if (activeSection === "removed") profilesToRender = removedProfiles;
    if (activeSection === "accepted") profilesToRender = acceptedProfiles;

    if (profilesToRender.length === 0) {
      if (activeSection === "all") {
        // Check if we need to show the no users found message for all profiles
        container.innerHTML = `
          <div class="no-matches-message">
            <h3>No users found</h3>
            <p>No users found matching your preferences. Try adjusting your gender, location, or age range preferences.</p>
            <button onclick="window.location.href='adjust-preferences.html'" class="adjust-preferences-btn">
              Adjust Preferences
            </button>
          </div>
        `;
      } else {
        container.innerHTML = "<p>No profiles found.</p>";
      }
      return;
    }

    profilesToRender.forEach(user => {
      const age = user.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 'Unknown';
      const photoUrl = user.profile_photo_url && user.profile_photo_url.trim() !== '' ? user.profile_photo_url : 'https://via.placeholder.com/100?text=No+Photo';
      const videoUrl = user.profile_video_url && user.profile_video_url.trim() !== '' ? user.profile_video_url : null;
      const countryOfBirth = user.country_of_birth || 'Unknown';
      const matchScore = user.matchScore || '0%';

      console.log(`🔍 Rendering user ${user.id}:`, {
        photoUrl,
        videoUrl,
        full_name: user.full_name
      });

      const userCard = document.createElement("div");
      userCard.classList.add("profile-card");

      userCard.innerHTML = `
        <div class="profile-info">
          <img src="${photoUrl}" alt="Profile" class="profile-pic" id="profilePic-${user.id}" 
               onerror="console.error('❌ Profile pic failed for user ${user.id}:', this.src); this.src='https://via.placeholder.com/100?text=No+Photo';" 
               onload="console.log('✅ Profile pic loaded for user ${user.id}:', this.src);">
          <div class="profile-details">
            <h3>${user.full_name || 'Unknown Name'}</h3>
            <p>${age} yrs</p>
            <p>${countryOfBirth}</p>
          </div>
          <span class="score">${matchScore}</span>
        </div>
        <div class="profile-video">
          ${videoUrl ? `<video src="${videoUrl}" controls preload="metadata" style="max-width: 100%; height: auto;" 
               onerror="console.error('❌ Profile video failed for user ${user.id}:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';" 
               onloadstart="console.log('🎬 Profile video loading for user ${user.id}:', this.src);" 
               oncanplay="console.log('✅ Profile video ready for user ${user.id}');">
               </video>
               <p style="display:none; color:red;">Video failed to load</p>` : "<p>No video available</p>"}
        </div>
        <div class="profile-actions"></div>
      `;

      const actions = userCard.querySelector(".profile-actions");

      if (activeSection === "all") {
        actions.innerHTML = `
          <button class="select-btn">Select</button>
          <button class="remove-btn">Remove</button>
        `;
        actions.querySelector(".select-btn").addEventListener("click", async () => {
          selectedProfiles.push(user);
          allProfiles = allProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();

          try {
            const response = await fetch(`${config.API_BASE_URL}/api/users/select/${currentUserEmail}`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                selectedUserId: user.id,
                action: "selected"
              })
            });

            if (!response.ok) {
              throw new Error('Failed to update interaction');
            }

            renderProfiles();
          } catch (error) {
            console.error("Error selecting user:", error);
            alert("Something went wrong while selecting the user.");
          }
        });
        actions.querySelector(".remove-btn").addEventListener("click", () => {
          removedProfiles.push(user);
          allProfiles = allProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();
          renderProfiles();
        });
      } else if (activeSection === "selected") {
        actions.innerHTML = `
          <button class="select-btn">Cancel Selection</button>
          <button class="remove-btn">Remove</button>
        `;
        actions.querySelector(".select-btn").addEventListener("click", () => {
          allProfiles.push(user);
          selectedProfiles = selectedProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();
          renderProfiles();
        });
        actions.querySelector(".remove-btn").addEventListener("click", () => {
          removedProfiles.push(user);
          selectedProfiles = selectedProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();
          renderProfiles();
        });
      } else if (activeSection === "selected-you") {
        actions.innerHTML = `
          <button class="select-btn">Accept</button>
          <button class="remove-btn">Reject</button>
        `;
        actions.querySelector(".select-btn").addEventListener("click", () => {
          acceptedProfiles.push(user);
          selectedYouProfiles = selectedYouProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();
          sendMatchRequest(user);
          renderProfiles();
        });
        actions.querySelector(".remove-btn").addEventListener("click", () => {
          removedProfiles.push(user);
          selectedYouProfiles = selectedYouProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();
          renderProfiles();
        });
      } else if (activeSection === "accepted") {
        actions.innerHTML = `
          <button class="select-btn">Matched</button>
          <button class="remove-btn">Cancel Match</button>
        `;
        actions.querySelector(".select-btn").addEventListener("click", () => {
          window.location.href = "matches.html";
        });
        actions.querySelector(".remove-btn").addEventListener("click", () => {
          allProfiles.push(user);
          acceptedProfiles = acceptedProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();
          renderProfiles();
        });
      } else if (activeSection === "removed") {
        actions.innerHTML = `<button class="restore-btn">Restore</button>`;
        actions.querySelector(".restore-btn").addEventListener("click", () => {
          allProfiles.push(user);
          removedProfiles = removedProfiles.filter(u => u.id !== user.id);
          updateLocalStorage();
          renderProfiles();
        });
      }

      // Add event listener to profile photo to show floating profile photo
      const profilePic = userCard.querySelector(`#profilePic-${user.id}`);
      profilePic.addEventListener('click', () => {
        showFloatingProfile(user);
      });

      container.appendChild(userCard);
    });
  }

  function showFloatingProfile(user, action = 'view') {
    const floatingProfilePhoto = document.getElementById('floatingProfilePhoto');
    const floatingProfilePic = document.getElementById('floatingProfilePic');
    const viewProfileBtn = document.getElementById('viewProfileBtn');
    const closeProfileBtn = document.getElementById('closeProfileBtn');

    floatingProfilePic.src = user.profile_photo_url || 'https://via.placeholder.com/100';
    floatingProfilePic.onerror = function() {
      this.src = 'https://via.placeholder.com/100';
    };
    floatingProfilePhoto.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Add event listener for closing the floating profile
    closeProfileBtn.addEventListener('click', () => {
      floatingProfilePhoto.style.display = 'none';
      document.body.style.overflow = '';
    });

    // Prevent clicks inside the floating profile from closing it
    floatingProfilePhoto.querySelector('.floating-profile-content').addEventListener('click', (event) => {
      event.stopPropagation();
    });

    if (action === 'edit') {
      viewProfileBtn.textContent = 'Adjust Preferences';
      viewProfileBtn.onclick = () => {
        window.location.href = "adjust-preferences.html"; // Redirect to dedicated adjust preferences page
      };
    } else {
      viewProfileBtn.textContent = 'View Profile';
      viewProfileBtn.onclick = () => {
        window.location.href = `profile.html?id=${user.id}`; // Redirect to the profile page with user ID in URL
      };
    }
  }

  function updateLocalStorage() {
    localStorage.setItem(userStorageKey("allProfiles"), JSON.stringify(allProfiles));
    localStorage.setItem(userStorageKey("selectedProfiles"), JSON.stringify(selectedProfiles));
    localStorage.setItem(userStorageKey("selectedYouProfiles"), JSON.stringify(selectedYouProfiles));
    localStorage.setItem(userStorageKey("removedProfiles"), JSON.stringify(removedProfiles));
    localStorage.setItem(userStorageKey("acceptedProfiles"), JSON.stringify(acceptedProfiles));
  }

  function getCurrentUserFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
      return JSON.parse(atob(parts[1]));
    } catch (e) {
      console.error("Error decoding token:", e);
      return null;
    }
  }

  async function sendMatchRequest(user) {
    const response = await fetch(`${config.API_BASE_URL}/api/users/match/${currentUserEmail}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchedUserId: user.id,
      })
    });

    if (!response.ok) {
      console.error("Error sending match request:", response.status);
    }
  }
});