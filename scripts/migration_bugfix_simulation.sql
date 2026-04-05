-- Migration: Fix bugs found by 30-agent simulation (2026-04-04)
-- ROOT-A: UNIQUE constraint on max_user_id
-- ROOT-C: Atomic increment functions for water + messages

-- 1. Clean up duplicate records (keep newest)
DELETE FROM nutri_users a
USING nutri_users b
WHERE a.max_user_id = b.max_user_id
  AND a.created_at < b.created_at;

-- 2. Add UNIQUE constraint
ALTER TABLE nutri_users
  ADD CONSTRAINT unique_max_user_id UNIQUE (max_user_id);

-- 3. Atomic water increment
CREATE OR REPLACE FUNCTION increment_water(user_uuid UUID)
RETURNS integer
LANGUAGE sql
AS $$
  UPDATE nutri_users
  SET water_glasses = water_glasses + 1, updated_at = NOW()
  WHERE id = user_uuid
  RETURNING water_glasses;
$$;

-- 4. Generic field increment (for messages_today, photos_today)
CREATE OR REPLACE FUNCTION increment_field(user_uuid UUID, field_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'UPDATE nutri_users SET %I = %I + 1, updated_at = NOW() WHERE id = $1',
    field_name, field_name
  ) USING user_uuid;
END;
$$;

-- 5. Clean up simulation test users (IDs 990000001-990000030)
DELETE FROM nutri_food_logs WHERE user_id IN (
  SELECT id FROM nutri_users WHERE max_user_id BETWEEN 990000001 AND 990000030
);
DELETE FROM nutri_messages WHERE user_id IN (
  SELECT id FROM nutri_users WHERE max_user_id BETWEEN 990000001 AND 990000030
);
DELETE FROM nutri_error_log WHERE context::text LIKE '%990000%';
DELETE FROM nutri_users WHERE max_user_id BETWEEN 990000001 AND 990000030;
