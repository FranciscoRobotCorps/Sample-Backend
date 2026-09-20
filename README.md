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
│   │   └── errors.ts       # error handler (zod / DB / HTTP errors)
│   ├── schemas/
│   │   └── todo.schema.ts  # zod schemas for the todo API
│   └── routes/
│       └── todos.ts        # todos CRUD endpoints
├── .env.example
├── package.json
└── tsconfig.json
```

## Getting started

### 1. Configure environment

```bash
cp .env.example .env
# then edit .env with your MariaDB credentials
```

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

### Todos — `/api/todos`

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
# Create
curl -X POST http://localhost:3000/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"Ship the backend","description":"Node + Express + TS + zod + MariaDB"}'

# List (only undone, max 10)
curl 'http://localhost:3000/api/todos?done=false&limit=10'

# Update
curl -X PATCH http://localhost:3000/api/todos/1 \
  -H 'Content-Type: application/json' \
  -d '{"done":true}'

# Delete
curl -X DELETE http://localhost:3000/api/todos/1
```

### Example responses

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
