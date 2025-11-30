CREATE TABLE users (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	email TEXT UNIQUE NOT NULL,
	nickname TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	created_at DATETIME NOT NULL
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
