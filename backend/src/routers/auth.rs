use diesel::RunQueryDsl;
use diesel::dsl::insert_into;
use salvo::oapi::{endpoint, extract::JsonBody};
use salvo::prelude::*;
use validator::Validate;

use crate::models::NewUser;
use crate::models::NewUserInput;
use crate::schema::users::dsl::*;
use crate::{EmptyResult, db, empty_ok};

pub(super) fn router() -> Router {
    Router::new()
        .append(&mut vec![
            Router::with_path("register").post(register),
            Router::with_path("login").post(login),
            Router::with_path("logout").post(logout),
        ])
        .oapi_tag("auth")
}

#[endpoint(summary = "Register a new user")]
pub fn register(
    user: JsonBody<NewUserInput>,
    res: &mut Response,
) -> EmptyResult {
    let user = user.into_inner();
    user.validate()?;
    let user = NewUser::try_from(user)?;
    insert_into(users).values(&user).execute(&mut db::get()?)?;
    res.status_code(StatusCode::CREATED);
    empty_ok()
}

#[endpoint(summary = "Login a user")]
pub fn login() {}

#[endpoint(
    summary = "Logout a user",
    security(("session" = []))
)]
pub fn logout() {}
