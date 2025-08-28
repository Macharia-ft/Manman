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

  // Check user subscription status first
  const userSubscription = await checkUserSubscription();

  if (userSubscription === 'free') {
    document.getElementById('premiumNotice').style.display = 'block';
    document.getElementById('chatMessages').style.display = 'none';
    document.getElementById('chatInputContainer').style.display = 'none';
    return;
  }

  // Get user info from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  currentUserId = urlParams.get('user');
  currentUserName = urlParams.get('name');

  if (!currentUserId) {
    // Redirect back to charts if no user specified
    window.location.href = 'charts.html';
    return;
  }

  // Initialize chat
  await initializeChat();
  setupMessageInput();
  loadMessages();

  // Setup profile photo click handler
  const chatAvatar = document.getElementById('chatAvatar');
  if (chatAvatar) {
    chatAvatar.addEventListener('click', () => {
      showProfilePhoto(chatAvatar.src, currentUserName);
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

async function initializeChat() {
  try {
    const token = localStorage.getItem("token");

    // Fetch user details
    const response = await fetch(`${config.API_BASE_URL}/api/user?id=${currentUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const userData = await response.json();

      // Update UI with user info
      document.getElementById('chatUserName').textContent = userData.full_name || currentUserName || 'Unknown User';

      const chatAvatar = document.getElementById('chatAvatar');
      if (userData.profile_photo_url) {
        chatAvatar.src = userData.profile_photo_url;
      }

      chatAvatar.onerror = () => {
        chatAvatar.src = 'https://via.placeholder.com/50?text=User';
      };
    }
  } catch (error) {
    console.error('Error initializing chat:', error);
  }
}

function setupMessageInput() {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  // Auto-resize textarea
  messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  // Send message on Enter (Shift+Enter for new line)
  messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Send button click
  sendBtn.addEventListener('click', sendMessage);
}

function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();

  if (message === '') return;

  // Display message immediately
  displayMessage(message, 'sent');

  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';

  // Here you would typically send the message to your backend/socket server
  // For now, we'll just simulate receiving a message after a delay
  setTimeout(() => {
    const responses = [
      "That's interesting!",
      "Tell me more about that.",
      "I agree with you.",
      "What do you think about it?",
      "That sounds great!",
      "I'd love to hear more.",
      "That's a good point."
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    displayMessage(randomResponse, 'received');
  }, 1000 + Math.random() * 2000);
}

function displayMessage(message, type) {
  const messagesContainer = document.getElementById('chatMessages');

  // Remove "no messages" text if it exists
  const noMessages = messagesContainer.querySelector('.no-messages');
  if (noMessages) {
    noMessages.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = message;

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  bubble.appendChild(time);
  messageDiv.appendChild(bubble);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function loadMessages() {
  // In a real application, you would load messages from your backend
  // For now, we'll just show the initial "start conversation" state
  const messagesContainer = document.getElementById('chatMessages');
  messagesContainer.innerHTML = '<div class="no-messages">Start your conversation here...</div>';
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