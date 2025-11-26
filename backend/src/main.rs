use salvo::catcher::Catcher;
use salvo::conn::Acceptor;
use salvo::conn::rustls::{Keycert, RustlsConfig};
use salvo::prelude::*;
use salvo::server::ServerHandle;
use serde::Serialize;
use tokio::signal;
use tracing::info;

mod config;
mod db;
mod models;
mod routers;
mod utils;

mod error;
pub use error::AppError;

use crate::config::{ServerConfig, TlsConfig};

pub type AppResult<T> = Result<T, AppError>;
pub type JsonResult<T> = Result<Json<T>, AppError>;
pub type EmptyResult = Result<Json<Empty>, AppError>;

pub fn json_ok<T>(data: T) -> JsonResult<T> {
    Ok(Json(data))
}
#[derive(Serialize, ToSchema, Clone, Copy, Debug)]
pub struct Empty {}
pub fn empty_ok() -> JsonResult<Empty> {
    Ok(Json(Empty {}))
}

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();
    crate::config::init();
    let config = crate::config::get();
    crate::db::init();

    let _guard = config.log.guard();
    tracing::info!("log level: {}", &config.log.filter_level);

    let service = Service::new(routers::root()).catcher(Catcher::default());
    //Acme support, automatically get TLS certificate from Let's Encrypt. For example, see https://github.com/salvo-rs/salvo/blob/main/examples/acme-http01-quinn/src/main.rs
    if let Some(tls) = &config.tls {
        let listen_addr = &config.listen_addr;
        let port = config.listen_https_port;
        println!(
            "🚀 Server Listening on https://{}:{port}/",
            listen_addr.replace("0.0.0.0", "127.0.0.1"),
        );
        println!(
            "📖 Open API Page: https://{}:{port}/scalar",
            listen_addr.replace("0.0.0.0", "127.0.0.1")
        );
        let acceptor = setup_acceptor_socket(&config, tls).await;
        let server = Server::new(acceptor);
        tokio::spawn(shutdown_signal(server.handle()));
        server.serve(service).await;
    } else {
        // needs cfg.domain to be set for acme
        // setup_acme_acceptor_socket()
        todo!()
    }
}

async fn setup_acceptor_socket(
    cfg: &ServerConfig,
    tls: &TlsConfig,
) -> impl Acceptor {
    let (cert, key) =
        tokio::join!(tokio::fs::read(&tls.cert), tokio::fs::read(&tls.key));
    let cert = cert.expect("Valid cert.pem path must be provided");
    let key = key.expect("Valid key.pem path must be provided");
    // Load TLS certificates for https from files
    let config = RustlsConfig::new(Keycert::new().cert(cert).key(key));
    // Set up a TCP listener on port 80 for HTTP
    let http = TcpListener::new(("127.0.0.1", cfg.listen_http_port));
    // Set up a TCP listener on port 443 for HTTPS
    let https = TcpListener::new(("127.0.0.1", cfg.listen_https_port))
        .rustls(config.clone());
    // Enable QUIC/HTTP3 support on the same port
    let http3 =
        QuinnListener::new(config, ("127.0.0.1", cfg.listen_https_port));
    // Combine HTTP, HTTPS, and HTTP3 listeners into a single acceptor
    let acceptor = http3.join(https).join(http).bind().await;
    // https.join(http).bind().await
    // let acceptor = https.bind().await;
    info!(
        "Server running on https://127.0.0.1:{}/",
        cfg.listen_https_port
    );
    acceptor
}

// TODO only with a domain: Set up a TCP listener on port 443 for HTTPS with ACME and HTTP3
//
// let listener = TcpListener::new("0.0.0.0:443")
//     .acme() // Enable ACME for automatic SSL certificate management
//     .cache_path("temp/letsencrypt") // Path to store the certificate cache
//     .add_domain("something.com") // replace with your domain
//     .http01_challenge(&mut router) // Add routes to handle ACME challenge requests
//     .quinn("0.0.0.0:443"); // Enable QUIC/HTTP3 support on the same port

async fn shutdown_signal(handle: ServerHandle) {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => info!("ctrl_c signal received"),
        _ = terminate => info!("terminate signal received"),
    }
    handle.stop_graceful(std::time::Duration::from_secs(60));
}

#[cfg(test)]
mod tests {
    use salvo::prelude::*;
    use salvo::test::{ResponseExt, TestClient};

    use crate::config;

    #[tokio::test]
    async fn test_hello_world() {
        config::init();

        let service = Service::new(crate::routers::root());

        let content = TestClient::get(format!(
            "http://{}",
            config::get().listen_addr.replace("0.0.0.0", "127.0.0.1")
        ))
        .send(&service)
        .await
        .take_string()
        .await
        .unwrap();
        assert_eq!(content, "Hello World from salvo");
    }
}
