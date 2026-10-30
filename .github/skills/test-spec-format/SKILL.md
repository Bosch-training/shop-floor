---
name: test-spec-format
description: 'Shared CSV contract, JSON schema, template and validation scripts for Shop-Floor test specs (docs/test-spec/<storyKey>-test-spec.csv). Use when validating a test spec CSV, checking RFC 4180 or column format, generating an LLD to test coverage matrix, counting tests by category, or looking up the 16 test spec columns. Loaded by the test-spec-author and test-spec-review skills.'
user-invocable: false
---

# Test Spec Format

Single source for the test spec file format used by `test-spec-author` and
`test-spec-review`. All scripts are read-only, use only the Python standard
library, and never touch project code.

## Contents

| Resource | Purpose |
|----------|---------|
| [test-spec-row.schema.json](./schema/test-spec-row.schema.json) | Columns, order, enums, patterns |
| [column-guide.md](./references/column-guide.md) | Column meaning, file rules, layer to Test Type |
| [test-spec-template.csv](./assets/test-spec-template.csv) | Header and two well-formed example rows |
| [validate_test_spec.py](./scripts/validate_test_spec.py) | Format and schema validation |
| [coverage_report.py](./scripts/coverage_report.py) | LLD item to test ID matrix and counts |

## Procedure

1. Read [column-guide.md](./references/column-guide.md) before writing or
   judging rows; copy the header from the template.
2. Validate after every write:
   `python3 .github/skills/test-spec-format/scripts/validate_test_spec.py docs/test-spec/<storyKey>-test-spec.csv`
   Exit 0 is valid (warnings allowed), 1 means fix the listed errors, then
   re-run. Add `--json` for machine output.
3. Check coverage:
   `python3 .github/skills/test-spec-format/scripts/coverage_report.py <storyKey>`
   Run from the repo root (or pass `--root`). It lists story ACs, LLD-FR,
   LLD-NFR, error codes and LLD test IDs with the rows that cite them.
   Exit 1 means at least one required item has no test.

## Notes

- The coverage script matches IDs by text. A `GAP` is a strong signal, not
  proof: confirm in the LLD before adding rows.
- `single category` means only one of Positive, Negative, Edge covers the
  item; add the missing categories where they apply.
- SRS IDs and sub-tasks are informational (`not cited (info)`).
