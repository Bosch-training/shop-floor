# Shop-Floor Resource Allocation System

## Project description

Web app for manufacturing supervisors to allocate operators, machines, and
materials to work orders, detect conflicts, and reassign resources to reduce
idle time. The MVP is manual allocation with server-side validation; automatic
optimization is out of scope.

Requirements source of truth: `shop_floor_resource_allocation_requirements.md`
(FR-01..FR-13, BR-01..BR-12, NFR-01..NFR-10, AC-01..AC-12). Reference these IDs
in code comments, tests, and commit messages where relevant.

Out of scope for MVP: AI scheduling, telemetry, ERP/MES integration, payroll,
purchasing, auto-replenishment, multi-factory, mobile/offline.

## Tech stack

- Frontend: React
- Backend: Node.js (REST API)
- Database: MongoDB

## Folder structure

```
client/            React app
  src/components/  PascalCase component files
  src/pages/
  src/services/    API calls
server/            Node.js API
  src/routes/
  src/controllers/
  src/services/    Business logic and validation rules
  src/models/      MongoDB schemas
  src/middleware/  Auth, role checks, error handling
tests/             Or colocated *.test.js files
```

## Domain rules (must be enforced on the server)

- Roles: Manufacturing Supervisor (create/change/release allocations),
  Shop-Floor Operator (read-only, own assignments), Administrator (master
  data, users). Enforce in API middleware, not only in the UI.
- Operators and machines cannot have overlapping active allocations. Windows
  overlap when `startA < endB && endA > startB`. Back-to-back (end == start)
  is allowed.
- Only active resources can be allocated. Operator skill and machine
  capability must match the work-order requirement.
- Material reservations must never make available stock negative.
- Work-order `plannedEnd` must be after `plannedStart`. Use the single
  configured plant time zone; store timestamps in UTC.
- Allocation create/update/release must be atomic: use MongoDB transactions
  so a failed change leaves no partial assignments or reservations.
- Prevent race conditions on concurrent allocations (transaction plus
  conflict re-check or unique/version guard).
- A Blocked work order cannot move to In Progress. Completed or Cancelled
  work orders accept no new allocations. Cancelling releases active
  allocations but keeps audit history.
- Every allocation create/update/release writes an audit event (actor,
  action, workOrderId, before, after, timestamp, reason). Audit entries are
  append-only.
- Validation errors must name the failed rule and what to fix (for example
  available vs required material quantity). Never silently discard changes.
- Keep all validation rules in one shared service layer; do not duplicate
  them in controllers or the client.
- Work-order statuses: Draft, Ready, In Progress, Blocked, Completed,
  Cancelled.

## Testing framework

- Backend: Jest with Supertest for API tests.
- Frontend: Jest (or Vitest) with React Testing Library.
- Cover at minimum: skill/capability checks, overlapping, adjacent and invalid
  time windows, material shortage, rollback on failed update, role
  permissions, audit completeness, concurrent allocation, cancellation.
- Add a test for each acceptance criterion (AC-01..AC-12) when implementing it.

### Unit test example

Name tests after the rule or AC they cover. Test the service layer directly;
use Supertest only for route-level checks.

```js
// server/src/services/allocationValidation.test.js
const { hasOverlap } = require('./allocationValidation');

const at = (time) => new Date(`2026-01-05T${time}:00Z`);

describe('hasOverlap (BR-05, FR-06)', () => {
  it('detects a partial overlap (AC-02)', () => {
    const a = { start: at('09:00'), end: at('11:00') };
    const b = { start: at('10:00'), end: at('12:00') };

    expect(hasOverlap(a, b)).toBe(true);
  });

  it('allows back-to-back windows (AC-03)', () => {
    const a = { start: at('09:00'), end: at('10:00') };
    const b = { start: at('10:00'), end: at('11:00') };

    expect(hasOverlap(a, b)).toBe(false);
  });

  it('is symmetric', () => {
    const a = { start: at('09:00'), end: at('11:00') };
    const b = { start: at('10:00'), end: at('12:00') };

    expect(hasOverlap(b, a)).toBe(hasOverlap(a, b));
  });
});
```

## Deployment instructions

- Configuration through environment variables (DB URI, JWT secret, plant time
  zone, port). Provide a `.env.example` with placeholder values only.
- Run tests and lint before merging; do not deploy with failing tests.

## Coding standards

- Use camelCase for variable, function, and MongoDB field names
  (for example `workOrderId`, `plannedStart`).
- Use PascalCase for React component names and component files.
- Use 2 spaces for indentation.
- End all statements with a semicolon.
- Use single quotes for strings.
- Keep lines under 80 characters.
- Prefer `async`/`await`; handle errors through central error middleware.
- Validate all input on the server (IDs, quantities, time windows).
- Write meaningful commit messages (imperative mood, reference the FR/BR/AC
  ID when relevant). Do not add AI attribution trailers.

## Source documentation

- Keep `README.md` current with setup, run, and test instructions.
- Document API endpoints and known limitations or unresolved stakeholder
  questions (see section 14 of the requirements).
- Comments only for non-obvious intent, such as a business rule ID.

## Sensitive information handling

- Never read, print, or commit `.env` files or secrets; only `.env.example`.
- Never hard-code credentials, tokens, or connection strings.
- Hash passwords, authenticate every API route, and avoid logging
  personal data. Store only user data needed for authentication,
  authorization, and audit (NFR-10).
- Guard against OWASP Top 10 issues: sanitize inputs, use schema-validated
  queries, and prevent NoSQL operator injection.
