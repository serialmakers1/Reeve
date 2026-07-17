# Bug Fix Prompt Template

Customize every bracketed field. Remove sections that are genuinely inapplicable.

```markdown
## Context
[Known project and bug context supplied by the user. Do not invent repository facts.]

## Task
Fix [exact symptom], which occurs when [trigger]. Expected: [behaviour]. Actual: [behaviour].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Specifically read `/systematic-debugging` and `/test-driven-development`, plus any applicable domain skills.
- Read the `.claude` file before starting.
- First reproduce or otherwise confirm the failure, diagnose the root cause, and explain your evidence and plan. Do not apply a surface-level patch.

## Known Context
- [Facts supplied by the user, logs, screenshots, ticket, or reproduction steps.]

## Discover in the Repository
- Locate the failing path, its callers, related tests, error handling, and existing project patterns.
- Determine the correct test and verification commands.

## User Decisions
- [Include only unresolved product or compatibility decisions. Otherwise write: None.]

## Scope
- Work in: [known or likely boundary; verify during diagnosis].
- Do not modify: [protected interfaces, unrelated modules, generated files, or environments].

## Requirements
1. Reproduce or prove the failure before changing code.
2. Identify and explain the root cause.
3. Add or update a regression test that fails before the fix and passes after it when feasible.
4. Implement the smallest root-cause fix that follows existing patterns.
5. Preserve unrelated behaviour and public interfaces unless explicitly approved.
6. If diagnosis contradicts the requested approach, stop and report before implementing a materially different solution.

## Verification
- Run the focused regression test and all relevant existing tests.
- Run lint, type checks, build, or manual reproduction steps as applicable.
- Confirm the original failure is fixed and no related behaviour regressed.
- Do not break existing functionality. If tests do not exist, verify existing behaviour manually.

## Memory
Add only durable project conventions or architectural decisions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local learnings and recurring corrections. Do not store temporary task information in project memory. Update only after verification and keep project memory under 200 lines.

## Log
Append one verified outcome to `log.md`:
`## [YYYY-MM-DD] fix | Brief description [HH:MM IST]`
One line only. If implementation is blocked but a substantive diagnosis is completed, use `debug` instead. Create `log.md` if missing.
```
