use salvo::oapi::security::{ApiKey, ApiKeyValue, SecurityScheme};
use salvo::prelude::*;

use crate::hoops::auth::access_hoop;
use crate::stream::connect_stream;

mod auth;

#[handler]
pub async fn hello() -> &'static str {
    "Hello, Transcendence!"
}

pub fn root() -> Router {
    let router = Router::new()
        .hoop(Logger::new())
        .get(StaticDir::new("www").defaults("index.html"))
        .push(
            Router::with_path("api")
                .push(Router::with_path("auth").push(auth::router()))
                .push(
                    Router::with_path("wt")
                        .hoop(access_hoop)
                        .goal(connect_stream),
                )
                .push(Router::with_path("hello").hoop(access_hoop).get(hello)),
        );
    let doc = OpenApi::new("Transcendence API", "0.0.1")
        .add_security_scheme(
            "session",
            SecurityScheme::ApiKey(ApiKey::Cookie(
                ApiKeyValue::with_description(
                    "session_token",
                    "HttpOnly cookie containing a 32-byte base64url-encoded refresh token. \
                     Issued by the /auth/login and /auth/refresh endpoint and rotated on each refresh. \
                     Used for authentication on /api/auth endpoints (logout, refresh, change-password). \
                     Has a 7-day rolling expiry with 30-day absolute maximum lifetime.",
                ),
            )),
        )
        .add_security_scheme("jwt", SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::with_description("access_token", "TODO"))))
        .merge_router(&router);
    router
        .unshift(doc.into_router("/api-doc/openapi.json"))
        .unshift(Scalar::new("/api-doc/openapi.json").into_router("scalar"))
        .unshift(
            SwaggerUi::new("/api-doc/openapi.json").into_router("swagger-ui"),
        )
        .unshift(RapiDoc::new("/api-doc/openapi.json").into_router("rapidoc"))
        .unshift(ReDoc::new("/api-doc/openapi.json").into_router("redoc"))
}
