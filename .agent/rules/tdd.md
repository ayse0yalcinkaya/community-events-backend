---
trigger: always_on
---

# TDD Guidelines - MUST FOLLOW

## Test-First Approach (MANDATORY)

- ALWAYS write tests before implementation code
- NO implementation code without failing tests first
- Tests must fail initially to prove they test the correct behavior

## Red-Green-Refactor Cycle

1. RED: Write a failing test that defines desired feature
2. GREEN: Write minimum code to pass the test
3. REFACTOR: Improve code while keeping tests passing

## Phase-Specific Guardrails

- During TEST phase: NO implementation logic allowed
- During IMPLEMENTATION phase: Only write code to pass existing tests
- During REFACTOR phase: All tests must remain passing

## Test Requirements

- Use descriptive test names that explain behavior
- Include both happy path and edge cases
- Request test coverage that matches feature criticality
- Use consistent testing patterns across project

## Before ANY Code Generation

1. Confirm test requirements are clear
2. Write failing tests first
3. Verify tests fail for the right reason
4. Only then proceed to implementation
