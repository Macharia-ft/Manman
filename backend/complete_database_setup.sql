
-- Complete Database Setup for Dating App
-- This script will drop all existing tables and recreate them with proper structure

-- Drop all tables in the correct order to handle foreign key constraints
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS pending_premium_subscriptions CASCADE;
DROP TABLE IF EXISTS pending_media_updates CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS payment_approvals CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Create users table with all required columns if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    id_front_url TEXT,
    id_back_url TEXT,
    liveness_video_url TEXT,
    full_name VARCHAR(255),
    dob DATE,
    gender VARCHAR(50),
    orientation VARCHAR(50),
    country_of_birth VARCHAR(100),
    country_of_residence VARCHAR(100),
    city VARCHAR(100),
    willing_to_relocate VARCHAR(20),
    languages TEXT,
    preferred_language VARCHAR(50),
    education VARCHAR(100),
    occupation VARCHAR(255),
    employment_type VARCHAR(100),
    religion VARCHAR(100),
    religious_importance VARCHAR(50),
    political_views VARCHAR(50),
    height INTEGER,
    weight INTEGER,
    skin_color VARCHAR(50),
    body_type VARCHAR(50),
    eye_color VARCHAR(50),
    hair_color VARCHAR(50),
    ethnicity VARCHAR(100),
    diet VARCHAR(50),
    smoking VARCHAR(50),
    drinking VARCHAR(50),
    exercise VARCHAR(50),
    pets VARCHAR(50),
    living_situation VARCHAR(100),
    children VARCHAR(50),
    photo_url TEXT,
    video_url TEXT,
    pref_gender VARCHAR(50),
    pref_age_min INTEGER,
    pref_age_max INTEGER,
    pref_country VARCHAR(100),
    pref_languages TEXT,
    pref_religion VARCHAR(100),
    pref_religion_importance VARCHAR(50),
    pref_height VARCHAR(50),
    pref_weight VARCHAR(50),
    pref_body_type VARCHAR(50),
    pref_skin_color VARCHAR(50),
    pref_ethnicity VARCHAR(100),
    pref_diet VARCHAR(50),
    pref_drinking VARCHAR(50),
    pref_smoking VARCHAR(50),
    pref_exercise VARCHAR(50),
    pref_pets VARCHAR(50),
    pref_children VARCHAR(50),
    pref_living_situation VARCHAR(100),
    pref_willing_to_relocate VARCHAR(20),
    pref_relationship_type VARCHAR(100),
    national_id_number VARCHAR(50),
    county_of_residence VARCHAR(100),
    pref_country_of_birth VARCHAR(100),
    pref_country_of_residence VARCHAR(100),
    pref_county_of_residence VARCHAR(100),
    profile_photo_url TEXT,
    profile_video_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_step VARCHAR(50) DEFAULT 'identity',
    is_complete BOOLEAN DEFAULT FALSE,
    id_front_public_id VARCHAR(255),
    id_back_public_id VARCHAR(255),
    liveness_public_id VARCHAR(255),
    profile_photo_public_id VARCHAR(255),
    profile_video_public_id VARCHAR(255),
    subscription VARCHAR(20) DEFAULT 'free',
    found_match BOOLEAN DEFAULT FALSE,
    matched_with INTEGER DEFAULT NULL
);

-- Create admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_interactions table
CREATE TABLE user_interactions (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'selected', 'removed', 'accepted', 'rejected', 'matched'
    original_location VARCHAR(20) DEFAULT 'all', -- Track where profile came from
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(current_user_id, target_user_id)
);

-- Create matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(sender_id, receiver_id)
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create pending_media_updates table
CREATE TABLE pending_media_updates (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    pending_photo_url TEXT,
    pending_video_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_message TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(255)
);

-- Create pending_premium_subscriptions table
CREATE TABLE pending_premium_subscriptions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_proof_url TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    transaction_reference VARCHAR(255),
    phone_number VARCHAR(20),
    plan VARCHAR(50) NOT NULL DEFAULT 'premium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_message TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- Create chat_messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create messages table (alternative chat table)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create all necessary indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_subscription ON users(subscription);

CREATE INDEX idx_interactions_current_user ON user_interactions(current_user_id);
CREATE INDEX idx_interactions_target_user ON user_interactions(target_user_id);
CREATE INDEX idx_interactions_action ON user_interactions(action);

CREATE INDEX idx_matches_sender ON matches(sender_id);
CREATE INDEX idx_matches_receiver ON matches(receiver_id);
CREATE INDEX idx_matches_status ON matches(status);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_pending_media_status ON pending_media_updates(status);
CREATE INDEX idx_pending_media_user ON pending_media_updates(user_email);

CREATE INDEX idx_pending_subscriptions_status ON pending_premium_subscriptions(status);
CREATE INDEX idx_pending_subscriptions_user ON pending_premium_subscriptions(user_email);

CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_sent_at ON chat_messages(sent_at);

CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, read_at);

-- Insert default admin user (password: admin123)
INSERT INTO admins (email, password_hash, name) 
VALUES ('takeyours001@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User')
ON CONFLICT (email) DO NOTHING;

-- Verify tables were created successfully
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'Users table: % records', (SELECT count(*) FROM users);
    RAISE NOTICE 'Admins table: % records', (SELECT count(*) FROM admins);
    RAISE NOTICE 'User interactions table: % records', (SELECT count(*) FROM user_interactions);
    RAISE NOTICE 'Matches table: % records', (SELECT count(*) FROM matches);
    RAISE NOTICE 'Subscriptions table: % records', (SELECT count(*) FROM subscriptions);
    RAISE NOTICE 'Pending media updates table: % records', (SELECT count(*) FROM pending_media_updates);
    RAISE NOTICE 'Pending premium subscriptions table: % records', (SELECT count(*) FROM pending_premium_subscriptions);
    RAISE NOTICE 'Chat messages table: % records', (SELECT count(*) FROM chat_messages);
    RAISE NOTICE 'Messages table: % records', (SELECT count(*) FROM messages);
END $$;
