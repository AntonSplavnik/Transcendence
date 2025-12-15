CREATE TABLE users (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	email TEXT UNIQUE NOT NULL COLLATE NOCASE,
	nickname TEXT UNIQUE NOT NULL COLLATE NOCASE,
	totp_enabled BOOLEAN NOT NULL,
	totp_secret_enc TEXT,
	totp_confirmed_at DATETIME,
	password_hash TEXT NOT NULL,
	created_at DATETIME NOT NULL
);
CREATE INDEX idx_users_email ON users(email COLLATE NOCASE);
CREATE INDEX idx_users_nickname ON users(nickname COLLATE NOCASE);
