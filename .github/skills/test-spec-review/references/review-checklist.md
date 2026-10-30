# Review checklist

The LLD is the single source of truth and wins every conflict. Record each
finding with a severity: `Blocker` (wrong or missing core coverage),
`Major`, `Minor`.

## Inputs

- `storyKey`: normalize `wipc-9` or `WIPC9` to `WIPC-9`. Ask if missing.
- Required: `docs/lld/<storyKey>-low-level-design.md` and
  `docs/test-spec/<storyKey>-test-spec.csv`. If either is missing, stop and
  name the agent to run first (Requirements Analyst or Test Spec Author).

## 1. CSV validity

Run `validate_test_spec.py`. It covers UTF-8, RFC 4180, the 16 columns in
order, equal column count, unique ascending `Test ID`, no empty cells, and
allowed values for `Category`, `Test Type`, `Priority`, `Automation Status`.
Gaps in IDs are allowed after removals.

## 2. Coverage against the LLD

Run `coverage_report.py` for the baseline, then build the full matrix of
every story AC (`<key>-ACn`), LLD-FR, LLD-NFR, SRS ID, endpoint, validation
rule, error code (section 9), function in section 7.1 and UI behavior in
section 10. Flag any item with no test, or with one category when positive,
negative and edge all apply.

## 3. Correctness

Every `Expected Result` matches the LLD exactly: HTTP status, rule code,
message and fix templates, field names, defaults, limits, order of
validation in section 7.2. Flag wrong, invented or contradicting
expectations and wrong `Story AC`, `SRS Refs`, `LLD Refs`.

## 4. Quality

- One behavior per test; reproducible steps.
- Concrete, deterministic test data.
- Observable expected results (no "works correctly").
- No duplicates or near-duplicates.
- Sensible priority (core rule and security are P1).

## 5. Testability

`Test Type` and `Automation Target` suit the layer: service rules Unit,
routes API, components UI, database behavior Integration. Flag tests that
cannot run without a real database, network, clock or file system and say
how to isolate them.

## 6. Domain rules

From `.github/copilot-instructions.md`, where the LLD touches them: overlap
formula, adjacent windows, active resources, skill and capability, negative
stock, atomic rollback, roles, audit, concurrency, cancellation. Flag any
rule the LLD covers but the CSV omits.

## 7. Open questions

Each LLD open question that affects behavior has an `Open Question` row.
Rows are not silently turned into guesses.

## Fix policy

Fix objective defects directly in the CSV:

- formatting, wrong IDs or references
- expected results that contradict the LLD
- missing rows for uncovered LLD items (append with the next free
  `Test ID`)
- duplicates (remove; keep the other IDs stable)

Never renumber existing IDs. Never change the LLD, story, HLD or SRS.
Do not invent requirements, rule codes, messages or status codes; unclear
behavior becomes an `Open Question` row. Do not read `.env` files, and add
no AI attribution.

## Verdicts

- `Approved`: no findings that need change.
- `Approved with changes`: all findings fixed.
- `Rejected`: blockers remain; send back to the Test Spec Author.
