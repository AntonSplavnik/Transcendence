# Authentication & Session Security (Backend)

Scope:

- Backend crate under `backend/`
- HTTP authentication for `/api/*` routes

Non-goals:

- Frontend UX flows
- Authorization rules for game-specific operations (beyond “requires login”)

## High-level architecture

The backend uses a **two-token** model:

1. **Long-lived session token** (a refresh-token equivalent)
   - Stored only as an **HttpOnly cookie** (`session_token`)
   - Rotated on every refresh/reauth/login
   - Stored server-side as a **hash** in the database

2. **Short-lived access token** (JWT)
   - Stored as an **HttpOnly cookie** (`access_token`)
   - Used for authentication on most `/api/*` endpoints
   - Valid only for a short time window (currently 15 minutes)

Additionally, there is a **device identifier cookie** (`device_id`) used to link logins on the same browser/device to an existing session record.

## Source-of-truth in code

Core modules:

- `backend/src/auth/mod.rs`: constants and JWT claim types
- `backend/src/auth/router.rs`: `/api/auth/*` endpoints (register/login + session-management)
- `backend/src/auth/user.rs`: `/api/user/*` authenticated user endpoints
- `backend/src/auth/hoops.rs`: authentication middleware (“hoops”) and device-id injection
- `backend/src/auth/util.rs`: password hashing/verification, JWT issuance, cookie builders
- `backend/src/auth/session_token.rs`: refresh-token format + hashing
- `backend/src/auth/two_factor.rs`: optional TOTP-based 2FA and recovery codes

Routing integration:

- `backend/src/routers.rs`: mounts auth/user routers and defines OpenAPI security schemes

Database schema:

- `backend/migrations/2025-11-29-185752-0000_create_users/up.sql`
- `backend/migrations/2025-11-29-190105-0000_create_sessions/up.sql`
- `backend/migrations/2025-12-15-012250-0000_create_two_fa_recovery_codes/up.sql`

## Terminology

- **Session**: a server-side row in the `sessions` table, keyed by `id` and containing `token_hash` (hash of the current refresh token).
- **Reauth**: “credential reauthentication” (password confirmation) that refreshes `last_authenticated_at`.
- **Rolling session expiry**: if the user hasn’t refreshed within a window, the session must reauth.
- **Forced reauth window**: after a longer window since last credential auth, reauth is required.

## Tokens and cookies

### 1) `device_id` cookie

Purpose:

- Identifies the browser/device to *reuse* an existing session on subsequent logins.

Where it is set:

- Automatically on every request by the global hoop `device_id_inserter_hoop`.

Security properties:

- Not treated as a secret.
- Marked `HttpOnly` + `Secure` + `SameSite=Lax`.
- Path `/`.
- Very long max-age (10 years).

Threat model note:

- Because it is not a secret, it should not be used as an authentication factor.
- An attacker who can set this cookie in a victim browser could influence “which device” a login is associated with, but cannot log in without valid credentials.

### 2) `session_token` cookie (refresh token)

Name:

- `session_token` (constant `SESSION_COOKIE_NAME`)

Format:

- 32 bytes of random data, base64url-encoded without padding.
- Parsing/enforcement is implemented in `backend/src/auth/session_token.rs`.

Server-side storage:

- The raw token is **never** stored.
- Server stores `token_hash = BLAKE3(raw_token)` as a 32-byte BLOB.

Cookie properties:

- `HttpOnly`, `Secure`, `SameSite=Lax`
- Path is restricted to: `/api/auth/session-management/`
- Very long cookie max-age (10 years)

Important:

- The cookie’s max-age is “how long the browser keeps the cookie”, not the server-side session validity.
- Server-side reauth/rolling rules still apply.

### 3) `access_token` cookie (JWT)

Name:

- `access_token` (constant `JWT_COOKIE_NAME`)

Purpose:

- Used for authentication on most `/api/*` endpoints.

JWT signing secret:

- Generated randomly at process start (`JWT_SECRET` is created via `rand::random`).
- Not persisted.

Operational consequence:

- **Any backend restart invalidates all existing JWTs**, but does not invalidate session cookies.
- Clients can regain access by calling the refresh endpoint (requires valid session cookie and no reauth requirement).

JWT claims:

- `sub`: user id
- `sid`: session id
- `jti`: **truncated** (16-byte) prefix of the session token hash
- `iat`, `exp`: issued-at and expiry

Why `jti` exists:

- It ties the access token to the current session token value.
- On refresh/session rotation, the session’s `token_hash` changes; older JWTs no longer match.

Collision considerations:

- Only the first 16 bytes of the 32-byte hash are embedded in the JWT.
- This is a 128-bit value; collision probability is negligible for the intended threat model.

Cookie properties:

- `HttpOnly`, `Secure`, `SameSite=Lax`
- Path `/api/`
- Max-age equals access expiry (currently 15 minutes)

## Database model

### `users` table

Fields (see migration):

- `id` AUTO_INCREMENT
- `email` UNIQUE, `COLLATE NOCASE` (case-insensitive uniqueness)
- `nickname` UNIQUE, `COLLATE NOCASE`
- `password_hash`: Argon2 encoded hash
- `totp_enabled`: boolean flag (2FA enabled only after successful confirmation)
- `totp_secret_enc`: encrypted TOTP secret (optional; only stored server-side)
- `totp_confirmed_at`: timestamp of successful enrollment confirmation (optional)
- `created_at`

### `sessions` table

Fields (see migration and `backend/src/models.rs`):

- `id` AUTO_INCREMENT
- `user_id` (FK to users)
- `token_hash` UNIQUE (32 bytes, BLAKE3 hash)
- `device_id`: links the session to a browser/device
- `device_name` and `ip_address`: derived from `User-Agent` and remote address
- Timestamps:
  - `created_at`
  - `refreshed_at`: updated on refresh and on login rotation
  - `last_used_at`: updated on refresh and on login rotation
  - `last_authenticated_at`: updated on login and explicit reauth; set to epoch to force reauth (“deauth”)

### `two_fa_recovery_codes` table (optional)

Fields:

- `id` AUTO_INCREMENT
- `user_id` (FK to users)
- `code_hash`: BLAKE3 hash of the recovery code (raw codes are never stored)
- `used_at`: timestamp when the code was consumed (single-use)
- `created_at`

## Authentication middleware (“hoops”)

### `device_id_inserter_hoop`

- Runs globally (added in `backend/src/main.rs`).
- Ensures `device_id` is present in the request depot (either from cookie or newly created).

### `access_hoop` (JWT access)

Used by:

- `RouterAuthExt::requires_user_login()` which is applied to most authenticated routes (example: `/api/user/*`, `/api/users/*`, `/api/wt`)

Validation steps:

1. Read `access_token` cookie; if missing → unauthorized.
2. Decode/verify JWT using the in-memory secret.
3. Load session by `sid` from DB.
4. Verify session belongs to `sub`.
5. Verify session `token_hash` matches JWT `jti` (truncated compare).
6. Enforce reauth requirements (see below).
7. Store the session in the depot.

Outcome:

- If any step fails, request is rejected with 401.

### `session_hoop` (session cookie, reauth enforced)

Used by:

- `/api/auth/session-management/refresh-jwt`

Validation steps:

1. Read `session_token` cookie.
2. Decode base64url and ensure length is exactly 32 bytes.
3. Hash token with BLAKE3 and load session by `token_hash`.
4. Enforce reauth requirements.
5. Store the session in the depot.

### `session_allow_reauth_hoop` (session cookie, reauth NOT enforced)

Used by:

- `/api/auth/session-management/reauth`

Purpose:

- Allows reaching the endpoint that performs reauthentication even when the session is currently “needs reauth”.

## Reauthentication policy

Reauth is required if either condition holds:

1. **Rolling cutoff**: `refreshed_at` is older than `now - 7 days`
2. **Forced cutoff**: `last_authenticated_at` is older than `now - 30 days`

The policy is implemented in `session_requires_reauth`.

- If a client does not refresh the session for 7 days, they must provide the password again.
- Even with regular refreshes, a client must reauthenticate at least every 30 days.

## Endpoints

Routes are mounted under:

- `/api/auth/*` (registration/login + session management)
- `/api/user/*` (authenticated user operations)

### `/api/auth/register` (POST)

Rate limits:

- IP: 10 per 5 minutes
- IP: 50 per day

Input:

- `email`, `password`, `nickname` with server-side validation

Server actions:

1. Validate input.
2. Hash password with Argon2.
3. Insert user into DB.
4. Create a new session record.
5. Issue both cookies:
   - `session_token` (refresh)
   - `access_token` (JWT)

Errors:

- Validation: 400
- Unique violation (email/nickname): 409

### `/api/auth/login` (POST)

Rate limits:

- IP: 10 per minute

Input:

- `email`, `password`
- optional: `mfa_code` (required only if the user has 2FA enabled)

Server actions:

1. Lookup user by email and verify password (constant-time strategy).
2. Attempt to reuse a session for the same `device_id`.
   - If found: rotate it with `DO_REAUTH = true`.
   - If not found: create a new session.
3. Issue new cookies (`session_token` and `access_token`).

### `/api/auth/session-management/refresh-jwt` (POST)

Authentication:

- Requires valid `session_token` cookie and the session must NOT require reauth.

Server actions:

1. Validate session via `session_hoop`.
2. Rotate the session token (`DO_REAUTH = false`).
3. Issue new `session_token` and new `access_token`.

### `/api/auth/session-management/reauth` (POST)

Authentication:

- Requires `session_token` cookie.
- Does **not** require the session to be in a non-reauth state (it may be expired/needs-reauth).

Input:

- `password`
- optional: `mfa_code` (required only if the user has 2FA enabled)

Server actions:

1. Load session by `session_token`.
2. Verify password for the session’s user.
3. Rotate session token (`DO_REAUTH = true`, updates `last_authenticated_at`).
4. Issue new `session_token` and new `access_token`.

### `/api/user/*` (various)

All endpoints under `/api/user` require `access_token` via `requires_user_login()`.

- `/api/user/me` (GET): returns user + current session info
- `/api/user/change-password` (POST): requires current password; can force reauth of other sessions
- `/api/user/logout` (POST): “deauths” the current session and removes cookies
- `/api/user/logout-sessions` (POST): requires password; deauth selected sessions
- `/api/user/logout-other-sessions` (POST): requires password; deauth all other sessions
- `/api/user/session` (GET): get current session info
- `/api/user/sessions` (POST): requires password; list sessions
- `/api/user/sessions` (DELETE): requires password; delete session records
- `/api/user/2fa/start` (POST): start 2FA enrollment (returns secret + QR)
- `/api/user/2fa/confirm` (POST): confirm enrollment (returns recovery codes once)
- `/api/user/2fa/disable` (POST): disable 2FA (requires password + `mfa_code`)

## Optional: Two-factor authentication (TOTP)

2FA is an optional layer on top of the existing auth/session system.

Key compatibility point:

- If a user does not have 2FA enabled, the API behaves exactly as before.
- If a user has 2FA enabled, some endpoints require an additional `mfa_code`.

### What “2FA enabled” means

- Enrollment is a two-step flow: `start` → `confirm`.
- 2FA is enforced only when `totp_enabled` is `true` (after successful confirmation).

### Accepted `mfa_code` formats

`mfa_code` can be either:

- A TOTP code (usually 6 digits), or
- A recovery code (single-use, returned at enrollment).

The backend will try both (preferring the most likely one based on the input format).

### Where 2FA is enforced

When `totp_enabled = true`:

- `/api/auth/login` requires `mfa_code` in addition to email/password.
- `/api/auth/session-management/reauth` requires `mfa_code` in addition to password.
- `/api/user/change-password` requires `mfa_code` in addition to password.
- `/api/user/logout-sessions`, `/api/user/logout-other-sessions`, and `/api/user/sessions` (DELETE/POST) require `mfa_code` in addition to password.
- `/api/user/2fa/disable` requires `mfa_code` in addition to password.

### Enrollment endpoints (under `/api/user/2fa/*`)

All endpoints below require a valid `access_token` (regular authenticated user routes).

1. `POST /api/user/2fa/start`
   - Input: `{ "password": string }`
   - Output: `{ "base32_secret": string, "url": string, "qr_base64": string }`
   - Behavior:
      - Verifies the password.
      - Generates a new secret, stores it encrypted server-side.
      - Returns the secret material for the user to add to an authenticator app.
      - Can be called again before confirmation to restart enrollment.

1. `POST /api/user/2fa/confirm`
   - Input: `{ "password": string, "code": string }`
   - Output: `{ "recovery_codes": string[] }`
   - Behavior:
      - Verifies the password.
      - Validates the TOTP code against the pending secret.
      - Enables 2FA (`totp_enabled = true`) and returns recovery codes **once**.

1. `POST /api/user/2fa/disable`
   - Input: `{ "password": string, "mfa_code": string }`
   - Output: `{}`
   - Behavior:
      - Requires password + a valid `mfa_code` (TOTP or recovery code).
      - Disables 2FA and deletes stored recovery codes.

### Storage & crypto notes (server-side)

- TOTP secret is stored encrypted (not plaintext) and is bound to the user id as associated data.
- Recovery codes are stored as hashes and are single-use.
- Server configuration: the encryption key is loaded from the `TOTP_ENC_KEY` environment variable.

## Session rotation and “logout” semantics

### Session rotation

Rotation happens on:

- Login
- Register
- Refresh JWT
- Reauth

What rotation does:

- Generates a new random refresh token.
- Hashes it with BLAKE3 and stores in DB.
- Updates timestamps.
- Issues a new JWT whose `jti` matches the new session token hash (truncated).

Security effect:

- Old refresh tokens stop working immediately (because DB now contains the new hash).
- Old JWTs stop working immediately (because their `jti` no longer matches the DB token hash).

### Deauth vs delete

There are two distinct “revocation-ish” behaviors:

1. **Deauth** (implemented by setting `last_authenticated_at = UNIX_EPOCH`)
   - This forces the session into “needs reauth”.
   - Access via JWT is blocked.
   - Refresh via `/refresh-jwt` is blocked (reauth required).
   - The session can be recovered via `/reauth` with password.

2. **Delete** (SQL DELETE from sessions table)
   - Removes the session record entirely.
   - The session token and jwt will no longer have a matching DB row.

`/api/user/logout` performs **deauth + cookie deletion**, not deletion of the DB row.

## Rate limiting

Rate limiting is enforced via hoops:

- IP-based limits for login/register and public endpoints.
- User-based limits for authenticated endpoints, plus an IP limit of 5× the user quota.

The goal is to:

- Slow brute-force attempts
- Reduce credential stuffing impact
- Reduce abusive authenticated calls

## Error handling and observable behavior

Errors are returned as HTTP status codes with a brief string.

Notable cases:

- All auth failures return 401 with a brief variant name.
- Some endpoints intentionally return an auth error after cookie deletion (e.g., `DidLogout`).
- If 2FA is enabled for the user and `mfa_code` is missing or invalid, the backend returns 401 (`TwoFactorRequired` / `TwoFactorInvalid`).

Client guidance:

- Ensure clients treat `DidLogout` as a successful logout.

## Threat model & mitigations

### XSS

Mitigations:

- Tokens are stored in `HttpOnly` cookies, not accessible to JavaScript.

Residual risks:

- XSS can still perform authenticated actions by issuing requests from the victim browser (because cookies are attached by the browser).
- `SameSite=Lax` does not mitigate same-origin XSS.

### CSRF

Mitigations:

- Cookies use `SameSite=Lax`, which blocks cookies on most cross-site POST requests.
- No state-changing GET endpoints exist in auth flows.

Residual risks:

- If future endpoints allow state change via GET, `SameSite=Lax` could allow CSRF via top-level navigation.

### Session token theft

If an attacker steals:

- **JWT cookie only**: limited impact (short lifetime, and tied to current session token hash)
- **Session cookie only**: attacker can attempt refresh, but refresh is blocked if reauth is required; attacker can attempt reauth but needs password
- **Both cookies**: attacker can act as user until JWT expires; can refresh only while session is within the rolling/forced windows

### Password guessing / credential stuffing

Mitigations:

- Rate limits on login/register.
- Password hashing with Argon2.
- “Constant time” verification strategy for non-existing users (dummy hash).

Known limitation:

- The register endpoint enumerates existing emails via 409 responses. Only fixable by introducing email verification flows.

### Multi-instance deployment

Would need to share JWT secret and sqlite database or migrate to a centralized DB.

## Operational guidance

- Always run behind TLS; cookies are marked `Secure`.
- Monitor rate-limit warnings in logs.
