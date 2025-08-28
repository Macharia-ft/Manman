document.addEventListener('DOMContentLoaded', async () => {
  // Check if user has premium subscription
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch(`${config.API_BASE_URL}/api/user/subscription-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.subscription === 'free') {
        showPremiumNotification();
        return;
      }
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
  }

  async function checkUserSubscription() {
    try {
      const token = localStorage.getItem("token");
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
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5;">
        <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; max-width: 500px;">
          <h2 style="color: #ff6b35; margin-bottom: 20px;">🚀 Premium Feature</h2>
          <p style="margin-bottom: 30px; font-size: 18px;">Charts and analytics are available for Premium users only!</p>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button onclick="window.location.href='subscriptions.html'" style="background: #007BFF; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
              Upgrade to Premium
            </button>
            <button onclick="window.location.href='dashboard_page.html'" style="background: #6c757d; color: white; padding: 15px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Check authentication
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }

  // Chart configuration
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: ['All Profiles', 'Selected', 'Selected You', 'Accepted', 'Removed'],
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        },
        title: {
          display: true,
          text: 'Profile Distribution',
          font: {
            size: 18,
            weight: 'bold'
          }
        }
      }
    }
  };

  // Initialize chart when page loads
  document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('profileChart');
    if (ctx) {
      const chart = new Chart(ctx, chartConfig);
      loadChartData(chart);
    }
  });

  async function loadChartData(chart) {
    try {
      const currentUser = getCurrentUserFromToken();
      if (!currentUser) {
        throw new Error('No user found');
      }

      // Fetch profile data from API
      const response = await fetch(`${config.API_BASE_URL}/api/users/profile-stats/${currentUser.email}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        chart.data.datasets[0].data = [
          data.allProfiles || 0,
          data.selected || 0,
          data.selectedYou || 0,
          data.accepted || 0,
          data.removed || 0
        ];
        chart.update();
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  }

  function getCurrentUserFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch (e) {
      console.error("Error decoding token:", e);
      return null;
    }
  }

  loadConversations(); // Call the original function to load conversations
});


async function checkUserSubscription() {
  // This would typically check the user's subscription status from the backend
  // For now, we'll return 'premium' to allow testing
  try {
    const token = localStorage.getItem("token");
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

  return 'free'; // Default to free if unable to check
}

function loadConversations() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/user/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const conversations = await response.json();
      displayConversations(conversations);
    } else {
      document.getElementById('noChats').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
    document.getElementById('noChats').style.display = 'block';
  }
}

function displayConversations(conversations) {
  const chatList = document.getElementById('chatList');

  if (conversations.length === 0) {
    document.getElementById('noChats').style.display = 'block';
    return;
  }

  conversations.forEach(conv => {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.onclick = () => openChat(conv.user_id, conv.user_name);

    chatItem.innerHTML = `
      <img src="${conv.profile_photo_url || 'https://via.placeholder.com/60'}"
           alt="${conv.user_name}"
           class="chat-avatar"
           onclick="event.stopPropagation(); showProfilePhoto('${conv.profile_photo_url}', '${conv.user_name}')">
      <div class="chat-info">
        <div class="chat-name">${conv.user_name}</div>
        <div class="chat-preview">${conv.last_message || 'Start a conversation...'}</div>
      </div>
      <div class="chat-status">
        ${conv.unread_count > 0 ? `<div class="unread-badge">${conv.unread_count}</div>` : ''}
        <div class="chat-time">${formatTime(conv.last_message_time)}</div>
      </div>
    `;

    chatList.appendChild(chatItem);
  });
}

function openChat(userId, userName) {
  window.location.href = `chat.html?user=${userId}&name=${encodeURIComponent(userName)}`;
}

function showProfilePhoto(photoUrl, userName) {
  const floating = document.getElementById('floatingProfilePhoto');
  const img = document.getElementById('floatingProfilePic');

  img.src = photoUrl || 'https://via.placeholder.com/400';
  img.alt = userName;
  floating.style.display = 'flex';

  document.getElementById('closeProfileBtn').onclick = () => {
    floating.style.display = 'none';
  };

  floating.onclick = (e) => {
    if (e.target === floating) {
      floating.style.display = 'none';
    }
  };
}

function formatTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString();
  }
}