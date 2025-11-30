use std::sync::LazyLock;

use argon2::{
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
    password_hash::{self, SaltString, rand_core::OsRng},
};

static RANDOM_PASSWORD_HASH: LazyLock<String> = LazyLock::new(|| {
    hash_password("dummy password")
        .expect("Failed to generate dummy password hash")
        .to_string()
});

static ARGON2: LazyLock<Argon2<'static>> = LazyLock::new(|| Argon2::default());

pub fn init() {
    LazyLock::force(&RANDOM_PASSWORD_HASH);
}

/// Constant-time password verification
pub fn verify_password(
    password: &str,
    password_hash: Option<&str>,
) -> Result<(), password_hash::Error> {
    let hash =
        PasswordHash::new(&password_hash.unwrap_or(&RANDOM_PASSWORD_HASH))?;
    ARGON2.verify_password(password.as_bytes(), &hash)
}

pub fn hash_password(password: &str) -> Result<String, password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    ARGON2
        .hash_password(password.as_bytes(), &salt)
        .map(|ph| ph.to_string())
}
