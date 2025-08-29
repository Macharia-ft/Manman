const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware to authenticate user
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Get conversation between current user and target user
router.get('/conversation/:targetUserId', authenticateUser, async (req, res) => {
  try {
    const { targetUserId } = req.params;

    // Get current user ID
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', req.user.email)
      .single();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get messages between the two users
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error in conversation route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message
router.post('/send', authenticateUser, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message || !message.trim()) {
      return res.status(400).json({ error: 'Receiver ID and message are required' });
    }

    // Get current user ID
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', req.user.email)
      .single();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Insert message
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: parseInt(receiverId),
        message: message.trim(),
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error in send message route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.post('/mark-read/:senderId', authenticateUser, async (req, res) => {
  try {
    const { senderId } = req.params;

    // Get current user ID
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', req.user.email)
      .single();

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark messages as read
    const { error } = await supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', parseInt(senderId))
      .eq('receiver_id', currentUser.id)
      .is('read_at', null);

    if (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ error: 'Failed to mark messages as read' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in mark read route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;