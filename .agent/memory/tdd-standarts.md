# .windsurf/memory/tdd-standards.md

## Project Testing Standards

- Framework: Jest (for frontend), Vitest (for backend)
- Test file naming: `*.spec.ts` for unit, `*.e2e.ts` for e2e
- Coverage threshold: 80% statements, 75% branches
- No implementation without tests
- Test naming: "should [expected behavior] when [condition]"

## Common Violations to Watch

- Implementation code in test files
- Tests written after implementation
- Missing edge case tests
- Mocking without proper cleanup
