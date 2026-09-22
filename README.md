# hermes-api

A small backend API built with **Node.js + Express + TypeScript**, using **zod** for request validation and **MariaDB** (via `mysql2`) as the database.

## Stack

| Concern      | Choice                          |
| ------------ | ------------------------------- |
| Runtime      | Node.js >= 20                   |
| Framework    | Express 4                       |
| Language     | TypeScript (strict)             |
| Validation   | zod (body / query / params)     |
| Database     | MariaDB via `mysql2` pool       |
| Auth         | JWT (access + refresh tokens)   |

## Project layout

```
hermes/
├── db/
│   └── schema.sql          # MariaDB DDL (database + todos table)
├── src/
│   ├── config.ts           # env-based configuration
│   ├── index.ts            # entrypoint, graceful shutdown
│   ├── app.ts              # express app wiring + /health
│   ├── db/
│   │   └── pool.ts         # shared mysql2 connection pool
│   ├── middleware/
│   │   ├── validate.ts     # zod validation middleware
│   │   ├── errors.ts       # error handler (zod / DB / HTTP errors)
│   │   └── auth.ts         # JWT authentication middleware
│   ├── routes/
│   │   ├── todos.ts        # todos CRUD endpoints
│   │   └── auth.ts         # auth endpoints (login, refresh, logout)
│   └── types/
│       └── express.d.ts    # Express Request type augmentation
├── .env.example
├── package.json
└── tsconfig.json
```

## Getting started

### 1. Configure environment

```bash
cp .env.example .env
# then edit .env with your MariaDB credentials and JWT secrets
```

The `.env` file must include:

| Variable                | Description                              | Default                          |
| ----------------------- | ---------------------------------------- | -------------------------------- |
| `PORT`                  | Server port                              | `3000`                           |
| `NODE_ENV`              | Environment (`development`, `production`) | `development`                    |
| `DB_HOST`               | MariaDB host                             | `127.0.0.1`                      |
| `DB_PORT`               | MariaDB port                             | `3306`                           |
| `DB_USER`               | MariaDB user                             | `hermes`                         |
| `DB_PASSWORD`           | MariaDB password                          | `hermes`                         |
| `DB_NAME`               | Database name                            | `hermes`                         |
| `JWT_SECRET`            | Secret for signing access tokens         | `hermes_jwt_secret_key`          |
| `REFRESH_TOKEN_SECRET`  | Secret for signing refresh tokens        | `hermes_refresh_token_secret_key`|

> **Important**: In production, use strong random strings for both JWT secrets and rotate them periodically.

### 2. Create the database

```bash
mariadb -u root < db/schema.sql
```

This creates the `hermes` database and `todos` table (optionally a dedicated `hermes` DB user — see the comments in `schema.sql`).

### 3. Install and run

```bash
npm install
npm run dev        # development (tsx, auto-reload)
# or
npm run build && npm start
```

The server listens on `http://localhost:3000` by default.

## API

### `GET /health`

Health check; reports DB connectivity.

### Authentication — `/api/auth`

The API uses **JWT (JSON Web Tokens)** with a dual-token strategy:

- **Access token** (`access_token`) — Short-lived (15 min by default), sent in the `Authorization: Bearer <token>` header.
- **Refresh token** (`refresh_token`) — Long-lived (7 days by default), used to obtain new access tokens without re-login.

Both tokens are signed with separate secrets configured via environment variables (`JWT_SECRET` and `REFRESH_TOKEN_SECRET`).

| Method | Path         | Body                          | Description                    |
| ------ | ------------ | ----------------------------- | ------------------------------ |
| POST   | `/api/auth/login`    | `{ email, password }`    | Login and receive access + refresh tokens  |
| POST   | `/api/auth/refresh`  | `{ refresh_token }`      | Exchange a valid refresh token for a new access token |
| POST   | `/api/auth/logout`   | —                        | Logout (optional — for token revocation)   |

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Success (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

**Error (401) — Invalid credentials:**
```json
{
  "error": "Invalid email or password"
}
```

#### Refresh

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"eyJ..."}'
```

**Success (200):**
```json
{
  "access_token": "eyJ.new-access-token..."
}
```

**Error (401) — Invalid or expired refresh token:**
```json
{
  "error": "Invalid or expired refresh token"
}
```

#### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

**Success (200):**
```json
{
  "message": "Logged out successfully"
}
```

### Todos — `/api/todos`

> **Note**: All todo endpoints require a valid access token. Include it in the `Authorization` header:  
> `Authorization: Bearer <your_access_token>`

| Method | Path         | Body                          | Description                    |
| ------ | ------------ | ----------------------------- | ------------------------------ |
| GET    | `/api/todos` | query: `done`, `limit`, `offset` | List todos (paginated)       |
| GET    | `/api/todos/:id` | —                         | Get one todo                   |
| POST   | `/api/todos` | `{ title, description? }`    | Create a todo                  |
| PATCH  | `/api/todos/:id` | `{ title?, description?, done? }` | Update a todo              |
| DELETE | `/api/todos/:id` | —                         | Delete a todo                  |

All requests are validated with **zod**; invalid input returns `400` with the list of issues.

### Examples

```bash
# Login first to get tokens
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'

# Use the access token for all subsequent requests
export TOKEN="eyJ..."

# Create (authenticated)
curl -X POST http://localhost:3000/api/todos \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Ship the backend","description":"Node + Express + TS + zod + MariaDB"}'

# List (only undone, max 10) — authenticated
curl 'http://localhost:3000/api/todos?done=false&limit=10' \
  -H "Authorization: Bearer $TOKEN"

# Update — authenticated
curl -X PATCH http://localhost:3000/api/todos/1 \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"done":true}'

# Delete — authenticated
curl -X DELETE http://localhost:3000/api/todos/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Example responses

`401` Unauthorized (missing or invalid token):

```json
{
  "error": "Unauthorized",
  "message": "No token provided"
}
```

`400` validation error:

```json
{
  "error": "Validation failed",
  "details": [{ "path": ["title"], "message": "title is required", "code": "too_small" }]
}
```

`201` created:

```json
{
  "id": 1,
  "title": "Ship the backend",
  "description": "Node + Express + TS + zod + MariaDB",
  "done": 0,
  "created_at": "2026-09-18 15:45:00",
  "updated_at": "2026-09-18 15:45:00"
}
```

## Scripts

| Script               | Description                     |
| -------------------- | ------------------------------- |
| `npm run dev`        | Dev server with auto-reload     |
| `npm run build`      | Compile to `dist/`              |
| `npm start`          | Run compiled output             |
| `npm run typecheck`  | Type-check without emitting     |
