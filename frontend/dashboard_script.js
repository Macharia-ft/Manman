
// Add event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Add null checks for all event listeners
  const container = document.getElementById('user-container');
  const filterButtons = document.querySelectorAll('.filters button');
  const loadingSpinner = document.getElementById('loadingSpinner');

  const token = localStorage.getItem("token");
  if (!token) {
    if (container) {
      container.innerHTML = "<p>Please log in first!</p>";
    }
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    return;
  }

  const currentUser = getCurrentUserFromToken();
  const currentUserEmail = currentUser ? currentUser.email : null;

  if (!currentUserEmail) {
    if (container) {
      container.innerHTML = "<p>Unable to retrieve user info from token.</p>";
    }
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    return;
  }

  // Make local storage user-specific to prevent conflicts when multiple users use same device
  const userStorageKey = (key) => `${key}_${currentUserEmail}`;

  let allProfiles = [];
  let selectedProfiles = [];
  let selectedYouProfiles = [];
  let removedProfiles = [];
  let acceptedProfiles = [];
  let matchedProfiles = [];
  let activeSection = "all";

  // Show spinner
  if (loadingSpinner) loadingSpinner.style.display = 'flex';
  if (container) container.style.display = 'none';

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

    if (responseData.shouldAdjustPreferences) {
      allProfiles = [];
    } else {
      allProfiles = responseData.users || responseData || [];
    }

    // Fetch all user interactions to categorize profiles
    const interactionsResponse = await fetch(`${config.API_BASE_URL}/api/users/interactions/${currentUserEmail}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    let userInteractions = [];
    if (interactionsResponse.ok) {
      userInteractions = await interactionsResponse.json();
    }

    // Categorize profiles based on interactions
    selectedProfiles = userInteractions.filter(u => u.action === 'selected').map(u => ({...u, originalLocation: u.original_location || 'all'}));
    removedProfiles = userInteractions.filter(u => u.action === 'removed').map(u => ({...u, originalLocation: u.original_location || 'all'}));
    acceptedProfiles = userInteractions.filter(u => u.action === 'accepted').map(u => ({...u, originalLocation: u.original_location || 'selected-you'}));
    matchedProfiles = userInteractions.filter(u => u.action === 'matched').map(u => ({...u, originalLocation: u.original_location || 'accepted'}));

    // Remove already categorized profiles from allProfiles
    const interactedUserIds = userInteractions.map(u => u.id);
    allProfiles = allProfiles.filter(profile => !interactedUserIds.includes(profile.id));

    const selectedYouResponse = await fetch(`${config.API_BASE_URL}/api/users/selected-you/${currentUserEmail}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (selectedYouResponse.ok) {
      selectedYouProfiles = await selectedYouResponse.json();
      selectedYouProfiles = selectedYouProfiles.map(u => ({...u, originalLocation: 'selected-you'}));
    } else {
      console.error("Error fetching selected-you profiles.");
    }

    // Hide spinner and show content
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (container) container.style.display = 'block';

    renderProfiles();

  } catch (error) {
    console.error(error);
    if (container) {
      container.innerHTML = `<p>Error: ${error.message}</p>';
      container.style.display = 'block';
    }
    if (loadingSpinner) loadingSpinner.style.display = 'none';
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
      if (activeSection === "all") {
        container.innerHTML = `
          <div class="no-matches-message">
            <h3>No users found</h3>
            <p>No users found matching your preferences. Try adjusting your gender, location, or age range preferences.</p>
            <button onclick="window.location.href='edit-profile.html'" class="adjust-preferences-btn">
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
      const foundMatch = user.found_match;

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
            ${foundMatch ? '<p style="color: red; font-weight: bold;">User Found Match</p>' : ''}
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

      if (activeSection === "all") {
        actions.innerHTML = `
          <button class="select-btn" ${foundMatch ? 'disabled' : ''}>
            ${foundMatch ? 'User Found Match' : 'Select'}
          </button>
          <button class="remove-btn">Remove</button>
        `;
        
        const selectButton = actions.querySelector(".select-btn");
        if (selectButton && !foundMatch) {
          selectButton.addEventListener("click", async () => {
            await moveProfile(user, 'all', 'selected', 'selected');
          });
        }
        
        const removeButton = actions.querySelector(".remove-btn");
        if (removeButton) {
          removeButton.addEventListener("click", async () => {
            await moveProfile(user, 'all', 'removed', 'removed');
          });
        }

      } else if (activeSection === "selected") {
        actions.innerHTML = `
          <button class="select-btn">Cancel Selection</button>
          <button class="remove-btn">Remove</button>
        `;
        
        const cancelButton = actions.querySelector(".select-btn");
        if (cancelButton) {
          cancelButton.addEventListener("click", async () => {
            await moveProfile(user, 'selected', user.originalLocation || 'all', null);
          });
        }
        
        const removeButton = actions.querySelector(".remove-btn");
        if (removeButton) {
          removeButton.addEventListener("click", async () => {
            await moveProfile(user, 'selected', 'removed', 'removed');
          });
        }

      } else if (activeSection === "selected-you") {
        actions.innerHTML = `
          <button class="select-btn">Accept</button>
          <button class="remove-btn">Reject</button>
        `;
        
        const acceptButton = actions.querySelector(".select-btn");
        if (acceptButton) {
          acceptButton.addEventListener("click", async () => {
            await moveProfile(user, 'selected-you', 'accepted', 'accepted');
          });
        }
        
        const rejectButton = actions.querySelector(".remove-btn");
        if (rejectButton) {
          rejectButton.addEventListener("click", async () => {
            await moveProfile(user, 'selected-you', 'removed', 'removed');
          });
        }

      } else if (activeSection === "accepted") {
        const isMutualMatch = user.isMutualMatch || false;

        if (isMutualMatch) {
          actions.innerHTML = `
            <button class="select-btn matched-btn">Matched - Chat</button>
            <button class="remove-btn">Cancel Match</button>
          `;
          
          const chatButton = actions.querySelector(".select-btn");
          if (chatButton) {
            chatButton.addEventListener("click", async () => {
              const subscription = await checkUserSubscription();
              if (subscription === 'free') {
                showPremiumNotification();
              } else {
                await moveProfile(user, 'accepted', 'matched', 'matched');
                window.location.href = `chat.html?userId=${user.id}`;
              }
            });
          }
        } else {
          actions.innerHTML = `
            <button class="select-btn disabled-btn" disabled>Waiting for Response</button>
            <button class="remove-btn">Cancel Match</button>
          `;
        }

        const cancelMatchButton = actions.querySelector(".remove-btn");
        if (cancelMatchButton) {
          cancelMatchButton.addEventListener("click", async () => {
            await moveProfile(user, 'accepted', 'removed', 'removed');
          });
        }

      } else if (activeSection === "matched") {
        actions.innerHTML = `
          <button class="select-btn">Open Chat</button>
          <button class="remove-btn">Unmatch</button>
        `;
        
        const openChatButton = actions.querySelector(".select-btn");
        if (openChatButton) {
          openChatButton.addEventListener("click", async () => {
            const subscription = await checkUserSubscription();
            if (subscription === 'free') {
              showPremiumNotification();
            } else {
              window.location.href = `chat.html?userId=${user.id}`;
            }
          });
        }
        
        const unmatchButton = actions.querySelector(".remove-btn");
        if (unmatchButton) {
          unmatchButton.addEventListener("click", async () => {
            await moveProfile(user, 'matched', 'removed', 'removed');
          });
        }

      } else if (activeSection === "removed") {
        actions.innerHTML = `<button class="restore-btn">Restore</button>`;
        
        const restoreButton = actions.querySelector(".restore-btn");
        if (restoreButton) {
          restoreButton.addEventListener("click", async () => {
            await moveProfile(user, 'removed', user.originalLocation || 'all', null);
          });
        }
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

  async function moveProfile(user, fromSection, toSection, action) {
    try {
      // Update backend
      if (action) {
        const response = await fetch(`${config.API_BASE_URL}/api/users/interact`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            targetUserId: user.id,
            action: action,
            originalLocation: user.originalLocation || fromSection
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update interaction');
        }
      }

      // Update frontend arrays
      if (fromSection === 'all') allProfiles = allProfiles.filter(u => u.id !== user.id);
      if (fromSection === 'selected') selectedProfiles = selectedProfiles.filter(u => u.id !== user.id);
      if (fromSection === 'selected-you') selectedYouProfiles = selectedYouProfiles.filter(u => u.id !== user.id);
      if (fromSection === 'accepted') acceptedProfiles = acceptedProfiles.filter(u => u.id !== user.id);
      if (fromSection === 'matched') matchedProfiles = matchedProfiles.filter(u => u.id !== user.id);
      if (fromSection === 'removed') removedProfiles = removedProfiles.filter(u => u.id !== user.id);

      if (toSection === 'all') allProfiles.push(user);
      if (toSection === 'selected') selectedProfiles.push(user);
      if (toSection === 'selected-you') selectedYouProfiles.push(user);
      if (toSection === 'accepted') acceptedProfiles.push(user);
      if (toSection === 'matched') matchedProfiles.push(user);
      if (toSection === 'removed') removedProfiles.push(user);

      renderProfiles();

    } catch (error) {
      console.error("Error moving profile:", error);
      alert("Something went wrong. Please try again.");
    }
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
});
