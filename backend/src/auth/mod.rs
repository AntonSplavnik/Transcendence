use std::sync::LazyLock;

use serde::{Deserialize, Serialize};

pub mod session_token;

static JWT_SECRET: LazyLock<[u8; 32]> = LazyLock::new(rand::random);

static JWT_ENCODING_KEY: LazyLock<jsonwebtoken::EncodingKey> =
    LazyLock::new(|| {
        jsonwebtoken::EncodingKey::from_secret(JWT_SECRET.as_slice())
    });

static JWT_DECODING_KEY: LazyLock<jsonwebtoken::DecodingKey> =
    LazyLock::new(|| {
        jsonwebtoken::DecodingKey::from_secret(JWT_SECRET.as_slice())
    });

static JWT_VALIDATION: LazyLock<jsonwebtoken::Validation> =
    LazyLock::new(|| jsonwebtoken::Validation::default());

pub fn jwt_encoding_key() -> &'static jsonwebtoken::EncodingKey {
    &JWT_ENCODING_KEY
}

pub fn jwt_decoding_key() -> &'static jsonwebtoken::DecodingKey {
    &JWT_DECODING_KEY
}

pub fn jwt_validation() -> &'static jsonwebtoken::Validation {
    &JWT_VALIDATION
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: i32,
    pub sid: i32,
    pub jti: session_token::SessionTokenHashTruncated,
    pub exp: usize,
    pub iat: usize,
}
