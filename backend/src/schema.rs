// @generated automatically by Diesel CLI.

diesel::table! {
    sessions (id) {
        id -> Integer,
        user_id -> Integer,
        token_hash -> Binary,
        device_name -> Nullable<Text>,
        ip_address -> Nullable<Text>,
        created_at -> Timestamp,
        expires_at -> Timestamp,
        last_used_at -> Timestamp,
    }
}

diesel::table! {
    users (id) {
        id -> Integer,
        email -> Text,
        nickname -> Text,
        password_hash -> Text,
        created_at -> Timestamp,
    }
}

diesel::joinable!(sessions -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(sessions, users,);
