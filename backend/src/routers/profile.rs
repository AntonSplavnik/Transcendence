///! Provides profile management routes (avatar upload, profile update).

use crate::prelude::*;
use salvo::http::StatusCode;
use std::fs;
use std::path::Path;
use chrono::Utc;

pub fn router(path: &str) -> Router {
    Router::with_path(path)
        .oapi_tag("profile")
        .push(Router::new().requires_user_login().append(&mut vec![
            Router::with_path("avatar")
                .user_rate_limit(&RateLimit::per_15_minutes(10))
                .post(upload_avatar),
            Router::with_path("update")
                .user_rate_limit(&RateLimit::per_15_minutes(20))
                .put(update_profile),
        ]))
}

#[derive(Debug, Serialize, ToSchema)]
struct AvatarResponse {
    avatar_url: String,
}

#[derive(Debug, Deserialize, ToSchema)]
struct UpdateProfileRequest {
    nickname: Option<String>,
}

/// Upload or update user avatar
#[endpoint(tags("profile"))]
async fn upload_avatar(
    req: &mut Request,
    depot: &mut Depot,
    res: &mut Response,
) -> Result<Json<AvatarResponse>, StatusError> {
    let user_id = depot.user_id();
    
    // Get the uploaded file from multipart form data
    let file = req.file("avatar").await;
    
    if file.is_none() {
        res.status_code(StatusCode::BAD_REQUEST);
        return Err(StatusError::bad_request().brief("No file uploaded"));
    }
    
    let file = file.unwrap();
    
    // Validate file type
    let content_type = file.content_type().map(|m| m.to_string()).unwrap_or_default();
    if !content_type.starts_with("image/") {
        res.status_code(StatusCode::BAD_REQUEST);
        return Err(StatusError::bad_request().brief("File must be an image (jpeg, png, webp)"));
    }
    
    // Validate file size (max 2MB)
    let file_size = file.size();
    if file_size > 2 * 1024 * 1024 {
        res.status_code(StatusCode::BAD_REQUEST);
        return Err(StatusError::bad_request().brief("File size must be less than 2MB"));
    }
    
    // Determine file extension from content type
    let extension = if content_type.contains("jpeg") {
        "jpg"
    } else if content_type.contains("png") {
        "png"
    } else if content_type.contains("webp") {
        "webp"
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
        return Err(StatusError::bad_request().brief("Unsupported image format. Use JPEG, PNG, or WebP"));
    };
    
    // Generate filename: user_{id}_{timestamp}.{ext}
    let timestamp = Utc::now().timestamp();
    let filename = format!("user_{}_{}.{}", user_id, timestamp, extension);
    let file_path = format!("static/avatars/{}", filename);
    let new_avatar_url = format!("/avatars/{}", filename);
    
    // Get old avatar_url from database before updating
    let mut conn = crate::db::get().map_err(|e| {
        tracing::error!("Database connection error: {}", e);
        StatusError::internal_server_error().brief("Database connection failed")
    })?;
    
    let old_avatar_url: Option<Option<String>> = {
        use crate::schema::users::dsl::*;
        users
            .find(user_id)
            .select(avatar_url)
            .first(&mut conn)
            .optional()
            .map_err(|e| {
                tracing::error!("Database query error: {}", e);
                StatusError::internal_server_error().brief("Failed to query user")
            })?
    };
    
    // Save the new file
    let path = Path::new(&file_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            tracing::error!("Failed to create avatars directory: {}", e);
            StatusError::internal_server_error().brief("Failed to save avatar")
        })?;
    }
    
    // Write file to disk
    fs::copy(file.path(), &file_path).map_err(|e| {
        tracing::error!("Failed to save avatar file: {}", e);
        StatusError::internal_server_error().brief("Failed to save avatar")
    })?;
    
    // Update database with new avatar_url
    {
        use crate::schema::users::dsl::*;
        diesel::update(users.find(user_id))
            .set(avatar_url.eq(&new_avatar_url))
            .execute(&mut conn)
            .map_err(|e| {
                tracing::error!("Failed to update avatar_url: {}", e);
                StatusError::internal_server_error().brief("Failed to update profile")
            })?;
    }
    
    // Delete old avatar file if it exists
    if let Some(Some(old_url)) = old_avatar_url {
        let old_path = format!("static{}", old_url);
        if Path::new(&old_path).exists() {
            if let Err(e) = fs::remove_file(&old_path) {
                tracing::warn!("Failed to delete old avatar file {}: {}", old_path, e);
                // Don't fail the request if cleanup fails
            }
        }
    }
    
    Ok(Json(AvatarResponse { avatar_url: new_avatar_url }))
}

/// Update user profile (nickname)
#[endpoint(tags("profile"))]
async fn update_profile(
    req: &mut Request,
    depot: &mut Depot,
    res: &mut Response,
) -> Result<Json<crate::models::User>, StatusError> {
    let user_id = depot.user_id();
    let body: UpdateProfileRequest = req.parse_json().await.map_err(|e| {
        tracing::error!("Failed to parse JSON: {}", e);
        StatusError::bad_request().brief("Invalid request body")
    })?;
    
    let mut conn = crate::db::get().map_err(|e| {
        tracing::error!("Database connection error: {}", e);
        StatusError::internal_server_error().brief("Database connection failed")
    })?;
    
    // If nickname is being updated, check if it's available
    if let Some(new_nickname) = &body.nickname {
        // Validate nickname format (3-20 chars, alphanumeric + underscore)
        if new_nickname.len() < 3 || new_nickname.len() > 20 {
            res.status_code(StatusCode::BAD_REQUEST);
            return Err(StatusError::bad_request().brief("Nickname must be 3-20 characters"));
        }
        
        // Check if nickname is already taken by another user
        use crate::schema::users::dsl::*;
        let existing: Option<i32> = users
            .filter(nickname.eq(new_nickname))
            .filter(id.ne(user_id))
            .select(id)
            .first(&mut conn)
            .optional()
            .map_err(|e| {
                tracing::error!("Database query error: {}", e);
                StatusError::internal_server_error().brief("Failed to check nickname")
            })?;
        
        if existing.is_some() {
            res.status_code(StatusCode::CONFLICT);
            return Err(StatusError::conflict().brief("Nickname already taken"));
        }
        
        // Update nickname
        diesel::update(users.find(user_id))
            .set(nickname.eq(new_nickname))
            .execute(&mut conn)
            .map_err(|e| {
                tracing::error!("Failed to update nickname: {}", e);
                StatusError::internal_server_error().brief("Failed to update nickname")
            })?;
    }
    
    // Return updated user
    use crate::schema::users::dsl::*;
    let updated_user = users
        .find(user_id)
        .first::<crate::models::User>(&mut conn)
        .map_err(|e| {
            tracing::error!("Failed to fetch user: {}", e);
            StatusError::internal_server_error().brief("Failed to fetch user")
        })?;
    
    Ok(Json(updated_user))
}
