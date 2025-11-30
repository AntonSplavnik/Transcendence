use chrono::NaiveDateTime;
use diesel::prelude::*;

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

#[derive(Queryable, Selectable, Debug, Associations)]
#[diesel(table_name = crate::schema::sessions)]
#[diesel(belongs_to(User))]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Session {
    pub id: i32,
    pub user_id: i32,
    pub token_hash: String,
    pub previous_token_hash: Option<String>,
    pub device_name: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: NaiveDateTime,
    pub expires_at: NaiveDateTime,
    pub last_used_at: NaiveDateTime,
}
