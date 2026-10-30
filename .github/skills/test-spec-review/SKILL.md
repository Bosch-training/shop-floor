---
name: test-spec-review
description: 'Review a Shop-Floor CSV test spec against its LLD (the source of truth). Use when asked to review, audit, approve or QA a test spec, check test coverage against an LLD, validate docs/test-spec/<storyKey>-test-spec.csv, fix CSV defects, or write docs/test-spec/<storyKey>-test-spec-review.md for a Jira story such as WIPC-10. Requires both the LLD and the test spec CSV.'
argument-hint: 'Jira story key whose LLD and test spec exist, for example WIPC-10'
---

# Test Spec Review

Verify that the CSV test spec is complete, correct, unambiguous and testable
against the LLD. Fix objective defects and report the rest. Act as a senior
QA reviewer for the Shop-Floor Resource Allocation System.

## Resources

- [review-checklist.md](./references/review-checklist.md): inputs, the seven
  checks, fix policy, verdicts.
- Format contract and scripts from the `test-spec-format` skill: read its
  [SKILL.md](../test-spec-format/SKILL.md) and
  [column guide](../test-spec-format/references/column-guide.md).
- [review-report-template.md](./assets/review-report-template.md): report
  layout.

## Procedure

1. Resolve `storyKey` and confirm the LLD and CSV exist, as in the
   checklist. Stop and name the agent to run first if either is missing.
2. Read the LLD fully.
3. Baseline with the `test-spec-format` scripts (read-only):
   - `validate_test_spec.py docs/test-spec/<storyKey>-test-spec.csv`
   - `coverage_report.py <storyKey>`
4. Walk the seven checks in
   [review-checklist.md](./references/review-checklist.md) and record every
   finding with a severity.
5. Fix objective defects in the CSV following the fix policy. Do not
   renumber existing IDs.
6. Re-run `validate_test_spec.py` and `coverage_report.py` after editing;
   repeat step 5 until validation exits 0.
7. Write `docs/test-spec/<storyKey>-test-spec-review.md` from
   [review-report-template.md](./assets/review-report-template.md): verdict,
   counts, coverage matrix, findings, open questions.
8. Reply with the verdict, findings by severity, rows added, changed and
   removed, and the report path. Keep it brief.

## Rules

- The LLD wins every conflict; never change the LLD, story, HLD or SRS.
- Edit only the CSV and the review report.
- Execute only the read-only scripts; never run, install or modify project
  code.
