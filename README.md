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
`PLANT_TIME_ZONE` (IANA zone name). Never commit `.env`.

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

| Method | Path          | Auth   | Description    |
| ------ | ------------- | ------ | -------------- |
| GET    | `/api/health` | Public | Liveness check |

All errors use one contract:

```json
{
  "error": "ValidationError",
  "failures": [
    { "rule": "RULE_CODE", "message": "...", "fix": "...", "details": {} }
  ]
}
```

Statuses: 400, 403, 404, 409, 422 (`ValidationError`) and 500
(`InternalError`).

## Known limitations

- No authentication yet (S-02); `/api/health` is public.
- Health is liveness only; it does not check the database.
- The docker replica set uses `localhost:27017`, so it suits host-run apps.
- See `docs/lld/WIPC-9-low-level-design.md` section 15 for open questions.
# shop-floor
