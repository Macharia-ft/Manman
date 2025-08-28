// Add event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Add null checks for all event listeners
  const container = document.getElementById('user-container');
  const filterButtons = document.querySelectorAll('.filters button');

  const token = localStorage.getItem("token");
  if (!token) {
    if (container) {
      container.innerHTML = "<p>Please log in first!</p>";
    }
    return;
  }

  const currentUser = getCurrentUserFromToken();
  const currentUserEmail = currentUser ? currentUser.email : null;

  if (!currentUserEmail) {
    if (container) {
      container.innerHTML = "<p>Unable to retrieve user info from token.</p>";
    }
    return;
  }

  // Make local storage user-specific to prevent conflicts when multiple users use same device
  const userStorageKey = (key) => `${key}_${currentUserEmail}`;

  let allProfiles = JSON.parse(localStorage.getItem(userStorageKey("allProfiles"))) || [];
  let selectedProfiles = JSON.parse(localStorage.getItem(userStorageKey("selectedProfiles"))) || [];
  let selectedYouProfiles = JSON.parse(localStorage.getItem(userStorageKey("selectedYouProfiles"))) || [];
  let removedProfiles = JSON.parse(localStorage.getItem(userStorageKey("removedProfiles"))) || [];
  let acceptedProfiles = JSON.parse(localStorage.getItem(userStorageKey("acceptedProfiles"))) || [];
  let matchedProfiles = JSON.parse(localStorage.getItem(userStorageKey("matchedProfiles"))) || [];
  let activeSection = "all";

  // Add a spinner element
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.innerHTML = '<div class="loader"></div>';

  // Function to show spinner
  const showSpinner = () => {
    if (container) container.appendChild(spinner);
  };

  // Function to hide spinner
  const hideSpinner = () => {
    if (container && container.contains(spinner)) {
      container.removeChild(spinner);
    }
  };

  try {
    showSpinner(); // Show spinner before fetching data

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
      const profilePhotoUrl = profile_photo_url || null;
      if (profilePhotoUrl && profilePhotoUrl !== 'null' && profilePhotoUrl !== null) {
        profileIcon.src = profilePhotoUrl;
        profileIcon.onerror = () => {
          console.error("❌ Profile icon failed to load:", profilePhotoUrl);
          profileIcon.src = "https://via.placeholder.com/100?text=No+Photo";
        };
      } else {
        console.log("❌ No profile photo for current user.");
        profileIcon.src = "https://via.placeholder.com/100?text=No+Photo";
      }
      profileIcon.onload = function() {
        console.log('✅ Profile icon loaded:', this.src);
      };
    }

    // Show the big profile photo when clicked
    if (profileIcon) {
      profileIcon.addEventListener('click', () => {
        showFloatingProfile(currentUser, 'edit');
      });
    }

    const userResponse = await fetch(`${config.API_BASE_URL}/api/users/${currentUserEmail}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      throw new Error(errorData.message);
    }

    const responseData = await userResponse.json();

    let shouldAdjustPreferences = false; // Initialize to false
    let adjustPreferencesMessage = ''; // Initialize to empty string

    if (responseData.shouldAdjustPreferences) {
      shouldAdjustPreferences = true;
      adjustPreferencesMessage = responseData.adjustPreferencesMessage || 'Please adjust your preferences to see more users.';
      allProfiles = [];
      localStorage.setItem(userStorageKey("allProfiles"), JSON.stringify(allProfiles));
    }

    // Filter out profiles that are already in other sections
    allProfiles = (responseData.users || responseData).filter(profile =>
      !selectedProfiles.some(selected => selected.id === profile.id) &&
      !removedProfiles.some(removed => removed.id === profile.id) &&
      !acceptedProfiles.some(accepted => accepted.id === profile.id) &&
      !matchedProfiles.some(matched => matched.id === profile.id)
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
    if (container) {
      container.innerHTML = `<p>Error: ${error.message}</p>`;
    }
  } finally {
    hideSpinner(); // Hide spinner after data is fetched or an error occurs
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
    if (!container) return;
    container.innerHTML = "";

    let profilesToRender = [];
    if (activeSection === "all") profilesToRender = allProfiles;
    if (activeSection === "selected") profilesToRender = selectedProfiles;
    if (activeSection === "selected-you") profilesToRender = selectedYouProfiles;
    if (activeSection === "removed") profilesToRender = removedProfiles;
    if (activeSection === "accepted") profilesToRender = acceptedProfiles;
    if (activeSection === "matched") profilesToRender = matchedProfiles;

    if (profilesToRender.length === 0) {
      let message = '';
      switch (activeSection) {
        case 'all':
          message = shouldAdjustPreferences ?
            adjustPreferencesMessage :
            'No users found in All Profiles.';
          break;
        case 'selected':
          message = 'No users in Selected section.';
          break;
        case 'selected-you':
          message = 'No users have selected you yet.';
          break;
        case 'removed':
          message = 'No users in Removed section.';
          break;
        case 'accepted':
          message = 'No users in Accepted section.';
          break;
        case 'matched':
          message = 'No matched users.';
          break;
        default:
          message = 'No profiles found.';
      }
      container.innerHTML = `<p class="no-users-message">${message}</p>`;
      return;
    }


    profilesToRender.forEach(user => {
      const age = user.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 'Unknown';
      const photoUrl = user.profile_photo_url && user.profile_photo_url.trim() !== '' ? user.profile_photo_url : 'https://via.placeholder.com/100?text=No+Photo';
      const videoUrl = user.profile_video_url && user.profile_video_url.trim() !== '' ? user.profile_video_url : null;
      const countryOfBirth = user.country_of_birth || 'Unknown';
      const matchScore = user.matchScore || '0%';

      const userCard = document.createElement("div");
      userCard.classList.add("profile-card");
      userCard.dataset.userId = user.id; // Add dataset for easier selection

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
               oncanplay="console.log('✅ Profile video ready for user ${user.id}');">
               </video>
               <p style="display:none; color:red;">Video failed to load</p>` : "<p>No video available</p>"}
        </div>
        <div class="profile-actions"></div>
      `;

      const actions = userCard.querySelector(".profile-actions");

      // Determine button states and messages
      let buttonsHtml = '';
      let userFoundMatchMsg = '';

      const hasSelectedCurrentUser = user.has_selected_current_user;
      const currentUserAction = user.current_user_action;

      // Show "User found match" message only in specific cases
      if (hasSelectedCurrentUser && activeSection === 'you' && !currentUserAction) {
        userFoundMatchMsg = '<div class="match-notification">👥 User found match</div>';
      }

      // Determine available actions based on section and user state
      if (activeSection === 'all') {
        if (!currentUserAction || currentUserAction === 'restore') {
          buttonsHtml = `
            <button class="btn-select" onclick="updateUserInteraction(${user.id}, 'selected')">Select</button>
            <button class="btn-remove" onclick="updateUserInteraction(${user.id}, 'removed')">Remove</button>
          `;
        } else {
          // Show disabled state for users who have been acted upon
          buttonsHtml = `
            <button class="btn-select" disabled>Select</button>
            <button class="btn-remove" disabled>Remove</button>
            <div class="user-status">User found match</div>
          `;
        }
      } else if (activeSection === 'selected') {
        buttonsHtml = `
          <button class="btn-accept" onclick="updateUserInteraction(${user.id}, 'accepted')">Accept</button>
          <button class="btn-reject" onclick="updateUserInteraction(${user.id}, 'rejected')">Reject</button>
          <button class="btn-cancel" onclick="updateUserInteraction(${user.id}, 'restore')">Cancel Selection</button>
        `;
      } else if (activeSection === 'accepted') {
        buttonsHtml = `
          <button class="btn-matched" onclick="checkPremiumAndRedirect(${user.id})">Matched</button>
          <button class="btn-cancel-match" onclick="updateUserInteraction(${user.id}, 'removed')">Cancel Match</button>
        `;
      } else if (activeSection === 'removed') {
        buttonsHtml = `<button class="btn-restore" onclick="updateUserInteraction(${user.id}, 'restore')">Restore</button>`;
      } else if (activeSection === 'you') {
        buttonsHtml = `
          <button class="btn-select" onclick="updateUserInteraction(${user.id}, 'selected')">Select</button>
          <button class="btn-remove" onclick="updateUserInteraction(${user.id}, 'removed')">Remove</button>
        `;
      }

      actions.innerHTML = buttonsHtml;
      // Prepend the match notification if it exists
      if (userFoundMatchMsg) {
        actions.insertAdjacentHTML('afterbegin', userFoundMatchMsg);
      }


      // Add event listener to profile photo to show floating profile photo
      const profilePic = userCard.querySelector(`#profilePic-${user.id}`);
      if (profilePic) {
        profilePic.addEventListener('click', () => {
          showFloatingProfile(user);
        });
      }

      container.appendChild(userCard);
    });
  }

  function showFloatingProfile(user, action = 'view') {
    const floatingProfilePhoto = document.getElementById('floatingProfilePhoto');
    const floatingProfilePic = document.getElementById('floatingProfilePic');
    const viewProfileBtn = document.getElementById('viewProfileBtn');
    const closeProfileBtn = document.getElementById('closeProfileBtn');

    if (!floatingProfilePhoto || !floatingProfilePic || !viewProfileBtn || !closeProfileBtn) {
      console.error("Floating profile elements not found.");
      return;
    }

    floatingProfilePic.src = user.profile_photo_url || 'https://via.placeholder.com/100';
    floatingProfilePic.onerror = function() {
      this.src = 'https://via.placeholder.com/100';
    };
    floatingProfilePhoto.style.display = 'block';
    document.body.style.overflow = 'hidden';

    if (closeProfileBtn) {
      closeProfileBtn.onclick = () => {
        floatingProfilePhoto.style.display = 'none';
        document.body.style.overflow = '';
      };
    }

    const floatingProfileContent = floatingProfilePhoto.querySelector('.floating-profile-content');
    if (floatingProfileContent) {
      floatingProfileContent.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }

    if (action === 'edit') {
      viewProfileBtn.textContent = 'Edit Profile';
      viewProfileBtn.onclick = () => {
        floatingProfilePhoto.style.display = 'none';
        document.body.style.overflow = '';
        window.location.href = "edit-profile.html";
      };
    } else {
      viewProfileBtn.textContent = 'View Profile';
      viewProfileBtn.onclick = () => {
        floatingProfilePhoto.style.display = 'none';
        document.body.style.overflow = '';
        window.location.href = `profile.html?id=${user.id}`;
      };
    }
  }

  function updateLocalStorage() {
    localStorage.setItem(userStorageKey("allProfiles"), JSON.stringify(allProfiles));
    localStorage.setItem(userStorageKey("selectedProfiles"), JSON.stringify(selectedProfiles));
    localStorage.setItem(userStorageKey("selectedYouProfiles"), JSON.stringify(selectedYouProfiles));
    localStorage.setItem(userStorageKey("removedProfiles"), JSON.stringify(removedProfiles));
    localStorage.setItem(userStorageKey("acceptedProfiles"), JSON.stringify(acceptedProfiles));
    localStorage.setItem(userStorageKey("matchedProfiles"), JSON.stringify(matchedProfiles));
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

  async function checkUserSubscription() {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/user/subscription-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        return data.subscription || 'free';
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
    return 'free';
  }

  function showNotification(message, type) {
    // Implement a notification system here (e.g., toast messages)
    console.log(`Notification (${type}): ${message}`);
  }

  function loadUsers() {
    // This function is a placeholder and would typically refetch user data
    // For now, we'll just re-render the current profiles
    renderProfiles();
  }

  // Function to update interaction (select, remove, accept, reject)
  async function updateUserInteraction(targetUserId, action) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'block';

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/users/select/${currentUserEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedUserId: targetUserId,
          action: action
        })
      });

      const data = await response.json();

      if (data.success) {
        // Remove the user card from current section
        const card = document.querySelector(`.profile-card[data-user-id="${targetUserId}"]`);
        if (card) {
          card.remove();
        }

        // Reload the appropriate sections to reflect changes
        loadUsers();

        // Show success message
        showNotification(`User ${action} successfully`, 'success');
      } else {
        showNotification(data.message || `Failed to ${action} user`, 'error');
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      showNotification(`Error ${action}ing user`, 'error');
    } finally {
      if (spinner) spinner.style.display = 'none';
    }
  }


  // Filter users based on the current section
  function filterUsersBySection(users, section) {
    return users.filter(user => {
      const hasSelectedCurrentUser = user.has_selected_current_user;
      const currentUserAction = user.current_user_action;

      switch (section) {
        case 'all':
          // Show users with no action or those restored from removed
          return !currentUserAction || currentUserAction === 'restore';
        case 'selected':
          return currentUserAction === 'selected';
        case 'accepted':
          return currentUserAction === 'accepted';
        case 'removed':
          return currentUserAction === 'removed' || currentUserAction === 'rejected';
        case 'you':
          // Show users who selected the current user but current user hasn't acted on them
          return hasSelectedCurrentUser && !currentUserAction;
        default:
          return true;
      }
    });
  }

  // Function to show premium notification
  function showPremiumNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 10000;
      text-align: center;
      max-width: 400px;
      width: 90%;
    `;

    notification.innerHTML = `
      <h3 style="color: #ff6b35; margin-bottom: 15px;">🚀 Premium Feature</h3>
      <p style="margin-bottom: 20px;">You need to upgrade to Premium to access this feature!</p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="window.location.href='subscriptions.html'" style="background: #007BFF; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
          Upgrade to Premium
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
          Cancel
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  // Function to redirect to chat, with premium check
  function redirectToChat(userId) {
    window.location.href = `charts.html?userId=${userId}`;
  }

  async function checkPremiumAndRedirect(userId) {
    try {
      // Check user subscription status
      const response = await fetch(`${config.API_BASE_URL}/api/user/subscription-status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subscription === 'premium') {
          redirectToChat(userId);
        } else {
          // Show premium notification
          showPremiumNotification();
        }
      } else {
        redirectToChat(userId); // Fallback
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      redirectToChat(userId); // Fallback
    }
  }
});