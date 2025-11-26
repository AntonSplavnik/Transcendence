use salvo::prelude::*;

pub fn root() -> Router {
    let router = Router::new()
        .hoop(Logger::new())
        .get(StaticDir::new("www").defaults("index.html"));
    // .push(Router::with_path("api"));
    let doc = OpenApi::new("Transcendence API", "0.0.1").merge_router(&router);
    router
        .unshift(doc.into_router("/api-doc/openapi.json"))
        .unshift(Scalar::new("/api-doc/openapi.json").into_router("scalar"))
}
