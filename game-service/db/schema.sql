-- SQLite database

-- Table des matchs
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  winner_name TEXT NOT NULL,
  duration_seconds INTEGER,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour rechercher par joueur
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_name);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_name);
CREATE INDEX IF NOT EXISTS idx_matches_played_at ON matches(played_at);
