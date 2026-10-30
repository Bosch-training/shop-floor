# Test spec column guide

Machine-readable rules live in
[test-spec-row.schema.json](../schema/test-spec-row.schema.json). This guide
explains intent.

## File rules

- Path: `docs/test-spec/<storyKey>-test-spec.csv`.
- UTF-8, no BOM, `\n` line endings, comma separator, header row first, one
  test per row.
- RFC 4180: wrap every field in double quotes; escape an inner `"` as `""`.
- Inside a cell, number steps as `1. ...` separated by a newline; separate
  multiple IDs with `; `.

## Columns

| Column | Content |
|--------|---------|
| `Test ID` | `<storyKey>-TC-001`, sequential, zero-padded to 3 digits |
| `Story Key` | Jira key, for example `WIPC-10` |
| `Module` | Feature area, for example `Allocation`, `Audit`, `Auth` |
| `Category` | `Positive`, `Negative`, `Edge`, or `Open Question` |
| `Test Type` | `Unit`, `API`, `Integration`, `Concurrency`, `Security`, `UI`, `NFR` |
| `Title` | Short, starts with a verb, names the rule or scenario |
| `Preconditions` | Required state and seed data |
| `Test Data` | Exact inputs, payloads, IDs, timestamps |
| `Steps` | Numbered actions |
| `Expected Result` | Specific, observable outcome including status code and rule code |
| `Priority` | `P1` (blocker or core rule, security), `P2`, `P3` |
| `Story AC` | For example `WIPC10-AC1` |
| `SRS Refs` | FR, BR, NFR, AC IDs, for example `FR-06; BR-05; AC-02` |
| `LLD Refs` | `LLD-FR-xx`, `LLD-NFR-xx`, LLD test IDs (`T-nn`) and LLD section |
| `Automation Target` | Suggested test file and layer, for example `server/src/services/allocationValidation.test.js` |
| `Automation Status` | `Not Automated`, or `Automated` if a matching test already exists |

## Layer to Test Type

| Subject | Test Type |
|---------|-----------|
| Service rules, pure functions | `Unit` |
| Routes, status codes, contracts | `API` |
| Database behavior, transactions | `Integration` |
| Parallel requests, version guards | `Concurrency` |
| Injection, access control, data leaks | `Security` |
| React components, forms, guards | `UI` |
| Performance, indexes, configuration | `NFR` |

## Open Question rows

Use `Category` = `Open Question` when the LLD contradicts a source or defines
no expected result. Put the question in `Title`, the competing readings in
`Expected Result`, and keep `Automation Status` = `Not Automated`. Never turn
an open question into a guessed expectation.

## Example

See [test-spec-template.csv](../assets/test-spec-template.csv).
