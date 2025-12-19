-- Create friendships table for managing friend relationships between users
CREATE TABLE friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Ensure no duplicate friendship requests between same users
    UNIQUE(from_user_id, to_user_id),
    -- Prevent self-friendship
    CHECK(from_user_id != to_user_id)
);

-- Index for fast lookup of friendships by user
CREATE INDEX idx_friendships_from_user ON friendships(from_user_id);
CREATE INDEX idx_friendships_to_user ON friendships(to_user_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Add online status fields to users table
ALTER TABLE users ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_seen TIMESTAMP;
