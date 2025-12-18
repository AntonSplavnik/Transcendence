# User Profile - Documentation

## Module Objectives

### Requirements (Major Module)
**Standard user management and authentication:**
- ✅ Users can update their profile information
- ✅ Users can upload an avatar (with a default avatar if none provided)
- ⏳ Users can add other users as friends and see their online status
- ✅ Users have a profile page displaying their information

---

## Implementation Completed

### 1. Backend - Avatar System

**Architectural Decision:**
- Logical grouping of migrations for better clarity
- Structure actual:
  1. `create_users` - Base user table
  2. `create_sessions` - Session management
  3. `create_two_fa_recovery_codes` - 2FA
  4. `player_stats` - Game statistics (user_stats + game_history)
  5. `profile_features` - Profile features (avatar)

#### Avatar Upload
**Endpoint: `POST /api/profile/avatar`**

**File:** `backend/src/routers/profile.rs`

**Features:**
- Multipart/form-data file upload
- MIME type validation (image/jpeg, image/png, image/gif, image/webp)
- Unique naming: `user_{user_id}_{timestamp}.{ext}`
- Storage: `backend/static/avatars/`
- Save path in DB: `/avatars/filename`

**Key code:**
```rust
let filename = format!("user_{}_{}.{}", user_id, timestamp, ext);
let file_path = avatars_dir.join(&filename);

// Save to database
let avatar_url = format!("/avatars/{}", filename);
diesel::update(users::table.find(user_id))
    .set(users::avatar_url.eq(&avatar_url))
    .execute(&mut conn)?;
```

#### Avatar Serving
**Route: `GET /avatars/{*path}`**

**File:** `backend/src/routers.rs`

**Critical Technical Decision:**
- Use `{*path}` (unnamed wildcard) instead of `<**path>` (named parameter)
- Salvo's `StaticDir` requires an unnamed wildcard to work
- Centralized configuration via `config.avatars_dir`

**Code:**
```rust
let avatars_route = Router::with_path("avatars/{*path}")
    .get(StaticDir::new(&crate::config::get().avatars_dir));
```

**Configuration:** `backend/src/config/mod.rs`
```rust
pub struct ServerConfig {
    pub avatars_dir: String,  // default: "static/avatars"
    // ...
}
```

---

### 2. Frontend - Avatar Component

#### Avatar Component
**File:** `frontend/src/components/Avatar.tsx`

**Features:**
- Display image if `avatar_url` exists
- Fallback to colored initials if no avatar
- Background color generated from nickname hash
- Colored circle with centered white initials

**Props:**
```typescript
interface AvatarProps {
  user: { nickname: string; avatar_url?: string | null };
  size?: 'small' | 'medium' | 'large';
  className?: string;
}
```

**Color Generation:**
```typescript
const getColorFromNickname = (nickname: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  const hash = nickname.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0
  );
  return colors[hash % colors.length];
};
```

**Initials:**
```typescript
const getInitials = (nickname: string): string => {
  return nickname
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
```

#### ProfileEdit Modal
**File:** `frontend/src/components/ProfileEdit.tsx`

**Features:**
- File input to select an image
- Preview of current avatar
- Upload via `fetch` with `FormData`
- Error handling (file type, size)
- User feedback (loading, success, error)

**Upload logic:**
```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validation
  if (!file.type.startsWith('image/')) {
    setError('Please select an image file');
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch('/api/profile/avatar', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json();
  // Update user context with new avatar_url
};
```

---

## 📁 File Structure

### Backend
```
backend/
├── migrations/
│   ├── 2025-11-29-185752-0000_create_users/
│   ├── 2025-11-29-190105-0000_create_sessions/
│   ├── 2025-12-15-012250-0000_create_two_fa_recovery_codes/
│   ├── 2025-12-18-115022-0000_player_stats/          # Grouped
│   └── 2025-12-18-115028-0000_profile_features/      # Grouped
├── src/
│   ├── config/mod.rs              # Configuration (avatars_dir)
│   ├── routers.rs                 # Routes (avatars StaticDir)
│   ├── routers/profile.rs         # Upload endpoint
│   ├── models.rs                  # UserStats (corrected order)
│   └── schema.rs                  # Auto-generated Diesel schema
└── static/avatars/                # Avatar storage
```

### Frontend
```
frontend/
├── src/
│   ├── components/
│   │   ├── Avatar.tsx             # Avatar component with initials
│   │   └── ProfileEdit.tsx        # Profile edit modal
│   └── contexts/
│       └── AuthContext.tsx        # User context (avatar_url)
```

---

### Frontend
- ✅ Avatar displays correctly
- ✅ Initials with color if no avatar
- ✅ Upload via ProfileEdit modal
- ✅ Current avatar preview
- ✅ Context update after upload

---

## Next Steps

### To Implement
- [ ] Friends system (add/remove/list friends)
- [ ] Online status (online/offline)
- [ ] Real-time notifications (WebSocket/SSE)
- [ ] Friends list with status in profile
- [ ] User search

---

## Technical References

### Salvo Framework
- **StaticDir**: Requires `{*path}` unnamed wildcard
- **Order matters**: Specific routes before catch-all

### Diesel ORM
- **Field order**: Must match SQL schema exactly
- **Migrations**: Group logically for maintainability

### React/TypeScript
- **FormData**: For multipart upload
- **Context API**: To share user data
- **CSS-in-JS**: Dynamic colors for avatars

---

*Documentation updated on December 18, 2025*
