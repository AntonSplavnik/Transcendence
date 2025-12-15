use std::borrow::Cow;

use validator::ValidationError;

pub fn nickname(nickname: &str) -> Result<(), ValidationError> {
    let len = nickname.len();

    let err = if nickname.trim() != nickname {
        ValidationError::new("trim").with_message(Cow::Borrowed(
            "Must not have leading or trailing whitespace.",
        ))
    } else if len < 3 || len > 16 {
        ValidationError::new("length").with_message(Cow::Borrowed(
            "Must be between 3 and 16 characters long.",
        ))
    } else if nickname.split_whitespace().count() != 1 {
        ValidationError::new("whitespace")
            .with_message(Cow::Borrowed("Must not contain whitespace."))
    } else if !nickname
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        ValidationError::new("invalid_chars").with_message(Cow::Borrowed(
            "Can only contain alphanumeric characters, underscores, or hyphens.",
        ))
    } else {
        return Ok(());
    };
    Err(err)
}

pub fn password(password: &str) -> Result<(), ValidationError> {
    let len = password.len();

    if len < 8 || len > 128 {
        let err = ValidationError::new("length").with_message(Cow::Borrowed(
            "Must be between 8 and 128 characters long.",
        ));
        return Err(err);
    }

    Ok(())
}
