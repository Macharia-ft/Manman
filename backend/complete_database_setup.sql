
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
-- Only insert if we have at least 3 users in the system
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF (SELECT COUNT(*) FROM users) >= 3 THEN
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
        END IF;
    END IF;
END $$;

-- Sample subscription data (optional - remove if not needed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF (SELECT COUNT(*) FROM users) >= 2 THEN
            INSERT INTO subscriptions (user_id, plan, status, end_date) VALUES 
            (1, 'premium', 'active', CURRENT_TIMESTAMP + INTERVAL '30 days'),
            (2, 'free', 'active', NULL)
            ON CONFLICT DO NOTHING;
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
