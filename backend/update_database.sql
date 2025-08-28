
-- Update database structure for proper user interaction handling

-- First, let's make sure the user_interactions table has the right structure
DROP TABLE IF EXISTS user_interactions CASCADE;

CREATE TABLE user_interactions (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'selected', 'removed', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add foreign key constraints
    CONSTRAINT fk_current_user FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Allow multiple interactions but track them by timestamp
    CONSTRAINT unique_interaction UNIQUE (current_user_id, target_user_id, action)
);

-- Update the matches table to have better tracking
ALTER TABLE matches DROP CONSTRAINT IF EXISTS unique_match;
ALTER TABLE matches ADD CONSTRAINT unique_match UNIQUE (sender_id, receiver_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interactions_current_user ON user_interactions(current_user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_target_user ON user_interactions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_action ON user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON user_interactions(created_at);

-- Update matches table indexes
CREATE INDEX IF NOT EXISTS idx_matches_sender ON matches(sender_id);
CREATE INDEX IF NOT EXISTS idx_matches_receiver ON matches(receiver_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_interactions_updated_at ON user_interactions;
CREATE TRIGGER update_interactions_updated_at
    BEFORE UPDATE ON user_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Clean up any inconsistent data
DELETE FROM user_interactions WHERE current_user_id = target_user_id;

-- Update subscriptions table to ensure proper premium handling
ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'active';
UPDATE subscriptions SET status = 'active' WHERE status IS NULL;

-- Add index for subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date);

COMMIT;
