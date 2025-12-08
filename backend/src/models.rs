use chrono::NaiveDateTime;
use diesel::prelude::*;
use salvo::oapi::ToSchema;
use serde::Deserialize;
use validator::Validate;

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

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct NewUserInput {
    #[validate(email(message = "Must be a valid email address."))]
    pub email: String,
    #[validate(custom(function = "crate::utils::validate_nickname"))]
    pub nickname: String,
    #[validate(length(
        min = 8,
        max = 128,
        message = "Must be between 8 and 128 characters long."
    ))]
    pub password: String,
}

impl TryFrom<NewUserInput> for NewUser {
    type Error = argon2::password_hash::Error;

    fn try_from(value: NewUserInput) -> Result<Self, Self::Error> {
        Ok(NewUser {
            email: value.email,
            nickname: value.nickname,
            password_hash: crate::utils::hash_password(&value.password)?,
            created_at: chrono::Utc::now().naive_utc(),
        })
    }
}

#[derive(Insertable, Debug)]
#[diesel(table_name = crate::schema::users)]
pub struct NewUser {
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
