# Coverage rules

For every LLD functional requirement, acceptance criterion, validation rule,
endpoint, error code, and UI behavior, create tests in all three categories
where applicable.

## Positive

Valid input and happy paths, each allowed role, each valid status
transition, each success response.

## Negative

- Every validation rule failing individually and every error code.
- Missing or malformed fields, wrong types, unknown IDs, malformed IDs.
- Inactive resources, skill or capability mismatch, material shortage.
- Forbidden status transitions, unauthenticated requests, wrong role.
- NoSQL operator injection payloads.
- Rollback after a failed step (no partial assignments, reservations, or
  audit rows).

## Edge

- Time windows: adjacent (`end == start` allowed), one-millisecond overlap,
  identical, containing, contained, zero-length, reversed.
- Quantities: exactly equal to stock, one above stock, zero, negative,
  fractional.
- Strings: maximum field lengths, empty, whitespace only.
- Daylight saving or time zone boundaries against the plant time zone.
- Concurrent requests, version-guard conflicts, idempotent retries.
- Empty lists, large lists, pagination limits.

## Include whenever the LLD touches them

- Role permission matrix (Supervisor, Operator, Administrator) for every
  endpoint, checked on the server.
- Audit completeness (actor, action, workOrderId, before, after, timestamp,
  reason) and append-only behavior.
- Cancellation and status rules (Blocked cannot move to In Progress;
  Completed or Cancelled accept no new allocations).
- Concurrency and race conditions on the same operator, machine, or
  material.
- Security (OWASP Top 10): injection, broken access control, sensitive data
  in logs or responses.
- Client behavior: loading, empty, error display of server rule codes, form
  validation messages (UI only displays; rules stay on the server).
- Non-functional checks the LLD defines (performance targets, indexes,
  configuration via environment variables).

## Minimum coverage

Every story acceptance criterion, LLD-FR, and LLD-NFR needs at least one
test. Every SRS `AC-xx` on the story needs at least one positive and one
negative or edge test where meaningful.

`.github/copilot-instructions.md` minimum list, where the story touches
them: skill/capability checks, overlapping, adjacent and invalid time
windows, material shortage, rollback, role permissions, audit completeness,
concurrent allocation, cancellation.

## Expected result quality

Observable and specific: HTTP status, error rule code, message content,
persisted state, audit event, or UI text. Use only rule codes, messages and
status codes from LLD section 9. Test data is realistic and deterministic,
with ISO 8601 UTC timestamps such as `2026-01-05T09:00:00Z`.
