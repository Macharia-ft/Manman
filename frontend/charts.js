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

  // Match Statistics Chart
  function renderMatchChart() {
    const matchChartData = {
      labels: ['Matches', 'Selected', 'Rejected'],
      datasets: [{
        data: [12, 8, 15],
        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    };
    const matchChartOptions = { type: 'pie', backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1'] };
    createChart('matchChart', matchChartData, matchChartOptions);
  }

  // Activity Chart
  function renderActivityChart() {
    const activityChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Daily Activity',
        data: [5, 8, 12, 15, 10, 20, 18],
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    };
    const activityChartOptions = { type: 'line', borderColor: '#ff6b6b', backgroundColor: 'rgba(255, 107, 107, 0.1)' };
    createChart('activityChart', activityChartData, activityChartOptions);
  }

  renderMatchChart();
  renderActivityChart();

  loadConversations(); // Call the original function to load conversations
});

// Charts.js - Simple chart functionality without ES6 classes

function createChart(canvasId, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error('Canvas element not found:', canvasId);
    return null;
  }

  const ctx = canvas.getContext('2d');

  // Simple bar chart implementation
  if (options.type === 'bar') {
    return drawBarChart(ctx, canvas, data, options);
  } else if (options.type === 'line') {
    return drawLineChart(ctx, canvas, data, options);
  } else if (options.type === 'pie') {
    return drawPieChart(ctx, canvas, data, options);
  }

  return null;
}

function drawBarChart(ctx, canvas, data, options) {
  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
    return;
  }

  const values = data.datasets[0].data;
  const labels = data.labels || [];
  const maxValue = Math.max(...values);
  const barWidth = (width - padding * 2) / values.length;

  // Draw bars
  ctx.fillStyle = options.backgroundColor || '#3498db';
  values.forEach((value, index) => {
    const barHeight = (value / maxValue) * (height - padding * 2);
    const x = padding + index * barWidth;
    const y = height - padding - barHeight;

    ctx.fillRect(x, y, barWidth - 10, barHeight);

    // Draw labels
    if (labels[index]) {
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.fillText(labels[index], x, height - 10);
      ctx.fillStyle = options.backgroundColor || '#3498db';
    }
  });

  return { update: function() { drawBarChart(ctx, canvas, data, options); } };
}

function drawLineChart(ctx, canvas, data, options) {
  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;

  ctx.clearRect(0, 0, width, height);

  if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
    return;
  }

  const values = data.datasets[0].data;
  const maxValue = Math.max(...values);
  const pointWidth = (width - padding * 2) / (values.length - 1);

  ctx.strokeStyle = options.borderColor || '#3498db';
  ctx.lineWidth = 2;
  ctx.beginPath();

  values.forEach((value, index) => {
    const x = padding + index * pointWidth;
    const y = height - padding - (value / maxValue) * (height - padding * 2);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    // Draw points
    ctx.fillStyle = options.backgroundColor || '#3498db';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
  });

  ctx.stroke();

  return { update: function() { drawLineChart(ctx, canvas, data, options); } };
}

function drawPieChart(ctx, canvas, data, options) {
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  ctx.clearRect(0, 0, width, height);

  if (!data.datasets || !data.datasets[0] || !data.datasets[0].data) {
    return;
  }

  const values = data.datasets[0].data;
  const total = values.reduce((sum, value) => sum + value, 0);
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'];

  let currentAngle = 0;

  values.forEach((value, index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;

    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    currentAngle += sliceAngle;
  });

  return { update: function() { drawPieChart(ctx, canvas, data, options); } };
}

// Export for use in other files
window.createChart = createChart;


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

async function loadConversations() {
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