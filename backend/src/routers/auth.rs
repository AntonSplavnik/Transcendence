use std::time::Duration;

use cookie::Cookie;
use diesel::prelude::*;
use salvo::oapi::ToSchema;
use salvo::oapi::{endpoint, extract::JsonBody};
use salvo::prelude::*;
use serde::Deserialize;
use validator::Validate;

use crate::auth::session_token::SessionToken;
use crate::hoops::auth::{DepotSessionExt, session_hoop};
use crate::models::{NewSession, NewUser, Session};
use crate::{ApiError, AppResult, EmptyResult, db, empty_ok};

// Session expiry which is renewed on session refresh
const SESSION_EXPIRY: Duration = Duration::from_hours(7 * 24);
// Session expiry which is enforced regardless of refreshes
const SESSION_FORCED_EXPIRY: Duration = Duration::from_hours(30 * 24);

const ACCESS_EXPIRY: Duration = Duration::from_mins(15);

pub(super) fn router() -> Router {
    Router::new()
        .append(&mut vec![
            Router::with_path("register").post(register),
            Router::with_path("login").post(login),
            Router::with_path("logout").hoop(session_hoop).post(logout),
        ])
        .oapi_tag("auth")
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct RegisterInput {
    #[validate(email(message = "Must be a valid email address."))]
    pub email: String,
    #[validate(custom(function = "crate::validate::nickname"))]
    pub nickname: String,
    #[validate(custom(function = "crate::validate::password"))]
    pub password: String,
}

impl TryFrom<RegisterInput> for NewUser {
    type Error = argon2::password_hash::Error;

    fn try_from(value: RegisterInput) -> Result<Self, Self::Error> {
        Ok(NewUser {
            email: value.email,
            nickname: value.nickname,
            password_hash: util::hash_password(&value.password)?,
            created_at: chrono::Utc::now().naive_utc(),
        })
    }
}

/// Register a new User and create a new Session
#[endpoint]
pub fn register(
    json: JsonBody<RegisterInput>,
    res: &mut Response,
) -> EmptyResult {
    use crate::schema::users::dsl::*;
    let user = json.into_inner();
    user.validate()?;
    let user = NewUser::try_from(user)?;
    diesel::insert_into(users)
        .values(&user)
        .execute(&mut db::get()?)?;
    res.status_code(StatusCode::CREATED);
    empty_ok()
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
struct CredentialsInput {
    #[validate(email(message = "Must be a valid email address."))]
    email: String,
    #[validate(custom(function = "crate::validate::password"))]
    password: String,
}

/// Login a User and create a new Session
#[endpoint]
pub fn login(
    json: JsonBody<CredentialsInput>,
    req: &mut Request,
    res: &mut Response,
) -> AppResult<()> {
    use crate::schema::sessions::dsl::*;
    let credentials = json.into_inner();
    credentials.validate()?;
    let user = util::verify_password_get_user(&credentials)?;

    let token = SessionToken::generate();
    let hashed_token = token.to_hash();
    let (device, ip) = util::get_device_and_ip(req);
    let new_session =
        NewSession::new(user.id, hashed_token, SESSION_EXPIRY, device, ip);
    // TODO cleanup old sessions that are over the user session limit
    // TODO regularly cleanup expired sessions
    let session = diesel::insert_into(sessions)
        .values(&new_session)
        .get_result(&mut db::get()?)?;
    // return cookie with session token
    res.add_cookie(util::session_cookie(&token));
    let jwt = util::jwt_create(&session, hashed_token.to_truncated())?;
    res.add_cookie(util::jwt_cookie(jwt));
    Ok(())
}

#[endpoint(
    summary = "Logout a user",
    security(("session" = []))
)]
pub fn logout(depot: &mut Depot) -> EmptyResult {
    use crate::schema::sessions::dsl::*;
    let session = depot.get_session().expect("Session Hoop");
    diesel::delete(sessions.filter(id.eq(session.id)))
        .execute(&mut db::get()?)?;
    empty_ok()
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
struct ChangePasswordInput {
    #[validate(nested)]
    #[serde(flatten)]
    login: CredentialsInput,
    #[validate(custom(function = "crate::validate::password"))]
    new_password: String,
}

#[endpoint(
    summary = "Change user password",
    security(("session" = []))
)]
pub fn change_pw(json: JsonBody<ChangePasswordInput>) -> EmptyResult {
    todo!()
}

mod util {
    use crate::{
        AppResult,
        auth::{
            JwtClaims, jwt_encoding_key,
            session_token::{SessionToken, SessionTokenHashTruncated},
        },
        db,
        models::{Session, User},
        routers::auth::{ACCESS_EXPIRY, SESSION_EXPIRY},
    };
    use argon2::{
        Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
        password_hash::{self, SaltString, rand_core::OsRng},
    };
    use cookie::Cookie;
    use diesel::prelude::*;
    use salvo::Request;
    use serde::{Deserialize, Serialize};
    use std::{borrow::Cow, sync::LazyLock};

    /*
    {
      "sub": 123,        // user_id
      "sid": 456,        // session_id
      "jti": "abc123...", // JWT ID: truncated refresh token hash (16 bytes, base64url)
      "exp": 1732723200,
      "iat": 1732722300
    }
    */

    pub fn session_cookie(token: &SessionToken) -> Cookie<'static> {
        Cookie::build(Cookie::new("session_token", String::from(*token)))
            .path("/api/auth/")
            .http_only(true)
            .secure(true)
            .same_site(cookie::SameSite::Lax)
            .max_age(cookie::time::Duration::seconds(
                SESSION_EXPIRY.as_secs() as i64
            ))
            .build()
    }

    pub fn jwt_cookie(token: impl Into<Cow<'static, str>>) -> Cookie<'static> {
        Cookie::build(Cookie::new("access_token", token))
            .path("/api/")
            .http_only(true)
            .secure(true)
            .same_site(cookie::SameSite::Lax)
            .max_age(cookie::time::Duration::seconds(
                ACCESS_EXPIRY.as_secs() as i64
            ))
            .build()
    }

    pub fn jwt_create(
        session: &Session,
        jti: SessionTokenHashTruncated,
    ) -> AppResult<String> {
        let now = chrono::Utc::now();
        let claim = JwtClaims {
            sub: session.user_id,
            sid: session.id,
            jti,
            exp: (now + super::ACCESS_EXPIRY).timestamp() as usize,
            iat: now.timestamp() as usize,
        };
        Ok(jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claim,
            jwt_encoding_key(),
        )?)
    }

    pub fn verify_password_get_user(
        credentials: &super::CredentialsInput,
    ) -> AppResult<User> {
        use crate::schema::users::dsl::*;
        // constant time lookup and verification to prevent timing attacks
        // TODO (not planned yet) /register is not protected against timing attacks, because we dont have email-sending infrastructure
        let user = users
            .filter(email.eq(&credentials.email))
            .first::<crate::models::User>(&mut db::get()?);
        verify_password(
            &credentials.password,
            user.as_ref().ok().map(|user| user.password_hash.as_str()),
        )?;
        let user = user
            .expect("User must exist after successful password verification");
        Ok(user)
    }

    pub fn get_device_and_ip(
        req: &Request,
    ) -> (Option<String>, Option<String>) {
        let device = req
            .header::<&str>("User-Agent")
            .map(|ua| {
                woothee::parser::Parser::new().parse(ua).map(|info| {
                    format!("{} on {} ({})", info.name, info.os, info.category)
                })
            })
            .flatten();
        let ip = req
            .remote_addr()
            .to_owned()
            .into_std()
            .map(|addr| addr.ip().to_string());
        (device, ip)
    }

    static RANDOM_PASSWORD_HASH: LazyLock<String> = LazyLock::new(|| {
        hash_password("dummy password")
            .expect("Failed to generate dummy password hash")
            .to_string()
    });

    static ARGON2: LazyLock<Argon2<'static>> =
        LazyLock::new(|| Argon2::default());

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

    pub fn hash_password(
        password: &str,
    ) -> Result<String, password_hash::Error> {
        let salt = SaltString::generate(&mut OsRng);
        ARGON2
            .hash_password(password.as_bytes(), &salt)
            .map(|ph| ph.to_string())
    }
}
