# How-To: Make a Route Handler

## Salvo Guides

<https://salvo.rs/guide/>

## Extensive Examples for every usecase directly from the salvo makers

<https://github.com/salvo-rs/salvo/tree/main/examples>

## Basic Handler and Router

```rust
use salvo::prelude::*;

// A basic handler that responds with "Hello, World!"
#[handler]
async fn my_hello_world_handler() -> &'static str {
    "Hello, World!"
}

// When using this router to serve under root,
// this will install the hello_world handler for GET "/hello-world"
Router::with_path("hello-world").get(my_hello_world_handler);
```

## Handler which returns Json Data

```rust
use salvo::prelude::*;
use serde::Serialize;

#[derive(Serialize)]
struct MyData {
    my_message: String,
    a_number: i32,
}

// A handler that returns JSON data
// (automatically serialized through the derived Serialize trait)
#[handler]
async fn json_response() -> Json<MyData> {
    let data = MyData {
        my_message: "Hello, JSON!".to_string(),
        a_number: 42,
    };

    Json(data)
    // or `return Json(data);`
    // (the last expression in a function is returned implicitly in rust)
}

// Usage: Router::with_path("api/data").get(json_response);
```

## Handler which extracts simple Data

```rust
use salvo::prelude::*;

// A handler that extracts a query parameter "name"
// and responds with a greeting message
// Example request if the handler is installed under the path "/greet":
// GET /greet?name=Alice
#[handler]
async fn greet(request: &mut Request) -> String {
    // Extract the "name" query parameter from the request
    // If not present, default to "unnamed"
    let name = request.query::<String>("name").unwrap_or("unnamed".to_string());

    // Return a greeting message
    format!("Hello, {name}!")
}

// Usage: Router::with_path("greet").get(greet);
```

## Handler which extracts a Json object manually (The Hard Way)

> **Note:** This is useful to understand how it works under the hood, but prefer the "Extractor" method below.

```rust
use salvo::prelude::*;
use serde::{Deserialize, Serialize};

// We need to derive the `Deserialize` Trait to parse JSON into this struct
// and we need `Serialize` to send it back as JSON
#[derive(Deserialize, Serialize)]
struct User {
    name: String,
    age: u8,
}

#[handler]
async fn echo_json_user(request: &mut Request) -> Json<User> {
    // Extract JSON data from the request body into a User struct
    // WARNING: .unwrap() will panic and crash the handler if the sent JSON is invalid!
    let data: User = request.parse_json::<User>().await.unwrap();
    // Just echo it back as JSON
    Json(data)
}

// This function avoids crashing the whole server,
// if parsing the User Json fails (because of the usage of `.unwrap()` above)
async fn echo_json_user_error_handled(request: &mut Request) -> Result<Json<User>, salvo::http::ParseError> {
    // Extract JSON data from the request body into a User struct
    // The `?` operator returns the error if parsing fails
    let data: User = request.parse_json::<User>().await?;
    // Just echo it back as JSON
    Ok(Json(data))
}
```

## The Recommended Way: Using Extractors (`JsonBody`)

This is the standard way to handle data in Salvo. It handles parsing and errors for you.

[Salvo Guide - Built-in extractors](https://salvo.rs/guide/concepts/request.html#built-in-extractors)

```rust
use salvo::{oapi::extract::JsonBody, prelude::*};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
struct User {
    name: String,
    age: u8,
}

// Parsing errors are automatically handled by Salvo when using the `JsonBody` extractor
#[handler]
async fn echo_json_user(user: JsonBody<User>) -> Json<User> {
    // `user` is a wrapper. Use `.into_inner()` to get your actual struct.
    let user_data = user.into_inner();

    // Just echo it back as JSON
    Json(user_data)
}

// Usage: Router::with_path("user").post(echo_json_user);
```
