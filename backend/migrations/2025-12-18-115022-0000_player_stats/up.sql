-- Create user_stats table to track player statistics
CREATE TABLE user_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL UNIQUE,
    games_played INTEGER NOT NULL DEFAULT 0,
    total_kills INTEGER NOT NULL DEFAULT 0,
    total_time_played INTEGER NOT NULL DEFAULT 0,
    last_game_kills INTEGER NOT NULL DEFAULT 0,
    last_game_time INTEGER NOT NULL DEFAULT 0,
    last_game_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Create game_history table to store all games played
CREATE TABLE game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    user_id INTEGER NOT NULL,
    kills INTEGER NOT NULL DEFAULT 0,
    time_played INTEGER NOT NULL DEFAULT 0,
    played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_history_user_id ON game_history(user_id);
CREATE INDEX idx_game_history_played_at ON game_history(played_at DESC);
