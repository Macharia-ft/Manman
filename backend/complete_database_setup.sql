
-- Complete Database Setup for Dating App
-- Run this SQL script in your PostgreSQL database

-- First, let's check if matches table exists and drop it if it has wrong structure
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Create matches table for handling match requests and mutual matching
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints only if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE matches ADD CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE matches ADD CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add unique constraint to prevent duplicate matches
ALTER TABLE matches ADD CONSTRAINT unique_match UNIQUE (sender_id, receiver_id);

-- Create indexes for faster queries
CREATE INDEX idx_matches_sender ON matches(sender_id);
CREATE INDEX idx_matches_receiver ON matches(receiver_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Create user_interactions table for tracking user actions
CREATE TABLE user_interactions (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    selected_user_id INTEGER, -- Alternative naming for compatibility
    action VARCHAR(20) NOT NULL, -- 'selected', 'removed', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints for user_interactions if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE user_interactions ADD CONSTRAINT fk_current_user FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE user_interactions ADD CONSTRAINT fk_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for faster queries on user_interactions
CREATE INDEX idx_interactions_current_user ON user_interactions(current_user_id);
CREATE INDEX idx_interactions_target_user ON user_interactions(target_user_id);
CREATE INDEX idx_interactions_selected_user ON user_interactions(selected_user_id);
CREATE INDEX idx_interactions_action ON user_interactions(action);

-- Add subscription column to users table if it exists and doesn't have it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription') THEN
            ALTER TABLE users ADD COLUMN subscription VARCHAR(20) DEFAULT 'free';
        END IF;
    END IF;
END $$;

-- Create subscriptions table for tracking premium subscriptions
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan VARCHAR(50) NOT NULL, -- 'premium', 'vip', etc.
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for subscriptions if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE subscriptions ADD CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for faster subscription queries
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Insert sample data for testing (optional - remove if not needed)
-- Only insert if we have actual users with those IDs
DO $$
DECLARE
    user_count INTEGER;
    user1_exists BOOLEAN := FALSE;
    user2_exists BOOLEAN := FALSE;
    user3_exists BOOLEAN := FALSE;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Check if specific user IDs exist
        SELECT COUNT(*) INTO user_count FROM users;
        
        IF user_count >= 3 THEN
            -- Check if users with IDs 1, 2, 3 actually exist
            SELECT EXISTS(SELECT 1 FROM users WHERE id = 1) INTO user1_exists;
            SELECT EXISTS(SELECT 1 FROM users WHERE id = 2) INTO user2_exists;
            SELECT EXISTS(SELECT 1 FROM users WHERE id = 3) INTO user3_exists;
            
            -- Only insert sample data if the specific users exist
            IF user1_exists AND user2_exists AND user3_exists THEN
                INSERT INTO matches (sender_id, receiver_id, status) VALUES 
                (1, 2, 'pending'),
                (3, 1, 'accepted'),
                (2, 3, 'rejected')
                ON CONFLICT (sender_id, receiver_id) DO NOTHING;
                
                INSERT INTO user_interactions (current_user_id, target_user_id, selected_user_id, action) VALUES 
                (1, 2, 2, 'selected'),
                (2, 3, 3, 'removed'),
                (3, 1, 1, 'accepted')
                ON CONFLICT DO NOTHING;
                
                RAISE NOTICE 'Sample data inserted successfully';
            ELSE
                RAISE NOTICE 'Sample data skipped - users with IDs 1, 2, 3 do not exist';
            END IF;
        ELSE
            RAISE NOTICE 'Sample data skipped - not enough users (need at least 3)';
        END IF;
    END IF;
END $$;

-- Sample subscription data (optional - remove if not needed)
DO $$
DECLARE
    user1_exists BOOLEAN := FALSE;
    user2_exists BOOLEAN := FALSE;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Check if users 1 and 2 exist
        SELECT EXISTS(SELECT 1 FROM users WHERE id = 1) INTO user1_exists;
        SELECT EXISTS(SELECT 1 FROM users WHERE id = 2) INTO user2_exists;
        
        IF user1_exists THEN
            INSERT INTO subscriptions (user_id, plan, status, end_date) VALUES 
            (1, 'premium', 'active', CURRENT_TIMESTAMP + INTERVAL '30 days')
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF user2_exists THEN
            INSERT INTO subscriptions (user_id, plan, status, end_date) VALUES 
            (2, 'free', 'active', NULL)
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF user1_exists OR user2_exists THEN
            RAISE NOTICE 'Sample subscription data inserted';
        ELSE
            RAISE NOTICE 'Sample subscription data skipped - users 1 and 2 do not exist';
        END IF;
    END IF;
END $$;

-- Update existing users to have free subscription if not set
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        UPDATE users SET subscription = 'free' WHERE subscription IS NULL;
    END IF;
END $$;

-- Verify tables were created successfully
DO $$
BEGIN
    RAISE NOTICE 'Tables created successfully:';
    RAISE NOTICE 'matches table: % records', (SELECT count(*) FROM matches);
    RAISE NOTICE 'user_interactions table: % records', (SELECT count(*) FROM user_interactions);
    RAISE NOTICE 'subscriptions table: % records', (SELECT count(*) FROM subscriptions);
END $$;
