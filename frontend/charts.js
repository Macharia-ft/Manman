document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem("token");
  const spinnerOverlay = document.getElementById("spinnerOverlay");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    spinnerOverlay.style.display = "flex";
    await loadMatches();
  } catch (error) {
    console.error('Error loading matches:', error);
  } finally {
    spinnerOverlay.style.display = "none";
  }
});

async function loadMatches() {
  try {
    const token = localStorage.getItem("token");

    // Use the conversations API instead of manually calculating
    const response = await fetch(`${config.API_BASE_URL}/api/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const conversations = data.conversations || [];

      // Convert conversations to match format
      const matchesWithConversations = conversations.map(conv => ({
        user_id: conv.user_id,
        user_name: conv.user_name,
        profile_photo_url: conv.profile_photo_url,
        last_message: conv.last_message || 'Start a conversation...',
        unread_count: conv.unread_count || 0
      }));

      displayMatches(matchesWithConversations);
    } else {
      throw new Error('Failed to load conversations');
    }
  } catch (error) {
    console.error('Error loading matches:', error);
    document.getElementById('noMatches').style.display = 'block';
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

function displayMatches(matches) {
  const container = document.getElementById('matchesContainer');
  const noMatches = document.getElementById('noMatches');

  if (matches.length === 0) {
    noMatches.style.display = 'block';
    return;
  }

  container.innerHTML = '';

  matches.forEach(match => {
    const matchCard = document.createElement('div');
    matchCard.className = 'match-card';
    matchCard.onclick = () => {
      window.location.href = `chat.html?user=${match.user_id}&name=${encodeURIComponent(match.user_name)}`;
    };

    const unreadBadge = match.unread_count > 0 ?
      `<span class="unread-badge">${match.unread_count}</span>` : '';

    matchCard.innerHTML = `
      <div class="match-profile">
        <img src="${match.profile_photo_url || 'https://via.placeholder.com/60?text=No+Photo'}"
             alt="Profile" class="match-photo"
             onerror="this.src='https://via.placeholder.com/60?text=No+Photo'">
        <div class="match-info">
          <h3>${match.user_name}${unreadBadge}</h3>
          <p>Matched with you</p>
        </div>
      </div>
      <div class="match-stats">
        <div class="stat">
          <div class="stat-number">${match.unread_count || 0}</div>
          <div class="stat-label">Unread</div>
        </div>
        <div class="stat">
          <div class="stat-number">💬</div>
          <div class="stat-label">Chat</div>
        </div>
        <div class="stat">
          <div class="stat-number">💕</div>
          <div class="stat-label">Matched</div>
        </div>
      </div>
      <p style="text-align: center; color: #667eea; font-weight: bold; margin: 10px 0 0 0;">
        ${match.last_message || 'Start a conversation...'}
      </p>
    `;

    container.appendChild(matchCard);
  });
}

// Add function to refresh matches when returning from chat
window.addEventListener('focus', () => {
  // Reload matches when window gains focus (user returns from chat)
  loadMatches();
});

// Add periodic refresh to keep unread counts updated
setInterval(() => {
  loadMatches();
}, 30000); // Refresh every 30 seconds