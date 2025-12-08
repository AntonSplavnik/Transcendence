use std::sync::LazyLock;
use std::time::Duration;

use diesel::SqliteConnection;
use diesel::connection::SimpleConnection;
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel_migrations::{
    EmbeddedMigrations, MigrationHarness, embed_migrations,
};
use tracing::info;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

/// The global connection pool
static DB: LazyLock<Pool<ConnectionManager<SqliteConnection>>> =
    LazyLock::new(init_pool);

/// Custom connection customizer to set SQLite pragmas on each connection
#[derive(Debug)]
struct SqliteConnectionCustomizer;

impl diesel::r2d2::CustomizeConnection<SqliteConnection, diesel::r2d2::Error>
    for SqliteConnectionCustomizer
{
    fn on_acquire(
        &self,
        conn: &mut SqliteConnection,
    ) -> Result<(), diesel::r2d2::Error> {
        // Enable WAL mode for better concurrency (readers don't block writers)
        // Set busy timeout to 5 seconds to wait for locks instead of failing immediately
        // Enable foreign keys for referential integrity
        conn.batch_execute(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA foreign_keys = ON;",
        )
        .map_err(diesel::r2d2::Error::QueryError)?;
        Ok(())
    }
}

pub fn init() {
    LazyLock::force(&DB);
    migrate();
}

fn init_pool() -> Pool<ConnectionManager<SqliteConnection>> {
    let config = crate::config::get();
    let manager =
        ConnectionManager::<SqliteConnection>::new(&config.database_url);

    let pool = Pool::builder()
        .max_size(10) // Maximum number of connections in the pool
        .min_idle(Some(1)) // Keep at least 1 connection ready
        .connection_timeout(Duration::from_secs(30))
        .connection_customizer(Box::new(SqliteConnectionCustomizer))
        .build(manager)
        .expect("Failed to create database connection pool");
    info!("Database connection pool initialized with WAL mode");
    pool
}

fn migrate() {
    let mut conn = get().expect("Failed to get connection for migration");
    info!(
        "Has pending migration: {}",
        conn.has_pending_migration(MIGRATIONS).unwrap()
    );
    conn.run_pending_migrations(MIGRATIONS)
        .expect("migrate db should worked");
}

pub fn get() -> Result<
    PooledConnection<ConnectionManager<SqliteConnection>>,
    diesel::r2d2::PoolError,
> {
    DB.get()
}
