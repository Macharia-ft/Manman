
let currentUserId = null;
let targetUserId = null;
let targetUserName = null;
let messagesPolling = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  targetUserId = urlParams.get('user');
  targetUserName = urlParams.get('name');

  if (!targetUserId || !targetUserName) {
    alert('Invalid chat parameters');
    window.location.href = 'charts.html';
    return;
  }

  // Get current user info
  currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    alert('Unable to get user information');
    window.location.href = 'charts.html';
    return;
  }

  // Set up UI
  document.getElementById('chatUserName').textContent = decodeURIComponent(targetUserName);
  
  // Load target user photo
  await loadTargetUserPhoto();

  // Load messages
  await loadMessages();

  // Mark messages as read
  await markMessagesAsRead();

  // Set up message input
  setupMessageInput();

  // Start polling for new messages
  startMessagesPolling();
});

async function getCurrentUserId() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/user/current-preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const userData = await response.json();
      return userData.id;
    }
  } catch (error) {
    console.error('Error getting current user ID:', error);
  }
  return null;
}

async function loadTargetUserPhoto() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/user/profile-photo/${targetUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const photoElement = document.getElementById('chatUserPhoto');
      photoElement.src = data.profile_photo_url || 'https://via.placeholder.com/40?text=No+Photo';
      photoElement.onerror = () => {
        photoElement.src = 'https://via.placeholder.com/40?text=No+Photo';
      };
    }
  } catch (error) {
    console.error('Error loading target user photo:', error);
    document.getElementById('chatUserPhoto').src = 'https://via.placeholder.com/40?text=No+Photo';
  }
}

async function loadMessages() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/messages/conversation/${targetUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      displayMessages(data.messages || []);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

function displayMessages(messages) {
  const container = document.getElementById('messagesContainer');
  container.innerHTML = '';

  messages.forEach(message => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender_id === currentUserId ? 'sent' : 'received'}`;
    
    const messageTime = new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      ${message.message}
      <div class="message-time">${messageTime}</div>
    `;

    container.appendChild(messageDiv);
  });

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

async function markMessagesAsRead() {
  try {
    const token = localStorage.getItem("token");
    await fetch(`${config.API_BASE_URL}/api/messages/mark-read/${targetUserId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}

function setupMessageInput() {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendButton.addEventListener('click', sendMessage);
}

async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();

  if (!message) return;

  const sendButton = document.getElementById('sendButton');
  sendButton.disabled = true;
  messageInput.disabled = true;

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${config.API_BASE_URL}/api/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receiverId: targetUserId,
        message: message
      })
    });

    if (response.ok) {
      messageInput.value = '';
      await loadMessages(); // Refresh messages
    } else {
      alert('Failed to send message');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Network error');
  } finally {
    sendButton.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  }
}

function startMessagesPolling() {
  messagesPolling = setInterval(async () => {
    await loadMessages();
  }, 3000); // Poll every 3 seconds
}

// Clean up polling when leaving the page
window.addEventListener('beforeunload', () => {
  if (messagesPolling) {
    clearInterval(messagesPolling);
  }
});
