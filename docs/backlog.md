# Engineering Backlog

This backlog collects cross-cutting or future action items that emerge from reviews and planning.

Routing guidance:

- Use this file for non-urgent optimizations, refactors, or follow-ups that span multiple stories/epics.
- Must-fix items to ship a story belong in that story's `Tasks / Subtasks`.
- Same-epic improvements may also be captured under the epic Tech Spec `Post-Review Follow-ups` section.

| Date | Story | Epic | Type | Severity | Owner | Status | Notes |
| ---- | ----- | ---- | ---- | -------- | ----- | ------ | ----- |
| 2025-11-12 | 15-1 | 15 | Bug | Low | TBD | Open | Fix test assertion bug in postman-collection.service.spec.ts:220, 228 - Tests incorrectly expect validation to fail when warnings are present. Validation logic correctly treats warnings as non-blocking. |
