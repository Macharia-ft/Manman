
-- Complete Database Fix for Dating App
-- Run this SQL script in Supabase SQL Editor

-- First, clean up existing tables to avoid conflicts
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Create matches table for handling mutual matches only
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled'
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints for matches
ALTER TABLE matches ADD CONSTRAINT fk_match_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE matches ADD CONSTRAINT fk_match_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE;

-- Ensure no duplicate matches (regardless of order)
ALTER TABLE matches ADD CONSTRAINT unique_match_pair 
    CHECK (user1_id < user2_id);

-- Create user_interactions table for tracking all user actions
CREATE TABLE user_interactions (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'selected', 'removed', 'accepted', 'rejected', 'restored'
    section VARCHAR(20) DEFAULT 'all', -- 'all', 'selected', 'accepted', 'removed', 'you'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints for user_interactions
ALTER TABLE user_interactions ADD CONSTRAINT fk_interaction_current_user 
    FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_interactions ADD CONSTRAINT fk_interaction_target_user 
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Only allow one active interaction per user pair
CREATE UNIQUE INDEX idx_unique_active_interaction 
    ON user_interactions (current_user_id, target_user_id);

-- Create indexes for performance
CREATE INDEX idx_interactions_current_user ON user_interactions(current_user_id);
CREATE INDEX idx_interactions_target_user ON user_interactions(target_user_id);
CREATE INDEX idx_interactions_action ON user_interactions(action);
CREATE INDEX idx_interactions_section ON user_interactions(section);
CREATE INDEX idx_interactions_created_at ON user_interactions(created_at);

CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at);

-- Add subscription column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subscription') THEN
        ALTER TABLE users ADD COLUMN subscription VARCHAR(20) DEFAULT 'free';
    END IF;
END $$;

-- Create subscriptions table for premium tracking
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'premium',
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for subscriptions
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscription_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for subscription queries
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_subscriptions_start_date ON subscriptions(start_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_interactions_updated_at
    BEFORE UPDATE ON user_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create mutual match when both users accept each other
CREATE OR REPLACE FUNCTION create_mutual_match()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if the action is 'accepted'
    IF NEW.action = 'accepted' THEN
        -- Check if the target user has also accepted the current user
        IF EXISTS (
            SELECT 1 FROM user_interactions 
            WHERE current_user_id = NEW.target_user_id 
            AND target_user_id = NEW.current_user_id 
            AND action = 'accepted'
        ) THEN
            -- Create mutual match (ensure user1_id < user2_id for consistency)
            INSERT INTO matches (user1_id, user2_id, status)
            VALUES (
                LEAST(NEW.current_user_id, NEW.target_user_id),
                GREATEST(NEW.current_user_id, NEW.target_user_id),
                'active'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for automatic mutual match creation
CREATE TRIGGER trigger_create_mutual_match
    AFTER INSERT OR UPDATE ON user_interactions
    FOR EACH ROW
    EXECUTE FUNCTION create_mutual_match();

-- Function to clean up matches when interaction is cancelled
CREATE OR REPLACE FUNCTION cleanup_cancelled_match()
RETURNS TRIGGER AS $$
BEGIN
    -- If action changes from 'accepted' to something else, remove the match
    IF OLD.action = 'accepted' AND NEW.action != 'accepted' THEN
        DELETE FROM matches 
        WHERE (user1_id = LEAST(NEW.current_user_id, NEW.target_user_id) 
               AND user2_id = GREATEST(NEW.current_user_id, NEW.target_user_id))
        OR (user1_id = LEAST(NEW.target_user_id, NEW.current_user_id) 
            AND user2_id = GREATEST(NEW.target_user_id, NEW.current_user_id));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for match cleanup
CREATE TRIGGER trigger_cleanup_cancelled_match
    AFTER UPDATE ON user_interactions
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_cancelled_match();

-- Update existing users to have free subscription if not set
UPDATE users SET subscription = 'free' WHERE subscription IS NULL;

-- Create view for easier profile queries with interaction status
CREATE OR REPLACE VIEW user_profiles_with_interactions AS
SELECT 
    u.*,
    ui.action as current_user_action,
    ui.section as current_section,
    ui.updated_at as interaction_updated_at,
    -- Check if target user has selected current user
    EXISTS(
        SELECT 1 FROM user_interactions ui2 
        WHERE ui2.current_user_id = u.id 
        AND ui2.action = 'selected'
    ) as has_selected_current_user,
    -- Check if there's a mutual match
    EXISTS(
        SELECT 1 FROM matches m 
        WHERE (m.user1_id = u.id OR m.user2_id = u.id) 
        AND m.status = 'active'
    ) as has_mutual_match
FROM users u
LEFT JOIN user_interactions ui ON ui.target_user_id = u.id;

-- Grant necessary permissions
GRANT ALL ON user_interactions TO authenticated;
GRANT ALL ON matches TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON user_profiles_with_interactions TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;

-- Display success message
SELECT 'Database structure updated successfully!' as status;
