# Sources and input handling

## Input

- `storyKey` comes from the user's message. Normalize `wipc-10` or `WIPC10`
  to `WIPC-10`. Ask if missing.
- If `docs/lld/<storyKey>-low-level-design.md` does not exist, stop and tell
  the user to run the Requirements Analyst agent first. Never generate tests
  from the story alone.

## Read in this order

1. `docs/lld/<storyKey>-low-level-design.md`, the primary source:
   - section 3: acceptance criteria, FR, NFR
   - sections 5 to 9: data, API, service rules and evaluation order, error
     codes (section 9)
   - section 10: client
   - section 11: security
   - section 12: test design (`T-nn` IDs)
   - section 14: traceability matrix
2. `shop_floor_resource_allocation_requirements.md`: FR, BR, NFR, AC IDs
   cited by the LLD.
3. `.github/copilot-instructions.md`: domain rules and minimum coverage.
4. `docs/high-level-design.md` and LLDs of dependency stories: shared error
   codes, roles, contracts.
5. Existing code and tests under `server/` and `client/`: reuse real names,
   and mark rows `Automated` only when a matching test exists.

## Conflicts

If the LLD contradicts a source, or a rule has no defined expected result,
write a row with `Category` = `Open Question` instead of guessing.

## Hard limits

- Write only `docs/test-spec/<storyKey>-test-spec.csv`. Never modify the
  story, HLD, SRS or LLD.
- Never read `.env` files or secrets; use placeholder test data.
- Never run or modify project code. Only run the read-only scripts of the
  `test-spec-format` skill.
- Never add AI attribution.
