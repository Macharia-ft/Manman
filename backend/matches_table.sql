
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
CREATE INDEX idx_matches_sender ON matches(sender_id);
CREATE INDEX idx_matches_receiver ON matches(receiver_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Create user_interactions table for tracking user actions
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'selected', 'removed', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraints
    CONSTRAINT fk_current_user FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ensure no duplicate interactions between same users for same action
    CONSTRAINT unique_interaction UNIQUE (current_user_id, target_user_id, action)
);

-- Create indexes for faster queries
CREATE INDEX idx_interactions_current_user ON user_interactions(current_user_id);
CREATE INDEX idx_interactions_target_user ON user_interactions(target_user_id);
CREATE INDEX idx_interactions_action ON user_interactions(action);

-- Insert sample data (optional - remove if not needed)
-- This is just for testing purposes
INSERT INTO matches (sender_id, receiver_id, status) VALUES 
(1, 2, 'pending'),
(3, 1, 'accepted'),
(2, 3, 'rejected');

-- Add subscription column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription VARCHAR(20) DEFAULT 'free';

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
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
