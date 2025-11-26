use diesel::{Connection, SqliteConnection};
use diesel_migrations::{
    EmbeddedMigrations, MigrationHarness, embed_migrations,
};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn init() {
    migrate()
}

fn migrate() {
    let conn = &mut connect().expect("db connect should worked");
    println!(
        "Has pending migration: {}",
        conn.has_pending_migration(MIGRATIONS).unwrap()
    );
    conn.run_pending_migrations(MIGRATIONS)
        .expect("migrate db should worked");
}

pub fn connect() -> Result<SqliteConnection, diesel::ConnectionError> {
    let config = crate::config::get();
    SqliteConnection::establish(&config.database_url)
}
