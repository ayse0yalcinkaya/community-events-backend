---
description: # TDD Feature Development Workflow
---

# TDD Feature Development Workflow

## Description

Enforces strict TDD cycle for new features

## Steps

### Step 1: Requirement Analysis

- Review feature requirements
- Break down into testable units
- Define acceptance criteria
- **STOP**: Get human approval before proceeding

### Step 2: Write Failing Tests

- Write unit tests for each requirement
- Ensure tests FAIL initially
- Verify failure messages are clear
- Run tests to confirm they fail
- **STOP**: Review tests before implementation

### Step 3: Minimal Implementation

- Write ONLY enough code to pass tests
- No extra features or "nice to haves"
- Keep implementation simple
- **STOP**: Review implementation

### Step 4: Verify Green

- Run all tests
- Ensure all tests pass
- Fix any failures
- **STOP**: Confirm all green

### Step 5: Refactor

- Improve code quality
- Remove duplication
- Enhance readability
- Ensure tests still pass

### Step 6: Final Validation

- Run full test suite
- Check code coverage
- Review for edge cases
- Document any assumptions

```

Workflow'u çalıştırmak için Cascade'de:
```

/tdd-feature
