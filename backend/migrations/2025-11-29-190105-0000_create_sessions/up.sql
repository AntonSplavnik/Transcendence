CREATE TABLE sessions (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	token_hash TEXT UNIQUE NOT NULL,
	previous_token_hash TEXT UNIQUE,
	device_name TEXT,
	ip_address TEXT,
	created_at DATETIME NOT NULL,
	expires_at DATETIME NOT NULL,
	last_used_at DATETIME NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_previous_token_hash ON sessions(previous_token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
