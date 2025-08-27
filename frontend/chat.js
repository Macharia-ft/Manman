
let currentUserId = null;
let currentUserName = null;
let currentUserPhoto = null;
let messages = [];
let socket = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem("token");
  
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Get user info from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  currentUserId = urlParams.get('user');
  currentUserName = urlParams.get('name');

  if (!currentUserId || !currentUserName) {
    window.location.href = "charts.html";
    return;
  }

  // Initialize chat
  await initializeChat();
  await loadMessages();
  
  // Initialize WebSocket connection for real-time messaging
  initializeWebSocket();
});

async function initializeChat() {
  document.getElementById('chatUsername').textContent = currentUserName;
  
  try {
    // Fetch user profile photo
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/user/profile/${currentUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      const userData = await response.json();
      currentUserPhoto = userData.profile_photo_url || 'https://via.placeholder.com/40';
      document.getElementById('chatAvatar').src = currentUserPhoto;
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    document.getElementById('chatAvatar').src = 'https://via.placeholder.com/40';
  }
}

async function loadMessages() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/chat/messages/${currentUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      messages = await response.json();
      displayMessages();
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

function displayMessages() {
  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.innerHTML = '';
  
  messages.forEach(message => {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.is_own ? 'own' : ''}`;
    
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text">${escapeHtml(message.content)}</div>
        <div class="message-time">${formatMessageTime(message.created_at)}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function initializeWebSocket() {
  // WebSocket implementation would go here
  // For now, we'll use polling to simulate real-time updates
  setInterval(loadMessages, 5000); // Poll every 5 seconds
}

async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const messageText = messageInput.value.trim();
  
  if (!messageText) return;
  
  sendBtn.disabled = true;
  
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient_id: currentUserId,
        content: messageText
      })
    });
    
    if (response.ok) {
      messageInput.value = '';
      await loadMessages(); // Reload messages to show the new one
    } else {
      alert('Failed to send message. Please try again.');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Network error. Please check your connection.');
  } finally {
    sendBtn.disabled = false;
  }
}

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

function showProfilePhoto() {
  const floating = document.getElementById('floatingProfilePhoto');
  const img = document.getElementById('floatingProfilePic');
  
  img.src = currentUserPhoto || 'https://via.placeholder.com/400';
  img.alt = currentUserName;
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

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
