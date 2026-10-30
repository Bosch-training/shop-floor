# WIPC-10 Test Spec Review

Reviewed: `docs/test-spec/WIPC-10-test-spec.csv` against
`docs/lld/WIPC-10-low-level-design.md` (source of truth). Date: 2026-10-30.

## Verdict

**Approved with changes.** All objective defects were fixed in the CSV. No
blockers remain. One cosmetic ordering issue and several human decisions
remain open (see "Open questions").

CSV validation after edits: UTF-8, no BOM, LF line endings, 16 columns on
every row, 276 rows, unique ascending IDs (gaps at 039 and 135 after
removals), no empty cells, all `Category`, `Test Type`, `Priority` and
`Automation Status` values allowed, every `TC-nnn` cross-reference resolves.

Row changes: 2 added (TC-277, TC-278), 9 changed, 2 removed (TC-039, TC-135).

## Counts

| Category | Rows |
|---|---|
| Positive | 86 |
| Negative | 111 |
| Edge | 69 |
| Open Question | 10 |

| Test type | Rows |
|---|---|
| API | 98 |
| Unit | 62 |
| UI | 40 |
| Integration | 36 |
| Security | 24 |
| NFR | 10 |
| Concurrency | 6 |

| Automation status | Rows |
|---|---|
| Not Automated | 274 |
| Automated | 2 (TC-040, TC-200) |

Priority: P1 141, P2 78, P3 57.

## Coverage matrix

Every row lists test IDs as `TC-` numbers. All LLD-FR, LLD-NFR, story ACs,
SRS IDs, rule codes and section 12 tests T-01 to T-48 are covered. Each
behavioral item has positive, negative and edge coverage where all three
apply. Items with fewer categories are marked.

### Story acceptance criteria

| Item | Tests |
|---|---|
| WIPC10-AC1 | 1, 3-4, 10-12, 14-16, 19, 23, 25-28, 34-37, 41, 68, 71, 82-90, 93-106, 108-115, 117-121, 124-132, 136, 138, 141-143, 145-155, 202-203, 210, 212-214, 217-218, 220, 222, 224-243, 256-257, 259, 261-267, 270-276, 278 |
| WIPC10-AC2 | 1-2, 5-6, 8-9, 13, 17-18, 20-22, 24, 31-33, 38, 40, 42-65, 75-76, 78-81, 107, 133-134, 137, 139-140, 147, 182-184, 193-200, 203-204, 206-209, 211, 215-216, 219, 223, 244-255, 258, 260 |
| WIPC10-AC3 | 7, 80, 144, 147, 173-182, 185-192, 201, 205, 268 |
| WIPC10-AC4 | 7, 66-67, 69-70, 72-75, 77, 80-81, 114, 123, 127, 147, 156-172, 221, 277 |
| WIPC10-AC5 | 19, 29-30, 32, 51, 91-92, 116, 122, 147, 163, 183, 263, 269 |

### Functional requirements

| LLD item | Tests |
|---|---|
| LLD-FR-01 User model | 261-276 (and refs 23, 26) |
| LLD-FR-02 passwordService | 148-155 |
| LLD-FR-03 login 200 | 23, 26, 82-83, 114-115 |
| LLD-FR-04 me | 130-131, 136, 138 |
| LLD-FR-05 authenticate | 24, 31-33, 38, 42-54, 57, 60-65, 133-134, 182-183, 194, 216, 219, 244-245, 247, 250-255 |
| LLD-FR-06 public routes and default protection | 40-41, 55-56, 58-59, 107, 113, 137, 193, 195-196, 198-200, 215 |
| LLD-FR-07 requireRole | 173-182, 184-192 |
| LLD-FR-08 rate limit | 114, 156-163, 165-172, 221, 277 |
| LLD-FR-09 inactive user | 29-30, 32, 51, 91-92, 116, 183 |
| LLD-FR-10 generic credential error | 27-28, 30, 34, 89-90, 92, 111, 217, 222 |
| LLD-FR-11 no hash, no log, no-store | 25, 35, 37, 80, 84, 132, 155, 164, 212-213, 218, 265 |
| LLD-FR-12 input validation | 85, 93-106, 108-112, 277 |
| LLD-FR-13 ValidationError 401/429 | 75-78, 81, 196 |
| LLD-FR-14 seed | 224-240 |
| LLD-FR-15 config | 66-70, 72-74, 160, 165, 243 |
| LLD-FR-16 login page | 3, 117-129, 203, 278 |
| LLD-FR-17 auth context, token storage | 4, 12, 14-22, 214, 256-260 |
| LLD-FR-18 route guard | 21, 197, 201-211 |
| LLD-FR-19 apiClient | 1-2, 4-8, 17, 197, 208 |
| LLD-FR-20 header and logout | 10-13, 211, 220, 223 |

### Non-functional requirements

| LLD item | Tests |
|---|---|
| LLD-NFR-01 server-side enforcement | 56, 144, 176, 187, 189-190, 215 |
| LLD-NFR-02 bcrypt, HS256, expiry | 49-50, 60, 71-72, 86-88, 141, 148, 151, 216, 241-243, 246, 248, 251-252, 255 |
| LLD-NFR-03 minimal data | 9, 35, 87, 128, 212-213, 241 |
| LLD-NFR-04 input and injection | 33, 53, 97, 99, 101-102, 249, 272, 275 |
| LLD-NFR-05 brute force | 28, 34, 90, 162, 167, 217, 221-222 |
| LLD-NFR-06 error contract | 57, 76-77, 79-80, 105, 126, 164, 219 |
| LLD-NFR-07 layering | 129, 143-144 (static checks, Positive and Edge only) |
| LLD-NFR-08 index and latency | 64, 139-140, 266 |
| LLD-NFR-09 UTC | 36, 86, 142 |
| LLD-NFR-10 no credentials in code | 68, 71, 145, 229, 239 |
| LLD-NFR-11 test coverage | 147, 159 (meta) |
| LLD-NFR-12 style | 146 (meta) |

### SRS IDs

| SRS ID | Tests (summary) |
|---|---|
| NFR-02 | 64, 139-141, 266 |
| NFR-04 | 223 rows (all auth rows) |
| NFR-06 | 33, 48, 53, 93-106, 108-110, 112, 124-125, 129, 234, 249, 267, 271-275, 277 |
| NFR-08 | 129, 143-144, 146-147, 196-197 |
| NFR-10 | 9, 25, 35, 37, 68-71, 73, 80, 84, 87, 128, 130, 132, 145, 155, 164, 212-214, 218, 220, 227, 229-230, 233, 236, 239, 241, 264-265 |
| BR-11 | 36, 86, 142 |
| AC-09 | 173, 176-178, 180-181, 187, 189-191, 205 |
| FR-13 | 42, 75-81, 121-124, 126, 157, 171, 177, 192 |

### Rule codes (section 9) and endpoints

| Item | Tests |
|---|---|
| `UNAUTHENTICATED` | 2, 8, 31-33, 42-57, 60-63, 76, 107, 133-134, 137, 168, 182-184, 215-216, 244-252, 254 |
| `INVALID_CREDENTIALS` | 6, 19, 27-28, 30, 34, 89-90, 92, 108-109, 111, 116, 121, 156, 159, 165 |
| `ACCOUNT_INACTIVE` | 29-30, 91, 116 (122 on the UI) |
| `FORBIDDEN` | 176-180, 187, 189-191 |
| `RATE_LIMITED` | 77, 123, 157, 161-162, 165, 277 |
| `INVALID_INPUT` | 93-106, 108-110, 112, 124, 277 |
| `INTERNAL_ERROR` | 79, 126, 218 |
| `NOT_FOUND` | 55, 58-59, 137, 199 |
| `POST /api/auth/login` | 41, 82-115, 156-170, 277 |
| `GET /api/auth/me` | 130-134, 136-138 |
| Unknown and unauthenticated `/api` paths | 55-56, 58-59, 215 |

### Section 12 design tests

T-01 to T-48 each map to at least one row (T-01: 148-149, 152; T-02: 87,
241; T-03: 49-50, 244-247; T-04: 261, 264, 267-270; T-05: 25, 212, 265;
T-06 to T-08: 82, 37, 84, 130, 212; T-09: 89-90; T-10: 28; T-11/T-12: 29-30,
91-92; T-13 to T-15: 42-48, 133-134; T-16/T-17: 31-32, 51-52; T-18: 176;
T-19: 40-41, 55, 58, 193, 199; T-20 to T-23: 173-177, 180-181, 184-186;
T-24 to T-27: 156-159, 161; T-28/T-29: 93-100; T-30: 53, 249; T-31/T-32:
75-78; T-33: 213; T-34: 66-70; T-35 to T-37: 224-225, 229-231, 236-237;
T-38: 147, 193, 196, 199-200; T-39: 256-258; T-40/T-41: 1-2, 5-6, 208;
T-42/T-43: 117, 121-123; T-44: 14, 18; T-45: 201, 204-205; T-46: 10, 12;
T-47: 147, 197; T-48: 146).

### Domain rules from `.github/copilot-instructions.md`

| Rule | Status |
|---|---|
| Roles enforced in middleware | Covered (173-192, 215) |
| No secrets in code, `.env` not read | Covered (68, 145) |
| Hashed passwords, no personal data in logs | Covered (148-155, 213) |
| NoSQL operator injection | Covered (99-102, 249, 272, 275) |
| Error contract with rule, message, fix | Covered (42, 76-77, 89, 91, 157, 177) |
| Overlap, skill, material, atomic rollback, concurrency on allocations, audit, cancellation | Not touched by this LLD (LLD section 7.4); no tests expected |
| Concurrency (login, seed, user create, parallel auth) | Covered (64, 114, 167, 191, 238, 276) |

### Gaps

No uncovered LLD item remains. Gap found and closed: limiter-before-validation
order (section 7.2), now TC-277.

## Findings

| ID | Severity | Test ID | Finding | Action taken |
|---|---|---|---|---|
| F-01 | Major | TC-061 | Sent `Bearer <T1> ` with a trailing space through Supertest. The HTTP layer strips trailing whitespace, so the request would be accepted (200) and the expected 401 could never be observed. | Changed `Test Type` to Unit, mock `req.get('authorization')` returns the padded value, expected: `authenticate` throws 401 `UNAUTHENTICATED`. |
| F-02 | Major | (new) | LLD 7.2 puts `loginRateLimiter` before `validateRequest`. No test proved that a limited source gets 429 and not 400 for an invalid body. | Added TC-277. |
| F-03 | Major | TC-193 | `Automation Status` was `Automated`, but the existing `healthRoutes.test.js` has no stale-token case. | Set to `Not Automated`. |
| F-04 | Minor | TC-040 | Matched the existing health test (T-01, no credentials) but was `Not Automated`. | Set to `Automated`. |
| F-05 | Minor | TC-039 | Duplicate of TC-131 (`/me` for each role). | Removed. |
| F-06 | Minor | TC-135 | Duplicate of TC-051 (deactivate after login, call `/me`, expect 401). | Removed. |
| F-07 | Minor | (new) | LLD OQ-14 (clear password after failure) changes behavior asserted by TC-121, TC-123 and TC-124, but had no `Open Question` row. | Added TC-278. |
| F-08 | Minor | TC-106 | Expected message `The request body is too large.` exists only in the implemented WIPC-9 `errorHandler`, not in either LLD. | Kept the row; expected result now states that the message comes from code and the LLDs define only the 100 kb limit; `LLD Refs` corrected. See open question OQ-A. |
| F-09 | Minor | TC-110 | Precondition said "user a1 ... userId 'a'". | Reworded to "user with the one-character userId 'a'". |
| F-10 | Minor | TC-117 | Test data used a button label `Sign in` that the LLD does not define. | Changed to "the submit button". |
| F-11 | Minor | TC-125 | Expected result "shows its required-field message" is not observable (the LLD names no message). | Now: login not called, no request sent, page stays on `/login`. |
| F-12 | Minor | TC-212 | Test data did not say how to reach the 429 response with limit 4. | Added the extra failed login and the final request to the test data. |
| F-13 | Minor | TC-236 | Expected "names the failing variables only" depends on a seed Zod schema the LLD does not define beyond the 12-character password. | Reworded to "no variable value in the output (variable names only)". |
| F-14 | Minor | TC-142, TC-145 | Category order inside the `NFR` module breaks the author rule "sort by Module, then Category": TC-142 (Edge) precedes TC-143 and TC-144 (Positive); TC-145 (Negative) precedes TC-146 and TC-147 (Positive). | **Not fixed.** Ordering is a presentation convention, not a review-checklist rule. Fixing it needs renumbering, which this review forbids (IDs must stay stable and ascending). Rows are valid as they are. The two rows added by this review (TC-277, TC-278) are also at the end because of the ascending-ID rule. Author may re-sort on the next regeneration. |
| F-15 | Info | TC-188 | The LLD pseudocode checks roles with `r in ROLES`; `'toString' in ROLES` is true for a plain object, so the pseudocode would accept it. The test follows the LLD rule (unknown role gives `TypeError`) and will expose the bug. | No change. LLD author should use `Object.hasOwn(ROLES, r)` or a `Set`. |
| F-16 | Info | TC-056, TC-038, TC-195 | LLD OQ-13 mounts `extend` routes before `/api`, so test routes bypass authentication. Tests that expect 401 or `req.user` need the test route to apply `authenticate` explicitly. | No change. Implementer note. |
| F-17 | Info | TC-047, TC-244 | Same title on two layers (API and unit). Different layers and targets. | No change. |

### Testability notes (no CSV change)

| Tests | Issue | Isolation |
|---|---|---|
| TC-140, TC-141, TC-222 | Wall-clock timing is flaky. | Run in a separate non-blocking performance suite, or replace with deterministic checks (TC-139 explain plan, TC-028 spy on `verifyPassword`). |
| TC-060, TC-160, TC-166, TC-252 | Fake timers with Supertest, `jsonwebtoken` and the in-memory rate-limit store. | Mock `Date.now` (modern fake timers) and use the minimum window 1000 ms where a real timer is needed. |
| TC-233 | Needs an unreachable database. | Pass an invalid URI to the script; no network. |
| TC-068, TC-143, TC-144, TC-145, TC-146, TC-147 | Static and CI checks, not Jest behavior tests. | Run as lint or script checks. |
| Integration rows (User model, seed) | Need MongoDB. | Use the in-memory replica set from `server/tests/helpers/testDb.js`. |

## Open questions needing a human decision

| ID | Question | Rows |
|---|---|---|
| OQ-A | The 100 kb body limit response (`400 INVALID_INPUT`, message `The request body is too large.`) is implemented in WIPC-9 code but not in the WIPC-9 or WIPC-10 LLD. Add it to the LLD or accept it as code-defined. | TC-106 |
| OQ-B | LLD OQ-03 and OQ-04: HLD must add statuses 401 and 429 and the four new rule codes. | TC-081 |
| OQ-C | LLD OQ-06: disclose `ACCOUNT_INACTIVE` after a correct password, or return `INVALID_CREDENTIALS`. | TC-116 |
| OQ-D | LLD OQ-05: no revocation or logout endpoint; token stays valid until expiry. | TC-223 |
| OQ-E | LLD OQ-02: `trust proxy` setting and shared store are undefined. | TC-172 |
| OQ-F | LLD OQ-08: maximum length of the seed password (login accepts at most 72 bytes). | TC-240 |
| OQ-G | LLD OQ-14: clear the password field after a credential failure. | TC-278 |
| OQ-H | Case sensitivity of the `Bearer` scheme (pseudocode is case-sensitive, RFC 7235 is not). | TC-065 |
| OQ-I | Singular and non-whole-minute wording for `{minutes}` in `RATE_LIMITED`; separator and labels for `{allowedRoles}` in `FORBIDDEN`. | TC-171, TC-192 |
| OQ-J | Accept a token without `exp`, or require one. | TC-255 |
| OQ-K | `requireRole` role check must reject prototype names such as `toString` (LLD pseudocode `in` operator). | TC-188 |
