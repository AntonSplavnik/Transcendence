# How-To: Database & Models (Diesel)

This guide explains how to add new tables and interact with the database using Diesel ORM.

## 1. The Workflow

Working with the database involves 3 steps:

1. **Migration**: Create a SQL file to define the table.
2. **Schema**: Diesel automatically updates `src/schema.rs` when you run the migration.
3. **Model**: You define Rust structs in `src/models.rs` to represent the data.

## 2. Creating a New Table (Migration)

1. **Generate the migration files**:
   Run this command in the `backend` folder:

   ```bash
   diesel migration generate create_tasks
   ```

2. **Edit the SQL**:
   This creates a folder in `migrations/`. Edit `up.sql` to create the table:

   ```sql
   -- up.sql
   CREATE TABLE tasks (
       id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
       title TEXT NOT NULL,
       is_completed BOOLEAN NOT NULL DEFAULT 0
   );
   ```

   And `down.sql` to undo it (important for rolling back):

   ```sql
   -- down.sql
   DROP TABLE tasks;
   ```

3. **Apply the migration**:

   ```bash
   diesel migration run
   ```

   *This will update `src/schema.rs` automatically.*

## 3. Defining the Model (Structs)

In `src/models.rs`, define structs that match your table.

```rust
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use crate::schema::tasks; // Import the table schema

// 1. Struct for READING data (Queryable)
// Must match the table columns exactly in order and type.
#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = tasks)]
pub struct Task {
    pub id: i32,
    pub title: String,
    pub is_completed: bool,
}

// 2. Struct for INSERTING data (Insertable)
// Usually doesn't have 'id' because the DB generates it.
#[derive(Insertable, Deserialize)]
#[diesel(table_name = tasks)]
pub struct NewTask {
    pub title: String,
    pub is_completed: bool,
}
```

## 4. CRUD Operations

Here is how to use these models in your code (e.g., in a Route Handler).

First, always import the necessary parts:

```rust
use diesel::prelude::*;
use crate::db;
use crate::models::{Task, NewTask};
use crate::schema::tasks::dsl::*; // Import table columns (id, title, etc.)
```

### Create (Insert)

```rust
pub fn create_task(new_title: String) -> Result<(), diesel::result::Error> {
    let new_task = NewTask {
        title: new_title,
        is_completed: false,
    };

    let conn = &mut db::get().unwrap(); // Get DB connection

    diesel::insert_into(tasks)
        .values(&new_task)
        .execute(conn)?;
        
    Ok(())
}
```

### Read (Select)

```rust
pub fn get_all_tasks() -> Vec<Task> {
    let conn = &mut db::get().unwrap();

    // Load all tasks
    tasks.load::<Task>(conn).expect("Error loading tasks")
}

pub fn get_task_by_id(task_id: i32) -> Option<Task> {
    let conn = &mut db::get().unwrap();

    // Find one by ID
    tasks.find(task_id).first::<Task>(conn).ok()
}
```

### Update

```rust
pub fn complete_task(task_id: i32) {
    let conn = &mut db::get().unwrap();

    diesel::update(tasks.find(task_id))
        .set(is_completed.eq(true))
        .execute(conn)
        .expect("Error updating task");
}
```

### Delete

```rust
pub fn delete_task(task_id: i32) {
    let conn = &mut db::get().unwrap();

    diesel::delete(tasks.find(task_id))
        .execute(conn)
        .expect("Error deleting task");
}
```
