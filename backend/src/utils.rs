use std::sync::LazyLock;

use argon2::{
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
    password_hash::{self, SaltString, rand_core::OsRng},
};
use validator::ValidationError;

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
    let res = ARGON2.verify_password(password.as_bytes(), &hash);
    match password_hash {
        Some(_) => res,
        None => Err(password_hash::Error::Password), // when no hash (user does not exist), always return Error::Password
    }
}

pub fn hash_password(password: &str) -> Result<String, password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    ARGON2
        .hash_password(password.as_bytes(), &salt)
        .map(|ph| ph.to_string())
}

pub fn validate_nickname(nickname: &str) -> Result<(), ValidationError> {
    let len = nickname.len();

    let mut err = if nickname.trim() != nickname {
        ValidationError::new("trim").with_message(
            "Must not have leading or trailing whitespace.".into(),
        )
    } else if len < 3 || len > 16 {
        ValidationError::new("length")
            .with_message("Must be between 3 and 16 characters long.".into())
    } else if nickname.split_whitespace().count() != 1 {
        ValidationError::new("whitespace")
            .with_message("Must not contain whitespace.".into())
    } else if !nickname
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        ValidationError::new("invalid_chars").with_message(
            "Can only contain alphanumeric characters, underscores, or hyphens.".into(),
        )
    } else {
        return Ok(());
    };
    Err(err)
}
