CREATE TABLE sessions (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	token_hash BLOB UNIQUE NOT NULL,
	device_id TEXT NOT NULL,
	device_name TEXT,
	ip_address TEXT,
	created_at DATETIME NOT NULL,
	refreshed_at DATETIME NOT NULL,
	last_used_at DATETIME NOT NULL,
	last_authenticated_at DATETIME NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_refreshed_at ON sessions(refreshed_at);
CREATE INDEX idx_sessions_last_authenticated_at ON sessions(last_authenticated_at);
