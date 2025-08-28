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

  // Check if we're coming from a specific user
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');

  if (userId) {
    // Redirect to specific chat
    window.location.href = `charts.html?userId=${userId}`;
    return;
  }

  // Check user subscription status
  const userSubscription = await checkUserSubscription();

  if (userSubscription === 'free') {
    document.getElementById('premiumNotice').style.display = 'block';
    document.getElementById('noChats').style.display = 'block';
    return;
  }

  // Load user's conversations
  await loadConversations();
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
  const container = document.getElementById('conversationsList');

  if (conversations.length === 0) {
    document.getElementById('noChats').style.display = 'block';
    return;
  }

  container.innerHTML = '';

  conversations.forEach(conversation => {
    const conversationElement = document.createElement('div');
    conversationElement.className = 'conversation-item';

    const photoUrl = conversation.profile_photo_url || 'https://via.placeholder.com/60?text=No+Photo';
    const lastMessage = conversation.last_message || 'Start a conversation...';
    const isOnline = conversation.is_online || false;

    conversationElement.innerHTML = `
      <img src="${photoUrl}" alt="Profile" class="conversation-photo" onclick="showProfilePhoto('${conversation.user_id}', '${photoUrl}', '${conversation.full_name}')">
      <div class="conversation-info">
        <div class="conversation-name">${conversation.full_name}</div>
        <div class="conversation-preview">${lastMessage}</div>
      </div>
      <div class="conversation-status">
        <div class="status-indicator" style="background: ${isOnline ? '#28a745' : '#dc3545'}"></div>
        <span>${isOnline ? 'Online' : 'Offline'}</span>
      </div>
    `;

    conversationElement.addEventListener('click', (e) => {
      if (!e.target.classList.contains('conversation-photo')) {
        window.location.href = `charts.html?userId=${conversation.user_id}`;
      }
    });

    container.appendChild(conversationElement);
  });
}

function showProfilePhoto(userId, photoUrl, fullName) {
  const floatingProfilePhoto = document.getElementById('floatingProfilePhoto');
  const floatingProfilePic = document.getElementById('floatingProfilePic');
  const viewProfileBtn = document.getElementById('viewProfileBtn');
  const closeProfileBtn = document.getElementById('closeProfileBtn');

  floatingProfilePic.src = photoUrl;
  floatingProfilePic.onerror = function() {
    this.src = 'https://via.placeholder.com/300?text=No+Photo';
  };

  floatingProfilePhoto.style.display = 'block';
  document.body.style.overflow = 'hidden';

  closeProfileBtn.onclick = () => {
    floatingProfilePhoto.style.display = 'none';
    document.body.style.overflow = '';
  };

  viewProfileBtn.onclick = () => {
    window.location.href = `profile.html?id=${userId}`;
  };
}

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