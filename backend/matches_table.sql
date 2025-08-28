
-- Create matches table for handling match requests and mutual matching
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraints
    CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ensure no duplicate matches between same users
    CONSTRAINT unique_match UNIQUE (sender_id, receiver_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_matches_sender ON matches(sender_id);
CREATE INDEX IF NOT EXISTS idx_matches_receiver ON matches(receiver_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Create user_interactions table for tracking user actions
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'selected', 'removed', 'accepted', 'rejected', 'matched'
    original_location VARCHAR(20) DEFAULT 'all', -- Track where profile came from
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraints
    CONSTRAINT fk_current_user FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ensure only one active interaction per user pair
    CONSTRAINT unique_active_interaction UNIQUE (current_user_id, target_user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_interactions_current_user ON user_interactions(current_user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_target_user ON user_interactions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_action ON user_interactions(action);

-- Add subscription column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS found_match BOOLEAN DEFAULT FALSE;

-- Create subscriptions table for tracking premium subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan VARCHAR(50) NOT NULL, -- 'premium', 'vip', etc.
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraint
    CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Clean up any existing data to prevent conflicts
DELETE FROM user_interactions;
DELETE FROM matches;
