import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DATABASE_URL || join(__dirname, '../../data/transcendence.db');

export function initDatabase() {
  const db = new Database(DB_PATH);

  // Tournaments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'waiting',
      max_players INTEGER DEFAULT 8,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME
    )
  `);

  // Tournament participants
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player_alias TEXT NOT NULL,
      user_id INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    )
  `);

  // Matches (games within tournaments)
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player1_alias TEXT NOT NULL,
      player2_alias TEXT NOT NULL,
      player1_score INTEGER DEFAULT 0,
      player2_score INTEGER DEFAULT 0,
      winner_alias TEXT,
      status TEXT DEFAULT 'pending',
      round INTEGER,
      started_at DATETIME,
      finished_at DATETIME,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    )
  `);

  // Game history (all games, including practice)
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER,
      player1_alias TEXT NOT NULL,
      player2_alias TEXT NOT NULL,
      player1_score INTEGER NOT NULL,
      player2_score INTEGER NOT NULL,
      winner_alias TEXT,
      duration_seconds INTEGER,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id)
    )
  `);

  console.log('✅ Game database initialized');
  return db;
}

export function getDatabase() {
  return new Database(DB_PATH);
}
