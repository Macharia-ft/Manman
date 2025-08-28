
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
        // Redirect free users immediately without showing content
        window.location.href = 'dashboard_page.html';
        return;
      }
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    window.location.href = 'dashboard_page.html';
    return;
  }

  // Load conversations for premium users
  await loadConversations();
  
  // Add search functionality
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const chatItems = document.querySelectorAll('.chat-item');
      
      chatItems.forEach(item => {
        const name = item.querySelector('.chat-name').textContent.toLowerCase();
        const preview = item.querySelector('.chat-preview').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || preview.includes(searchTerm)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
});

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
      <img src="${conv.profile_photo_url || 'https://via.placeholder.com/80'}"
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
