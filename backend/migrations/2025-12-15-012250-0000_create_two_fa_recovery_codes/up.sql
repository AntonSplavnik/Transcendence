CREATE TABLE two_fa_recovery_codes (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	code_hash BLOB UNIQUE NOT NULL,
	used_at DATETIME,
	created_at DATETIME NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_2fa_recovery_codes_user_id ON two_fa_recovery_codes(user_id);
CREATE INDEX idx_2fa_recovery_codes_code_hash ON two_fa_recovery_codes(code_hash);
