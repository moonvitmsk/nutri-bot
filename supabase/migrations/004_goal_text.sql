-- Add goal_text column for custom user goals
ALTER TABLE nutri_users ADD COLUMN IF NOT EXISTS goal_text TEXT;

-- Update goal type to accept new values
COMMENT ON COLUMN nutri_users.goal IS 'lose | maintain | gain | healthy | sport | custom';
COMMENT ON COLUMN nutri_users.goal_text IS 'Free-text goal when goal=custom';
