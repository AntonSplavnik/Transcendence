# Plan: JWT Authentication Backend with Cookie-Based Tokens

A comprehensive JWT authentication system using HttpOnly cookies, refresh token rotation with theft detection, and per-device session management for a Salvo/SQLite backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Design Decisions & Rationale](#design-decisions--rationale)
3. [Data Model](#data-model)
4. [Token Configuration](#token-configuration)
5. [API Endpoints](#api-endpoints)
6. [Authentication Flows](#authentication-flows)
7. [Theft Detection System](#theft-detection-system)
8. [Security Considerations](#security-considerations)

---

## Overview

This authentication system provides:

- **Stateless-ish JWT access tokens**: Validated via signature, but verified against DB for immediate revocation capability
- **Rotating refresh tokens**: Single-use tokens that rotate on each refresh, with previous-token tracking for theft detection
- **Per-device session management**: Users can view and revoke individual sessions
- **HttpOnly cookie storage**: Protection against XSS attacks
- **Theft detection**: Automatic detection when a refresh token is used from multiple locations

**Technology Stack:**

- Backend: Rust with Salvo framework
- Database: SQLite with Diesel ORM
- Password hashing: Argon2 (already implemented in `utils.rs`)
- JWT: `jsonwebtoken` crate with `rust_crypto` feature

---

## Design Decisions & Rationale

### 1. Cookie-Based Token Storage

**Decision**: Store both access and refresh tokens in HttpOnly cookies.

**Rationale**:

- `HttpOnly` flag prevents JavaScript access, eliminating XSS token theft
- `Secure` flag ensures tokens only sent over HTTPS
- `SameSite=Lax` for both tokens prevents CSRF attacks while allowing normal navigation
- Browser automatically handles token transmission—simpler client code
- Shared cookie state across tabs eliminates most race conditions

**Development Environment**: We maintain strict cookie security (`Secure`, `SameSite`, `HttpOnly`) even in development. We assume the development environment is configured (e.g., via local HTTPS) to support these standards without relaxation.

**Alternative considered**: LocalStorage + Authorization header. Rejected due to XSS vulnerability.

### 2. Access Token Validated Against Database (with Token Hash Binding)

**Decision**: Each protected request verifies the session exists in the database AND that the current refresh token hash matches.

**Rationale**:

- Enables immediate session revocation (logout takes effect instantly)
- **Immediate access token invalidation**: When a refresh token rotates, the old access token becomes invalid because the stored `token_hash` no longer matches the `tkh` claim in the JWT
- Single indexed lookup by session ID is fast (~0.01-0.05ms on SQLite)
- Trade-off: Slight latency increase vs. full statelessness
- Benefit outweighs cost for security-sensitive applications

**Implementation**: The access token JWT includes a `jti` (JWT ID) claim containing a truncated hash of the refresh token. During validation, this is compared against the current `token_hash` in the database. If they don't match (because the refresh token was rotated), the access token is rejected.

**Alternative considered**: Fully stateless JWT validation. Rejected because revoked sessions would remain valid until token expiry (up to 15 minutes).

**Note**: With this design, `sid` (session_id) alone is sufficient for the database lookup; however, keeping both `sub` (user_id) and `sid` in the JWT allows for additional validation and is useful for logging/debugging. The `jti` claim serves double duty as both a standard JWT identifier and our token-binding mechanism.

### 3. JWT `iat` Validation with Clock Skew Leeway

**Decision**: Allow a small leeway (60 seconds) when validating the `iat` (issued-at) claim.

**Rationale**:

- Clock skew between servers or client/server can cause valid tokens to be incorrectly rejected
- A 60-second leeway is small enough to not significantly impact security
- Prevents spurious authentication failures in distributed environments

**Implementation**:

```rust
const IAT_LEEWAY_SECONDS: i64 = 60;

// Reject tokens issued in the future (with leeway for clock skew)
if claims.iat > now + IAT_LEEWAY_SECONDS {
    return Err(AuthError::InvalidToken);
}

// Reject tokens issued before the session was created (replay attack prevention)
// Note: session.created_at is fetched during DB validation step
if claims.iat < session.created_at {
    return Err(AuthError::InvalidToken);
}
```

### 4. Refresh Token Rotation with Previous Token Tracking

**Decision**: Each refresh invalidates the current token and issues a new one. The previous token hash is retained for theft detection and grace logout.

**Rationale**:

- Limits exposure window if token is stolen
- Enables theft detection: if previous token is used, someone else used the current one
- Previous token allows logout even after rotation (handles legitimate edge cases)
- Single `previous_token_hash` field is simpler than a separate table or timestamp-based grace periods

**Note on Access Token Invalidation**: When the refresh token rotates, the old access token is immediately invalidated because the `jti` (JWT ID / token hash) claim in the JWT no longer matches the new `token_hash` in the database. This provides immediate revocation without requiring a token blacklist.

**Alternative considered**:

- No rotation (token reused until expiry): Rejected—stolen token valid for entire lifetime
- Timestamp-based grace period: Rejected—requires cleanup job, more complex queries

### 5. Hybrid Session Expiry (Rolling + Absolute Maximum)

**Decision**: Sessions have a 7-day rolling expiry that extends on each refresh, with an absolute maximum lifetime of 30 days.

**Rationale**:

- Rolling expiry: Active users never unexpectedly logged out
- Absolute maximum: Limits long-term session hijacking risk
- Balance between UX (don't annoy active users) and security (force periodic re-authentication)

**Alternative considered**:

- Fixed expiry only: Poor UX—active users forced to re-login
- Rolling only: Sessions could theoretically last forever

### 6. Refresh Token for Auth Operations

**Decision**: Logout and password change operations use refresh token authentication, not access token.

**Rationale**:

- Logout works even if access token is expired
- Previous refresh token can be used for logout (useful after theft detection)
- Simplifies endpoint grouping under `/api/auth` path

### 7. Integer Autoincrement IDs

**Decision**: Use `INTEGER PRIMARY KEY AUTOINCREMENT` instead of ULIDs.

**Rationale**:

- Simpler for single-database SQLite setup
- More efficient storage and indexing
- No need for distributed ID generation
- Session ID in JWT is opaque to client anyway

**Alternative considered**: ULIDs. Would be appropriate for distributed systems or if IDs need to be non-sequential.

### 8. No Email-Based Password Reset

**Decision**: Password reset requires current password while logged in. No email recovery flow.

**Rationale**:

- Project scope doesn't include email infrastructure
- Simpler implementation
- If user forgets password, admin reset is the recovery path

**Trade-off**: Users who forget password cannot self-recover.

### 9. Session Limit Per User

**Decision**: Limit each user to a maximum of 10 concurrent sessions.

**Rationale**:

- Prevents resource exhaustion from malicious session creation
- Encourages users to manage their sessions
- 10 sessions is generous for legitimate use (phone, tablet, laptop, work computer, etc.)
- When limit is reached, oldest session (by `last_used_at`) is automatically revoked

**Alternative considered**: Hard rejection when limit reached. Rejected—poor UX if user can't log in on a new device.

### 10. Email Normalization

**Decision**: Normalize email addresses before storage and lookup.

**Rationale**:

- Prevents duplicate accounts with case variations (e.g., `User@Example.com` vs `user@example.com`)
- Ensures consistent matching during login
- Reduces user confusion

**Implementation**:

- Convert to lowercase
- Trim leading/trailing whitespace
- Apply normalization at registration and login before any database operations

```rust
fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}
```

### 11. Constant-Time Password Verification

**Decision**: Always perform password verification, even when user is not found.

**Rationale**:

- Prevents timing attacks that could reveal whether an email exists in the system
- Attacker cannot distinguish "user not found" from "wrong password" based on response time
- Use a pre-computed dummy hash when user is not found to ensure consistent timing

**Implementation**:

```rust
// Pre-compute once at startup
const DUMMY_HASH: &str = "$argon2id$v=19$m=19456,t=2,p=1$..."; // Valid Argon2 hash

// In login handler
let hash = user.as_ref().map(|u| &u.password_hash).unwrap_or(&DUMMY_HASH);
let password_valid = argon2_verify(hash, &password);

if user.is_none() || !password_valid {
    return Err(AuthError::InvalidCredentials);
}
```

### 12. Database Transaction for Refresh Token Rotation

**Decision**: Use database transaction with row-level locking for refresh token rotation.

**Rationale**:

- Prevents race conditions when parallel requests use the same refresh token
- Ensures atomic read-modify-write operation
- First request succeeds, subsequent parallel requests fail gracefully

**Implementation**:

```sql
BEGIN IMMEDIATE;  -- Acquire write lock immediately
SELECT * FROM refresh_tokens WHERE token_hash = ? FOR UPDATE;
-- Validate session, generate new token
UPDATE refresh_tokens SET token_hash = ?, previous_token_hash = ?, ...;
COMMIT;
```

Note: SQLite doesn't support `FOR UPDATE`, but `BEGIN IMMEDIATE` provides equivalent protection by acquiring a reserved lock at transaction start.

---

## Data Model

### Database Schema (SQLite)

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL  -- Unix timestamp (UTC)
);

CREATE INDEX idx_users_email ON users(email);

-- Refresh tokens table (sessions)
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    previous_token_hash TEXT UNIQUE,
    device_name TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL,   -- Session start (UTC)
    expires_at INTEGER NOT NULL,   -- Rolling expiry (UTC)
    last_used_at INTEGER NOT NULL, -- Last refresh (UTC)

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_previous_token_hash ON refresh_tokens(previous_token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

### Rust Models

```rust
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

// ============ Database Models ============

#[derive(Queryable, Selectable, Identifiable, Debug)]
#[diesel(table_name = users)]
pub struct User {
    pub id: i64,
    pub email: String,
    pub password_hash: String,
    pub created_at: i64,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = users)]
pub struct NewUser<'a> {
    pub email: &'a str,
    pub password_hash: &'a str,
    pub created_at: i64,
}

#[derive(Queryable, Selectable, Identifiable, Associations, Debug)]
#[diesel(table_name = refresh_tokens)]
#[diesel(belongs_to(User))]
pub struct RefreshToken {
    pub id: i64,
    pub user_id: i64,
    pub token_hash: String,
    pub previous_token_hash: Option<String>,
    pub device_name: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: i64,
    pub expires_at: i64,
    pub last_used_at: i64,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = refresh_tokens)]
pub struct NewRefreshToken<'a> {
    pub user_id: i64,
    pub token_hash: &'a str,
    pub previous_token_hash: Option<&'a str>,
    pub device_name: Option<&'a str>,
    pub ip_address: Option<&'a str>,
    pub created_at: i64,
    pub expires_at: i64,
    pub last_used_at: i64,
}

// ============ JWT Claims ============

#[derive(Debug, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: i64,  // user_id
    pub sid: i64,  // session_id (refresh_tokens.id)
    pub jti: String, // JWT ID: truncated hash of current refresh token (first 16 bytes of SHA256, base64url)
    pub exp: i64,  // expiry timestamp
    pub iat: i64,  // issued at timestamp
}

// ============ API Types ============

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    #[validate(length(min = 8, max = 128))]
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct SessionInfo {
    pub id: i64,
    pub device_name: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: i64,
    pub last_used_at: i64,
    pub is_current: bool,
}

#[derive(Debug, Serialize)]
pub struct SessionsResponse {
    pub sessions: Vec<SessionInfo>,
}

// ============ Error Types ============

#[derive(Debug, Serialize)]
#[serde(tag = "error", content = "message")]
pub enum AuthError {
    InvalidCredentials,
    EmailAlreadyExists,
    SessionExpired,
    PossibleTheft,  // Previous token used - possible theft detected
    InvalidSession,
    InvalidPassword,
    InvalidToken,   // JWT iat is in the future (clock skew attack)
}
```

### Diesel Schema

```rust
// src/schema.rs (generated by Diesel)

diesel::table! {
    users (id) {
        id -> BigInt,
        email -> Text,
        password_hash -> Text,
        created_at -> BigInt,
    }
}

diesel::table! {
    refresh_tokens (id) {
        id -> BigInt,
        user_id -> BigInt,
        token_hash -> Text,
        previous_token_hash -> Nullable<Text>,
        device_name -> Nullable<Text>,
        ip_address -> Nullable<Text>,
        created_at -> BigInt,
        expires_at -> BigInt,
        last_used_at -> BigInt,
    }
}

diesel::joinable!(refresh_tokens -> users (user_id));
diesel::allow_tables_to_appear_in_same_query!(users, refresh_tokens);
```

---

## Token Configuration

### Access Token (JWT)

| Property | Value | Rationale |
|----------|-------|-----------|
| Format | JWT (JSON Web Token) | Industry standard, self-contained claims |
| Algorithm | HS256 | Symmetric, sufficient for single-server setup |
| Lifetime | 15 minutes | Short-lived limits exposure if leaked |
| Storage | HttpOnly cookie | XSS protection |
| Cookie Path | `/api` | Only sent to API endpoints, not static assets |
| Cookie Attributes | `HttpOnly; Secure; SameSite=Lax` | Balance security/UX |

**Claims:**

```json
{
  "sub": 123,        // user_id
  "sid": 456,        // session_id
  "jti": "abc123...", // JWT ID: truncated refresh token hash (16 bytes, base64url)
  "exp": 1732723200,
  "iat": 1732722300
}
```

### Refresh Token

| Property | Value | Rationale |
|----------|-------|-----------|
| Format | 32 random bytes, base64url encoded | Opaque, unpredictable |
| Storage (server) | SHA256 hash | Never store plaintext |
| Lifetime (rolling) | 7 days | Extended on each use |
| Lifetime (absolute) | 30 days | Maximum session duration |
| Storage (client) | HttpOnly cookie | XSS protection |
| Cookie Path | `/api/auth` | Only sent to auth endpoints |
| Cookie Attributes | `HttpOnly; Secure; SameSite=Lax` | CSRF protection with navigation support |

### Cookie Construction (Rust)

```rust
use salvo::http::cookie::{Cookie, SameSite};
use time::Duration;

const ACCESS_TOKEN_MAX_AGE: Duration = Duration::minutes(15);
const REFRESH_TOKEN_MAX_AGE: Duration = Duration::days(7);

pub fn access_token_cookie(token: &str) -> Cookie<'static> {
    Cookie::build(("access_token", token.to_owned()))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Lax)
        .path("/api")
        .max_age(ACCESS_TOKEN_MAX_AGE)
        .build()
}

pub fn refresh_token_cookie(token: &str) -> Cookie<'static> {
    Cookie::build(("refresh_token", token.to_owned()))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Lax)
        .path("/api/auth")
        .max_age(REFRESH_TOKEN_MAX_AGE)
        .build()
}

pub fn clear_access_token_cookie() -> Cookie<'static> {
    Cookie::build(("access_token", ""))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Lax)
        .path("/api")
        .max_age(Duration::ZERO)
        .build()
}

pub fn clear_refresh_token_cookie() -> Cookie<'static> {
    Cookie::build(("refresh_token", ""))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::Lax)
        .path("/api/auth")
        .max_age(Duration::ZERO)
        .build()
}
```

---

## API Endpoints

All endpoints under `/api/auth` use the refresh token cookie for authentication (where auth is required). The access token is only used for session validation on protected API routes outside of auth.

### Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/api/auth/register` | ❌ | Create account and auto-login |
| POST | `/api/auth/login` | ❌ | Authenticate and issue tokens |
| POST | `/api/auth/refresh` | 🍪 Refresh | Rotate tokens, get new access token |
| POST | `/api/auth/logout` | 🍪 Refresh | Revoke current session |
| POST | `/api/auth/logout-all` | 🍪 Refresh | Revoke all sessions |
| POST | `/api/auth/change-password` | 🍪 Refresh | Change password |

#### Account Endpoints

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/api/account/sessions` | 🍪 Access | List all active sessions |
| DELETE | `/api/account/sessions/:id` | 🍪 Access | Revoke a specific session (not current) |

### Endpoint Specifications

#### POST `/api/auth/register`

Create a new user account and automatically log in.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response:** `201 Created`

```json
{
  "user_id": 1
}
```

\+ Sets `access_token` and `refresh_token` cookies

**Error Responses:**

- `400 Bad Request`: Validation error (invalid email, password too short)
- `409 Conflict`: Email already exists

#### POST `/api/auth/login`

Authenticate with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response:** `200 OK`

```json
{
  "user_id": 1
}
```

\+ Sets `access_token` and `refresh_token` cookies

**Error Responses:**

- `401 Unauthorized`: Invalid credentials

#### POST `/api/auth/refresh`

Exchange refresh token for new access and refresh tokens.

**Request:** No body. Refresh token sent via cookie.

**Success Response (current token used):** `200 OK`

```json
{}
```

\+ Sets new `access_token` and `refresh_token` cookies

**Error Responses:**

- `401 Unauthorized` with `"error": "possible_theft"`: Previous token used (theft detected)
- `401 Unauthorized` with `"error": "session_expired"`: Token not found or session expired

#### POST `/api/auth/logout`

Revoke the current session. Accepts both current and previous refresh tokens.

**Request:** No body. Refresh token sent via cookie.

**Success Response:** `200 OK`

```json
{}
```

\+ Clears `access_token` and `refresh_token` cookies

**Notes:** Always returns success, even if token not found (idempotent).

#### POST `/api/auth/logout-all`

Revoke all sessions for the authenticated user.

**Request:** No body. Refresh token sent via cookie.

**Success Response:** `200 OK`

```json
{
  "revoked_count": 5
}
```

\+ Clears `access_token` and `refresh_token` cookies

#### GET `/api/account/sessions`

List all active sessions for the authenticated user.

**Request:** No body. Access token sent via cookie.

**Success Response:** `200 OK`

```json
{
  "sessions": [
    {
      "id": 1,
      "device_name": "Chrome on Windows",
      "ip_address": "192.168.1.100",
      "created_at": 1732636800,
      "last_used_at": 1732723200,
      "is_current": true
    },
    {
      "id": 2,
      "device_name": "Safari on iPhone",
      "ip_address": "10.0.0.50",
      "created_at": 1732550400,
      "last_used_at": 1732636800,
      "is_current": false
    }
  ]
}
```

#### DELETE `/api/account/sessions/:id`

Revoke a specific session by ID. User must own the session. **Cannot delete the current session** (use `/api/auth/logout` instead).

**Request:** No body. Access token sent via cookie for authentication.

**Success Response:** `200 OK`

```json
{}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or expired access token
- `403 Forbidden`: Session belongs to different user, OR attempting to delete current session
- `404 Not Found`: Session not found

#### POST `/api/auth/change-password`

Change the user's password. Requires current password for verification. Revokes all other sessions.

**Request:**

```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword456"
}
```

**Success Response:** `200 OK`

```json
{
  "revoked_sessions": 4
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid refresh token or current password incorrect

---

## Authentication Flows

### Register Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/register { email, password }                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Validate input (email format, password length)               │
│ 2. Normalize email (lowercase, trim whitespace)                 │
│ 3. Check email uniqueness                         [DB READ]     │
│ 4. Hash password with Argon2                                    │
│ 5. Insert user                                    [DB WRITE]    │
│ 6. Generate refresh token (32 random bytes)                     │
│ 7. Hash refresh token (SHA256)                                  │
│ 8. Insert session                                 [DB WRITE]    │
│ 9. Generate access token JWT (include jti claim)                │
│ 10. Set cookies, return user_id                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/login { email, password }                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Normalize email (lowercase, trim whitespace)                 │
│ 2. Find user by normalized email                 [DB READ]      │
│ 3. Constant-time password verification:                         │
│    - If user found: verify against user.password_hash           │
│    - If user not found: verify against DUMMY_HASH               │
│    - Reject if user not found OR password invalid               │
│ 4. Extract device info from User-Agent header                   │
│ 5. Extract IP address from request                              │
│ 6. Check session count for user                   [DB READ]     │
│    - If count >= 10: delete oldest session        [DB WRITE]    │
│      (by last_used_at)                                          │
│ 7. Generate refresh token (32 random bytes)                     │
│ 8. Hash refresh token (SHA256)                                  │
│ 9. Insert session with:                           [DB WRITE]    │
│    - created_at = now                                           │
│    - expires_at = now + 7 days                                  │
│    - last_used_at = now                                         │
│ 10. Generate access token JWT with claims:                      │
│    - sub = user_id                                              │
│    - sid = session_id                                           │
│    - jti = truncated_hash(refresh_token)                        │
│    - iat = now                                                  │
│    - exp = now + 15 minutes                                     │
│ 11. Set cookies, return user_id                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Protected API Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ GET /api/protected                                              │
│ Cookie: access_token=<jwt>                                      │
├─────────────────────────────────────────────────────────────────┤
│ 1. Extract access_token from cookie                             │
│ 2. Verify JWT signature (HS256)                                 │
│ 3. Check exp >= now                               [NO DB]       │
│ 4. Check iat <= now + 60s (leeway for clock skew) [NO DB]       │
│ 5. Extract claims (sub, sid, jti)                               │
│ 6. Verify session exists and token matches:       [DB READ]     │
│    SELECT token_hash, created_at FROM refresh_tokens            │
│    WHERE id = sid AND user_id = sub                             │
│ 7. If not found → 401 Unauthorized                              │
│ 8. Check iat >= session.created_at (replay prevention)          │
│    If iat < created_at → 401 Unauthorized                       │
│ 9. Compare truncated_hash(token_hash) with jti                  │
│    If mismatch → 401 Unauthorized (token rotated)               │
│ 10. Attach user_id and session_id to request context            │
│ 11. Proceed to handler                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Refresh Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/refresh                                              │
│ Cookie: refresh_token=<token>                                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Extract refresh_token from cookie                            │
│ 2. Hash token (SHA256)                                          │
│ 3. Extract IP address from request                              │
│ 4. BEGIN IMMEDIATE transaction          [DB TRANSACTION START]  │
│ 5. Search in token_hash column                    [DB READ]     │
│                                                                 │
│ ┌─ FOUND IN token_hash (current token) ─────────────────────┐   │
│ │ 6. Validate session:                                      │   │
│ │    - expires_at > now                                     │   │
│ │    - created_at + 30 days > now                           │   │
│ │ 7. Generate new refresh token                             │   │
│ │ 8. Update session:                          [DB WRITE]    │   │
│ │    - previous_token_hash = token_hash                     │   │
│ │    - token_hash = new_hash                                │   │
│ │    - expires_at = now + 7 days                            │   │
│ │    - last_used_at = now                                   │   │
│ │    - ip_address = current_ip (updated on every refresh)   │   │
│ │ 9. COMMIT transaction                 [DB TRANSACTION END]│   │
│ │ 10. Generate new access token JWT:                        │   │
│ │    - iat = now                                            │   │
│ │    - jti = truncated_hash(new_refresh_token)              │   │
│ │ 11. Set new cookies, return 200 OK                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ NOT FOUND, search previous_token_hash ───────[DB READ]───┐   │
│ │                                                           │   │
│ │ ┌─ FOUND (previous token used) ─────────────────────────┐ │   │
│ │ │ → ROLLBACK transaction                                │ │   │
│ │ │ → Return 401 with "possible_theft" error              │ │   │
│ │ │ → Client should retry once, then show theft warning   │ │   │
│ │ └───────────────────────────────────────────────────────┘ │   │
│ │                                                           │   │
│ │ ┌─ NOT FOUND ───────────────────────────────────────────┐ │   │
│ │ │ → ROLLBACK transaction                                │ │   │
│ │ │ → Return 401 with "session_expired" error             │ │   │
│ │ └───────────────────────────────────────────────────────┘ │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Note on Transaction Isolation**: SQLite's `BEGIN IMMEDIATE` acquires a reserved lock at transaction start, preventing other writers from modifying the database until COMMIT/ROLLBACK. This ensures atomic read-modify-write for token rotation.

### Logout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/logout                                               │
│ Cookie: refresh_token=<token>                                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Extract refresh_token from cookie                            │
│ 2. Hash token (SHA256)                                          │
│ 3. Search in token_hash OR previous_token_hash   [DB READ]      │
│ 4. If found: delete session                      [DB WRITE]     │
│ 5. Clear cookies                                                │
│ 6. Return 200 OK (always, even if not found)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Change Password Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/auth/change-password { current_password, new_password }   │
│ Cookie: refresh_token=<token>                                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Validate refresh token, get session           [DB READ]      │
│ 2. Fetch user                                    [DB READ]      │
│ 3. Verify current_password with Argon2                          │
│ 4. Hash new_password with Argon2                                │
│ 5. Update user's password_hash                   [DB WRITE]     │
│ 6. Delete all OTHER sessions for user            [DB WRITE]     │
│    (keep current session active)                                │
│ 7. Return success with count of revoked sessions                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Theft Detection System

### How It Works

The system detects token theft by tracking when a "previous" refresh token is used:

```
Normal flow (single client):
─────────────────────────────────────────────────────────────
Token v1 issued at login
    ↓
Client uses v1 to refresh → v1 moves to previous, v2 becomes current
    ↓
Client uses v2 to refresh → v2 moves to previous, v3 becomes current
    ↓
(continues...)


Theft scenario:
─────────────────────────────────────────────────────────────
Token v1 issued at login
    ↓
Attacker steals v1
    ↓
Attacker uses v1 to refresh → v1 moves to previous, v2 issued to attacker
    ↓
Real user tries v1 → found in previous → THEFT DETECTED
    ↓
Server returns 401 "possible_theft"
```

### Client-Side Handling (Race Condition Mitigation)

The server is strict: any use of a previous token triggers a "possible_theft" error. However, legitimate clients might send a previous token due to race conditions (e.g., parallel requests or network latency where the new cookie hasn't arrived yet).

To distinguish between a race condition and actual theft, the client implements a retry mechanism:

```
┌─────────────────────────────────────────────────────────────────┐
│ Client Theft Detection Flow                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  API call returns 401 (access token expired)                    │
│      ↓                                                          │
│  Call POST /api/auth/refresh                                        │
│      ↓                                                          │
│  Response 401 "possible_theft"?                                 │
│      ↓ Yes                                                      │
│  Wait 100ms (allow cookie update from parallel request)         │
│      ↓                                                          │
│  Retry POST /api/auth/refresh                                       │
│      ↓                                                          │
│  Still 401?                                                     │
│      ↓ Yes                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ CONFIRMED THEFT                                          │   │
│  │                                                          │   │
│  │ 1. Call POST /api/auth/logout with old refresh token         │   │
│  │    (revokes the compromised session)                     │   │
│  │                                                          │   │
│  │ 2. Show warning to user:                                 │   │
│  │    "Your session was accessed from another location.     │   │
│  │     The session has been terminated for security.        │   │
│  │     Please log in again."                                │   │
│  │                                                          │   │
│  │ 3. Redirect to login page                                │   │
│  │                                                          │   │
│  │ 4. After successful login, show sessions list            │   │
│  │    (user can review all active sessions)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why Previous Token Can Logout

The previous refresh token is accepted for logout to handle this scenario:

1. Theft is detected (user has old token, attacker has new token)
2. User wants to terminate the compromised session
3. User only has the old (previous) token
4. System accepts it and deletes the session, locking out the attacker

This is secure because:

- Logout is not a sensitive operation (attacker logging out user is minor nuisance)
- It gives the legitimate user a way to revoke a stolen session
- The session is deleted entirely, not just one token invalidated

---

## Security Considerations

### Rate Limiting

**Required rate limits to prevent brute force attacks:**

| Endpoint | Limit | Scope | Rationale |
|----------|-------|-------|-----------|
| `/api/auth/login` | 5/min | Per IP | Prevent password brute force |
| `/api/auth/register` | 3/min | Per IP | Prevent mass account creation |
| `/api/auth/refresh` | 30/min | Per session | Prevent token enumeration |
| `/api/auth/logout` | 10/min | Per IP | Prevent logout DoS attacks |
| `/api/auth/logout-all` | 5/min | Per IP | Prevent logout DoS attacks |
| `/api/auth/change-password` | 3/min | Per session | Prevent password brute force |

**Implementation approach:**

- Use in-memory rate limiting (e.g., `governor` crate, or explore whether salvo has built-in support)
- Consider Redis for distributed rate limiting if scaling to multiple instances
- Return `429 Too Many Requests` with `Retry-After` header

### Password Requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Hashing algorithm | Argon2id |

Argon2 is already implemented in `utils.rs` with secure defaults.

### Session Retention

Sessions are retained in the database as long as the user account exists. Expired sessions are not automatically cleaned up—they remain for audit purposes and are simply rejected during authentication. Sessions are only deleted when:

- A user explicitly logs out (`/api/auth/logout` or `/api/auth/logout-all`)
- A user changes their password (other sessions are revoked)
- A user's account is deleted (cascade delete)
- The session limit (10) is reached and the oldest session is evicted

This approach simplifies the system by eliminating the need for background cleanup jobs while providing a natural audit trail of session history.

### Configuration Requirements

New configuration fields needed in `config.toml`:

```toml
[auth]
jwt_secret = "your-256-bit-secret-here"  # Minimum 32 bytes
access_token_lifetime_seconds = 900       # 15 minutes
refresh_token_lifetime_seconds = 604800   # 7 days
session_max_lifetime_seconds = 2592000    # 30 days
max_sessions_per_user = 10                # Session limit per user
```

**JWT secret requirements:**

- Minimum 256 bits (32 bytes) for HS256
- Should be randomly generated
- Must be kept secret and not committed to version control
- Consider loading from environment variable: `APP_AUTH__JWT_SECRET`

### CORS Configuration

To support the strict cookie-based authentication flow, Cross-Origin Resource Sharing (CORS) must be explicitly configured:

- **`Access-Control-Allow-Credentials`**: Must be set to `true` to allow browsers to send cookies.
- **`Access-Control-Allow-Origin`**: Must specify the exact frontend origin (e.g., `https://localhost:3000`). Wildcards (`*`) are **not** permitted when credentials are allowed.
- **`Access-Control-Allow-Methods`**: Explicitly list allowed methods (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`).
- **`Access-Control-Allow-Headers`**: Allow `Content-Type`.
- **`Access-Control-Expose-Headers`**: Expose headers the frontend may need to read (e.g., `Retry-After`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

---

## Further Considerations

1. **Admin password reset**: If users forget their password, an admin must reset it. This requires:
   - Admin role/permission system
   - `POST /admin/users/:id/reset-password` endpoint
   - Decision: Implement now or defer?

2. **Account lockout**: After N failed login attempts, temporarily lock the account. Adds complexity but improves security against targeted attacks.

3. **Audit logging**: Log authentication events (login, logout, password change, failed attempts) for security monitoring. Consider what to log and retention policy.

4. **Multi-factor authentication (2FA)**: Project roadmap mentions this as a future module. Current design is extensible—add `totp_secret` to users table and verification step to login flow.
