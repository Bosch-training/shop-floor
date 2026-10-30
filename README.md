# Shop-Floor Resource Allocation System

Web app for manufacturing supervisors to allocate operators, machines and
materials to work orders, detect conflicts and reassign resources.
Requirements: `shop_floor_resource_allocation_requirements.md`.

Stack: React (Vite) client, Node.js (Express 5) API, MongoDB replica set.

## Prerequisites

- Node.js 20 or newer
- Docker (for the local MongoDB replica set)

## Setup

```bash
cp .env.example .env      # then set JWT_SECRET to a long random value
docker compose up -d      # single-node replica set `rs0` on port 27017
npm install
```

Environment variables (see `.env.example`): `NODE_ENV`, `PORT`,
`MONGODB_URI`, `JWT_SECRET` (min 32 characters), `JWT_EXPIRES_IN`,
`PLANT_TIME_ZONE` (IANA zone name), `LOGIN_RATE_LIMIT_MAX` (default 5) and
`LOGIN_RATE_LIMIT_WINDOW_MS` (default 900000). Never commit `.env`.

## Authentication setup

Create the first Administrator once, after setting the seed variables in
`.env` (`ADMIN_USER_ID`, `ADMIN_NAME`, `ADMIN_PASSWORD`, at least 12
characters):

```bash
npm run seed:admin -w server
```

The script is idempotent: it does nothing when an administrator already
exists, never resets a password and never prints the password. Remove
`ADMIN_PASSWORD` from `.env` afterwards. Roles: `supervisor`, `operator`,
`administrator`.

Login rate limiting counts failed attempts per client IP (5 per 15 minutes
by default). Behind a reverse proxy, configure Express `trust proxy`
so the limiter sees the real client IP; otherwise all users share one
counter.

## Run

```bash
npm run dev    # API on :3000 and client on :5173 (proxies /api)
```

Check the API: `curl http://localhost:3000/api/health`

## Test and lint

```bash
npm test          # server (Jest, in-memory replica set) and client (Vitest)
npm run lint
npm run format    # Prettier
```

The first server test run downloads a MongoDB binary for
`mongodb-memory-server`. Set `MONGOMS_VERSION` to pin another version.

## Layout

```
client/src/{components,pages,services}   React app
server/src/{routes,controllers,services,models,middleware,errors,config}
server/tests/                            Integration tests and helpers
docs/                                    HLD, stories and LLDs
```

## API

| Method | Path              | Auth   | Description                      |
| ------ | ----------------- | ------ | -------------------------------- |
| GET    | `/api/health`     | Public | Liveness check                   |
| POST   | `/api/auth/login` | Public | Exchange `{ userId, password }`  |
|        |                   |        | for a JWT and the public user    |
| GET    | `/api/auth/me`    | Bearer | Current user (no `passwordHash`) |

Every other `/api` route requires `Authorization: Bearer <token>` and
returns 401 `UNAUTHENTICATED` without it. Role checks use the
`requireRole(...roles)` middleware and return 403 `FORBIDDEN`. Login
responses: 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_INACTIVE`, 429
`RATE_LIMITED` (with `Retry-After`).

All errors use one contract:

```json
{
  "error": "ValidationError",
  "failures": [
    { "rule": "RULE_CODE", "message": "...", "fix": "...", "details": {} }
  ]
}
```

Statuses: 400, 401, 403, 404, 409, 422, 429 (`ValidationError`) and 500
(`InternalError`).

## Known limitations

- The token is a bearer token kept in `sessionStorage`; there is no
  refresh token, logout endpoint or revocation. A stolen token works until it
  expires or the user is deactivated (OQ-05).
- The rate limiter uses an in-memory store: per process, reset on restart.
- No password change or reset, account lockout, helmet or CORS yet.
- `ACCOUNT_INACTIVE` is disclosed after a correct password (OQ-06).
- Health is liveness only; it does not check the database.
- The docker replica set uses `localhost:27017`, so it suits host-run apps.
- See `docs/lld/WIPC-9-low-level-design.md` and
  `docs/lld/WIPC-10-low-level-design.md` section 15 for open questions.
# shop-floor
