---
name: test-spec-author
description: 'Generate an exhaustive CSV test specification from a finished LLD for the Shop-Floor Resource Allocation System. Use when asked to write a test spec, create test cases, derive positive, negative and edge cases from docs/lld/<storyKey>-low-level-design.md, or produce docs/test-spec/<storyKey>-test-spec.csv for a Jira story such as WIPC-10. Requires the LLD to exist.'
argument-hint: 'Jira story key whose LLD exists, for example WIPC-10'
---

# Test Spec Author

Turn one finished LLD into a traceable, exhaustive test spec CSV. Act as a
senior QA engineer for the Shop-Floor Resource Allocation System (React,
Node.js, MongoDB).

## Resources

- [sources.md](./references/sources.md): input handling, read order, hard
  limits.
- [coverage-rules.md](./references/coverage-rules.md): what to cover per
  category and the minimum coverage.
- Format contract (columns, schema, template, scripts) from the
  `test-spec-format` skill: read its
  [SKILL.md](../test-spec-format/SKILL.md) and
  [column guide](../test-spec-format/references/column-guide.md).
- [author-reply-template.md](./assets/author-reply-template.md): final reply.

## Procedure

1. Resolve `storyKey` and check the LLD exists, as in
   [sources.md](./references/sources.md). Stop if it is missing.
2. Read the sources in the order given there. List every story AC, LLD-FR,
   LLD-NFR, SRS ID, rule, endpoint, error code and UI behavior in a todo
   list.
3. Derive tests per item with [coverage-rules.md](./references/coverage-rules.md),
   using equivalence partitioning and boundary value analysis on every input
   field and time window.
4. Search existing tests in `server/` and `client/`; set `Automation Status`
   to `Automated` only for matches.
5. Write `docs/test-spec/<storyKey>-test-spec.csv` (create the folder if
   missing), starting from the template header, sorted by Module, then
   Category (Positive, Negative, Edge). If the file exists, regenerate it and
   keep IDs of tests that still apply stable.
6. Validate: run `validate_test_spec.py` from `test-spec-format`; fix every
   error and re-run until exit 0.
7. Check coverage: run `coverage_report.py <storyKey>`; add rows for every
   `GAP` and for `single category` items where the missing categories apply.
   Re-validate.
8. Verify before finishing:
   - Every endpoint has role-permission, validation and success tests.
   - Every row has all 16 columns, a unique `Test ID` and a specific
     expected result; no placeholder text.
   - The minimum list from `.github/copilot-instructions.md` is addressed.
9. Reply using [author-reply-template.md](./assets/author-reply-template.md).
   Keep it brief.

## Rules

- Do not invent requirements or error codes; use only LLD section 9.
- Unclear behavior becomes an `Open Question` row, never a guess.
- Do not modify the story, HLD, SRS or LLD; write only the CSV.
