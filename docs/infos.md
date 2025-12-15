### Sources for Documentation

Mozilla foundation, especially for how to design the frontend

### Tips

- install the npm extra Modules for:
  esLint
  Type Checking

- be extremely strict with Typescript
  a funtion definition should contain: - sync or async - return and type of return - define input type

- fastify instance:
  --> registering all Modules on fastify instance
  -fp fastify plugins -> makes internal typing connect

some other group used REST APIs

- get a really clear idea of the flow:
  define all schemas centralized:
  who sends what to whom?

### Authentication & Authorization

#### JSON Web Tokens (JWT)

[explanation of the security of JWTs](https://codesignal.com/learn/courses/jwt-security-attacks-defenses-1/lessons/introduction-to-jwt-security)

generate a JWT_SECRET_KEY and store it in an environment variable for signing tokens.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
