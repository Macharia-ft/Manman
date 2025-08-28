require("dotenv").config({ path: "./backend/.env" });
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");


// Routes
const authRoutes = require("./routes/auth");
const uploadIdentityRoute = require("./routes/upload-identity");
const personalRoute = require("./routes/personal");
const preferencesRoute = require("./routes/preferences");
const statusRoute = require("./routes/status");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");

const app = express();

// ✅ CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Handle large requests (videos + images)
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// ✅ Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ API routes
app.use("/api", authRoutes);
app.use("/api", uploadIdentityRoute);
app.use("/api", personalRoute);
app.use("/api", preferencesRoute);
app.use("/api", statusRoute);
app.use("/api", adminRoutes);
app.use("/api/user", userRoutes);

// ✅ Fetch the user ID based on email
async function getUserIdByEmail(currentUserEmail) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', currentUserEmail)  // Fetch the user id by email
    .single();

  if (error) {
    console.error("Error fetching user ID:", error);
    throw new Error(`Supabase Query Error: ${error.message}`);
  }

  if (!data) {
    throw new Error('No user found with the provided email.');
  }

  return data.id;  // Return the user ID
}

// ✅ Fetch all users excluding the current logged-in user by user ID
async function fetchUsers(currentUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('id', currentUserId);  // Exclude the logged-in user by id

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error(`Supabase Query Error: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No users found in the database.');
  }

  return data;
}

// Function to fetch users with pre-filtering based on preferences
async function fetchUsersWithPreFiltering(currentUserId, currentUser) {
  let query = supabase
    .from('users')
    .select('*')
    .neq('id', currentUserId)
    .eq('status', 'approved');

  // Filter by preferred gender
  if (currentUser.pref_gender) {
    query = query.eq('gender', currentUser.pref_gender);
  }

  // Filter by preferred county (country_of_residence)
  if (currentUser.pref_country_of_residence) {
    query = query.eq('country_of_residence', currentUser.pref_country_of_residence);
  }

  // Filter by age range
  if (currentUser.pref_age_min && currentUser.pref_age_max) {
    // Calculate age from date of birth
    query = query.gte('dob', new Date(new Date().getFullYear() - currentUser.pref_age_max, new Date().getMonth(), new Date().getDate()).toISOString())
                 .lte('dob', new Date(new Date().getFullYear() - currentUser.pref_age_min, new Date().getMonth(), new Date().getDate()).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching users with pre-filtering:", error);
    throw new Error(`Supabase Query Error: ${error.message}`);
  }

  return data || [];
}

// ✅ Endpoint to fetch users and calculate match score
app.get('/api/users/:email', async (req, res) => {
  const currentUserEmail = req.params.email;  // Current logged-in user email

  try {
    // Fetch the user ID based on the email
    const currentUserId = await getUserIdByEmail(currentUserEmail);
    const currentUser = await getUserById(currentUserId);  // Fetch the logged-in user's full profile

    // Pre-filter users based on key preferences before fetching all users
    const preFilteredUsers = await fetchUsersWithPreFiltering(currentUserId, currentUser);

    if (preFilteredUsers.length === 0) {
      let adjustMessage = "No users found matching your preferences for All Profiles. ";

      if (currentUser.pref_gender && currentUser.pref_gender !== 'Any') {
        adjustMessage += `Try adjusting your preferred gender (currently: ${currentUser.pref_gender}). `;
      }

      if (currentUser.pref_county_of_residence) {
        adjustMessage += `Try adjusting your preferred county (currently: ${currentUser.pref_county_of_residence}). `;
      }

      if (currentUser.pref_age_min && currentUser.pref_age_max) {
        adjustMessage += `Try adjusting your age range (currently: ${currentUser.pref_age_min}-${currentUser.pref_age_max} years). `;
      }

      adjustMessage += "Consider broadening your criteria to find more matches.";

      return res.status(200).json({
        shouldAdjustPreferences: true,
        message: adjustMessage,
        users: [],
        section: 'all_profiles'
      });
    }

    // Calculate match scores only for pre-filtered users
    const matchedUsers = preFilteredUsers.map(user => {
      const matchScore = calculateMatchScore(user, currentUser);
      return { ...user, matchScore };
    });

    // Sort users by match score in descending order
    matchedUsers.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      users: matchedUsers,
      message: null,
      shouldAdjustPreferences: false
    });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Helper function to get a user by their ID
async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)  // Fetch the user by ID
    .single();

  if (error) {
    throw new Error('Error fetching current user');
  }

  return data;
}

// Function to calculate match score
function calculateMatchScore(user, currentUser) {
  let score = 0;

  // Check each attribute and match preferences with personal info
  score += compareAttribute(user.gender, currentUser.pref_gender);
  score += compareAttribute(user.dob, currentUser.pref_age_min, currentUser.pref_age_max);
  score += compareAttribute(user.country_of_birth, currentUser.pref_country_of_birth);
  score += compareAttribute(user.country_of_residence, currentUser.pref_country_of_residence);
  score += compareAttribute(user.languages, currentUser.pref_languages);
  score += compareAttribute(user.religion, currentUser.pref_religion);
  score += compareAttribute(user.height, currentUser.pref_height);
  score += compareAttribute(user.weight, currentUser.pref_weight);
  score += compareAttribute(user.body_type, currentUser.pref_body_type);
  score += compareAttribute(user.skin_color, currentUser.pref_skin_color);
  score += compareAttribute(user.ethnicity, currentUser.pref_ethnicity);
  score += compareAttribute(user.diet, currentUser.pref_diet);
  score += compareAttribute(user.smoking, currentUser.pref_smoking);
  score += compareAttribute(user.drinking, currentUser.pref_drinking);
  score += compareAttribute(user.exercise, currentUser.pref_exercise);
  score += compareAttribute(user.pets, currentUser.pref_pets);
  score += compareAttribute(user.children, currentUser.pref_children);
  score += compareAttribute(user.living_situation, currentUser.pref_living_situation);
  score += compareAttribute(user.willing_to_relocate, currentUser.pref_willing_to_relocate);

  return score;
}

// Helper function to compare two attributes, accounting for null or empty values
function compareAttribute(userValue, prefValue, prefMin, prefMax) {
  if (userValue == null || prefValue == null) return 0;  // No match if either value is null

  // If it's an array (languages or multiple values), check if there's any match
  if (Array.isArray(userValue) && Array.isArray(prefValue)) {
    return userValue.some(val => prefValue.includes(val)) ? 1 : 0;
  }

  // For numerical values (age, height, weight), check within a range if the preference is a range
  if (prefMin != null && prefMax != null && !isNaN(userValue)) {
    return (userValue >= prefMin && userValue <= prefMax) ? 1 : 0;
  }

  // Compare for exact matches (strings, numbers)
  return userValue === prefValue ? 1 : 0;
}

// ✅ API route to fetch the current user's profile photo URL
app.get('/api/user/profile-photo/:email', async (req, res) => {
  const currentUserEmail = req.params.email;  // Current logged-in user email

  try {
    // Fetch the user ID based on the email
    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Fetch the current user's profile data by ID
    const currentUser = await getUserById(currentUserId);

    // Check if the user has a profile photo URL
    const profilePhotoUrl = currentUser.photo_url || currentUser.profile_photo_url;

    if (!profilePhotoUrl) {
      return res.status(404).json({
        success: false,
        message: 'Profile photo not found',
      });
    }

    // Return the profile photo URL
    res.json({
      success: true,
      profile_photo_url: profilePhotoUrl,
    });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ API route to fetch profiles of people who selected the current user
app.get('/api/users/selected-you/:email', async (req, res) => {
  const currentUserEmail = req.params.email;

  try {
    // Fetch the current user's ID
    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Fetch users who selected the current user (corrected logic)
    const { data, error } = await supabase
      .from('user_interactions')
      .select('current_user_id, action')
      .eq('selected_user_id', currentUserId)
      .eq('action', 'selected');  // Only fetching selections

    if (error) {
      console.error("Error fetching user selections:", error);
      throw new Error('Error fetching user interactions');
    }

    // Extract the IDs of users who selected the current user
    const selectorUserIds = data.map(interaction => interaction.current_user_id);

    // If no one selected the current user
    if (selectorUserIds.length === 0) {
      return res.json([]);
    }

    // Fetch the profiles of users who selected the current user
    const { data: selectorUsers, error: userError } = await supabase
      .from('users')
      .select('*')
      .in('id', selectorUserIds);

    if (userError) {
      console.error("Error fetching selector users:", userError);
      throw new Error('Error fetching selector users');
    }

    // Add actions to the profiles
    const selectorUsersWithActions = selectorUsers.map(user => {
      const actionData = data.find(interaction => interaction.current_user_id === user.id);
      return { ...user, action: actionData.action };
    });

    // Return the users with actions and match score
    const currentUser = await getUserById(currentUserId);
    const selectorUsersWithMatchScore = selectorUsersWithActions.map(user => {
      const matchScore = calculateMatchScore(user, currentUser);
      return { ...user, matchScore };
    });

    // Sort users by match score in descending order
    selectorUsersWithMatchScore.sort((a, b) => b.matchScore - a.matchScore);

    res.json(selectorUsersWithMatchScore);
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ API route to send match request
app.post('/api/users/match/:email', async (req, res) => {
  const currentUserEmail = req.params.email;
  const { matchedUserId } = req.body;

  try {
    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Check if match already exists
    const { data: existingMatch, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${matchedUserId}),and(sender_id.eq.${matchedUserId},receiver_id.eq.${currentUserId})`)
      .single();

    if (existingMatch) {
      return res.status(400).json({ success: false, message: "Match already exists" });
    }

    // Create match request
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        sender_id: currentUserId,
        receiver_id: matchedUserId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error("Match request creation error:", createError.message);
      return res.status(500).json({ success: false, message: "Failed to create match request" });
    }

    res.json({ success: true, message: "Match request sent successfully", match: newMatch });
  } catch (error) {
    console.error("Error in match request:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ API route to get mutual matches
app.get('/api/users/mutual-matches/:email', async (req, res) => {
  const currentUserEmail = req.params.email;

  try {
    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Get mutual matches where both users have matched each other
    const { data: mutualMatches, error } = await supabase
      .from('matches')
      .select(`
        *,
        sender:users!matches_sender_id_fkey(*),
        receiver:users!matches_receiver_id_fkey(*)
      `)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .eq('status', 'accepted');

    if (error) {
      console.error("Error fetching mutual matches:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    // Process mutual matches to return the other user's profile
    const processedMatches = mutualMatches.map(match => {
      const otherUser = match.sender_id === currentUserId ? match.receiver : match.sender;
      return {
        ...otherUser,
        matchId: match.id,
        matchedAt: match.created_at,
        isMutualMatch: true
      };
    });

    res.json(processedMatches);
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ API route to accept a selected user
app.post('/api/users/accept/:email', async (req, res) => {
  const currentUserEmail = req.params.email;
  const { selectedUserId } = req.body;

  try {
    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Update the interaction to "accepted"
    const { error } = await supabase
      .from('user_interactions')
      .update({ action: 'accepted' })
      .eq('current_user_id', currentUserId)
      .eq('selected_user_id', selectedUserId);

    if (error) {
      console.error("Error updating interaction to accepted:", error);
      throw new Error('Error accepting user');
    }

    res.json({ success: true, message: 'User accepted' });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ API route to reject a selected user
app.post('/api/users/reject/:email', async (req, res) => {
  const currentUserEmail = req.params.email;
  const { selectedUserId } = req.body;  // Expecting selected user's ID

  try {
    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Update the interaction to "rejected"
    const { error } = await supabase
      .from('user_interactions')
      .update({ action: 'rejected' })
      .eq('current_user_id', currentUserId)
      .eq('selected_user_id', selectedUserId);

    if (error) {
      console.error("Error updating interaction to rejected:", error);
      throw new Error('Error rejecting user');
    }

    res.json({ success: true, message: 'User rejected' });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ API route to fetch user interactions
app.get('/api/users/interactions/:email', async (req, res) => {
  const currentUserEmail = req.params.email;

  try {
    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Fetch all interactions for the current user
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select(`
        *,
        target_user:users(*)
      `)
      .eq('current_user_id', currentUserId);

    if (error) {
      console.error("Error fetching user interactions:", error);
      throw new Error('Error fetching user interactions');
    }

    // Transform the data to include user details
    const userInteractions = interactions.map(interaction => ({
      ...interaction.target_user,
      action: interaction.action,
      originalLocation: interaction.original_location || 'all',
      interactionId: interaction.id
    }));

    res.json(userInteractions);
  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ API route to handle user interactions (select, remove, accept, etc.)
app.post('/api/users/interact', async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserEmail = decoded.email;
    const { targetUserId, action, originalLocation } = req.body;

    const currentUserId = await getUserIdByEmail(currentUserEmail);

    // Check if interaction already exists
    const { data: existingInteraction, error: checkError } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('current_user_id', currentUserId)
      .eq('target_user_id', targetUserId)
      .single();

    if (existingInteraction) {
      // Update existing interaction
      const { error: updateError } = await supabase
        .from('user_interactions')
        .update({ 
          action: action,
          original_location: originalLocation || existingInteraction.original_location || 'all',
          updated_at: new Date().toISOString()
        })
        .eq('current_user_id', currentUserId)
        .eq('target_user_id', targetUserId);

      if (updateError) {
        throw new Error('Error updating interaction');
      }
    } else {
      // Create new interaction
      const { error: insertError } = await supabase
        .from('user_interactions')
        .insert({
          current_user_id: currentUserId,
          target_user_id: targetUserId,
          action: action,
          original_location: originalLocation || 'all'
        });

      if (insertError) {
        throw new Error('Error creating interaction');
      }
    }

    res.json({ success: true, message: 'Interaction updated successfully' });
  } catch (error) {
    console.error("Error in user interaction:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ API route to update interaction when a user selects another user
app.post('/api/users/select/:email', async (req, res) => {
  const currentUserEmail = req.params.email;
  const { selectedUserId, action } = req.body;

  console.log(`📦 Select user request - Current user: ${currentUserEmail}, Selected user: ${selectedUserId}, Action: ${action}`);

  try {
    // Validate input
    if (!selectedUserId || !action) {
      return res.status(400).json({ success: false, message: "Missing selectedUserId or action" });
    }

    // Fetch the current user's ID based on the email
    const currentUserId = await getUserIdByEmail(currentUserEmail);
    if (!currentUserId) {
      return res.status(400).json({ success: false, message: "Current user not found." });
    }

    // Check if an interaction already exists between these two users
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('current_user_id', currentUserId)
      .eq('target_user_id', selectedUserId);

    if (error) {
      console.error('❌ Error checking user interaction:', error);
      return res.status(500).json({ success: false, message: 'Error checking user interaction' });
    }

    if (data.length > 0) {
      // If interaction already exists, just update it
      const { error: updateError } = await supabase
        .from('user_interactions')
        .update({ action: action })
        .eq('current_user_id', currentUserId)
        .eq('target_user_id', selectedUserId);

      if (updateError) {
        console.error('❌ Error updating user interaction:', updateError);
        return res.status(500).json({ success: false, message: 'Error updating user interaction' });
      }

      console.log('✅ User interaction updated successfully');
      return res.json({ success: true, message: 'Interaction updated successfully' });
    } else {
      // If no interaction exists, create a new one
      const { error: insertError } = await supabase
        .from('user_interactions')
        .insert({
          current_user_id: currentUserId,
          target_user_id: selectedUserId,
          selected_user_id: selectedUserId,
          action: action
        });

      if (insertError) {
        console.error('❌ Error creating user interaction:', insertError);
        return res.status(500).json({ success: false, message: 'Error creating user interaction' });
      }

      console.log('✅ User interaction created successfully');
      return res.json({ success: true, message: 'Interaction created successfully' });
    }
  } catch (error) {
    console.error('❌ Error in select user endpoint:', error);
    return res.status(500).json({ success: false, message: 'Server error during user selection' });
  }
});


// Serve the profile page (frontend)
app.use(express.static('frontend'));  // Serve static files (HTML, CSS, JS)

// Endpoint to fetch user data based on ID
app.get('/api/user', async (req, res) => {
  const userId = req.query.id;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // Query Supabase database to get user data by ID
    const { data, error } = await supabase
      .from('users')  // Replace 'users' with your table name
      .select('*')
      .eq('id', userId)
      .single();  // Fetch a single record

    if (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ message: 'Error fetching user data' });
    }

    if (!data) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out sensitive information like email, password, and ID numbers
    const { password, email, national_id_number, id_front_url, id_back_url, liveness_video_url, ...publicData } = data;

    // Return public data (exclude sensitive information)
    res.json(publicData);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("✅ Takeyours Identity Verification API is running.");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});