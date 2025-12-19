-- Drop online status columns from users
ALTER TABLE users DROP COLUMN last_seen;
ALTER TABLE users DROP COLUMN is_online;

-- Drop indexes
DROP INDEX IF EXISTS idx_friendships_status;
DROP INDEX IF EXISTS idx_friendships_to_user;
DROP INDEX IF EXISTS idx_friendships_from_user;

-- Drop friendships table
DROP TABLE IF EXISTS friendships;
