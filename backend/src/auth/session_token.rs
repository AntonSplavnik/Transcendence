use base64::engine::general_purpose::URL_SAFE_NO_PAD as base64url;
use base64::prelude::*;
use diesel::{
    deserialize::{FromSql, FromSqlRow},
    expression::AsExpression,
    serialize::ToSql,
    sql_types::Binary,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(try_from = "String", into = "String")]
pub struct SessionToken([u8; 32]);

impl SessionToken {
    pub fn generate() -> Self {
        SessionToken(rand::random())
    }

    pub fn to_hash(&self) -> SessionTokenHash {
        SessionTokenHash::from(*self)
    }
}

impl Default for SessionToken {
    fn default() -> Self {
        SessionToken::generate()
    }
}

impl TryFrom<&str> for SessionToken {
    fn try_from(s: &str) -> Result<Self, Self::Error> {
        let mut output = [0u8; 32];
        base64url.decode_slice(s.as_bytes(), &mut output)?;
        Ok(SessionToken(output))
    }

    type Error = base64::DecodeSliceError;
}

impl TryFrom<String> for SessionToken {
    fn try_from(s: String) -> Result<Self, Self::Error> {
        let mut output = [0u8; 32];
        base64url.decode_slice(s.as_bytes(), &mut output)?;
        Ok(SessionToken(output))
    }

    type Error = base64::DecodeSliceError;
}

impl From<SessionToken> for String {
    fn from(token: SessionToken) -> Self {
        base64url.encode(token.0)
    }
}

#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    Hash,
    Deserialize,
    Serialize,
    FromSqlRow,
    AsExpression,
)]
#[serde(try_from = "String", into = "String")]
#[diesel(sql_type = Binary)]
pub struct SessionTokenHash([u8; 32]);

impl<DB> ToSql<Binary, DB> for SessionTokenHash
where
    DB: diesel::backend::Backend,
    [u8; 32]: ToSql<Binary, DB>,
{
    fn to_sql<'b>(
        &'b self,
        out: &mut diesel::serialize::Output<'b, '_, DB>,
    ) -> diesel::serialize::Result {
        self.0.to_sql(out)
    }
}

impl<DB> FromSql<Binary, DB> for SessionTokenHash
where
    DB: diesel::backend::Backend,
    Vec<u8>: FromSql<Binary, DB>,
{
    fn from_sql(bytes: DB::RawValue<'_>) -> diesel::deserialize::Result<Self> {
        let hash = <Vec<u8>>::from_sql(bytes)?;
        Ok(SessionTokenHash(hash.try_into().unwrap()))
    }
}

impl SessionTokenHash {
    pub fn to_truncated(&self) -> SessionTokenHashTruncated {
        SessionTokenHashTruncated::from(*self)
    }
}

impl From<SessionToken> for SessionTokenHash {
    fn from(value: SessionToken) -> Self {
        Self(blake3::hash(&value.0).into())
    }
}

impl TryFrom<String> for SessionTokenHash {
    fn try_from(s: String) -> Result<Self, Self::Error> {
        let mut output = [0u8; 32];
        base64url.decode_slice(s.as_bytes(), &mut output)?;
        Ok(Self(output))
    }

    type Error = base64::DecodeSliceError;
}

impl From<SessionTokenHash> for String {
    fn from(token: SessionTokenHash) -> Self {
        base64url.encode(&token.0)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(try_from = "String", into = "String")]
pub struct SessionTokenHashTruncated([u8; 16]);

impl From<SessionTokenHash> for SessionTokenHashTruncated {
    fn from(hash: SessionTokenHash) -> Self {
        let mut truncated = [0u8; 16];
        truncated.copy_from_slice(&hash.0[..16]);
        SessionTokenHashTruncated(truncated)
    }
}

impl From<SessionTokenHashTruncated> for String {
    fn from(truncated: SessionTokenHashTruncated) -> Self {
        base64url.encode(&truncated.0)
    }
}

impl TryFrom<String> for SessionTokenHashTruncated {
    fn try_from(s: String) -> Result<Self, Self::Error> {
        let mut output = [0u8; 16];
        base64url.decode_slice(s.as_bytes(), &mut output)?;
        Ok(SessionTokenHashTruncated(output))
    }

    type Error = base64::DecodeSliceError;
}

// implement comparison between SessionTokenHash and SessionTokenHashTruncated where only the first 16 bytes are compared
impl PartialEq<SessionTokenHashTruncated> for SessionTokenHash {
    fn eq(&self, other: &SessionTokenHashTruncated) -> bool {
        &self.0[..16] == &other.0[..]
    }
}

impl PartialEq<SessionTokenHash> for SessionTokenHashTruncated {
    fn eq(&self, other: &SessionTokenHash) -> bool {
        &self.0[..] == &other.0[..16]
    }
}
