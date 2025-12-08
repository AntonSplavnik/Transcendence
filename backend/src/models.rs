use std::time::Duration;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_autoincrement_new_struct::{NewInsertable, apply};

use crate::auth::session_token::{SessionToken, SessionTokenHash};

#[apply(NewInsertable!)]
#[derive(Queryable, Selectable, Debug)]
#[diesel(table_name = crate::schema::users)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct User {
    pub id: i32,
    pub email: String,
    pub nickname: String,
    pub password_hash: String,
    pub created_at: NaiveDateTime,
}

#[apply(NewInsertable!)]
#[derive(Queryable, Selectable, Debug, Associations, AsChangeset)]
#[diesel(table_name = crate::schema::sessions)]
#[diesel(belongs_to(User))]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Session {
    pub id: i32,
    pub user_id: i32,
    pub token_hash: SessionTokenHash,
    pub device_name: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: NaiveDateTime,
    pub expires_at: NaiveDateTime,
    pub last_used_at: NaiveDateTime,
}

impl Session {
    pub fn rotate_token(
        &mut self,
        new_token: &SessionToken,
        expires_after: Duration,
        device_name: Option<String>,
        ip_address: Option<String>,
    ) {
        self.token_hash = new_token.to_hash();
        self.last_used_at = chrono::Utc::now().naive_utc();
        self.expires_at = self.last_used_at + expires_after;

        if let Some(device) = device_name {
            self.device_name = Some(device);
        }
        if let Some(ip) = ip_address {
            self.ip_address = Some(ip);
        }
    }
}

impl NewSession {
    pub fn new(
        user_id: i32,
        token_hash: SessionTokenHash,
        expires_after: Duration,
        device_name: Option<String>,
        ip_address: Option<String>,
    ) -> Self {
        let now = chrono::Utc::now().naive_utc();
        Self {
            user_id,
            token_hash,
            device_name,
            ip_address,
            created_at: now,
            expires_at: now + expires_after,
            last_used_at: now,
        }
    }
}
