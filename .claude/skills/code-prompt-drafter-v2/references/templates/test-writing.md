# Test Writing Prompt Template

```markdown
## Context
[Known feature, module, defect, or coverage objective.]

## Task
Add or improve tests for [specific behaviour] covering [named scenarios].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Specifically read `/test-driven-development` and applicable domain skills.
- Read the `.claude` file before starting.
- Inspect existing test structure, helpers, fixtures, naming, mocking policy, coverage gaps, and the production code. Explain the test plan before editing.

## Known Context
- [Required scenarios, known defects, acceptance criteria, or expected behaviours.]

## Discover in the Repository
- Test framework and commands, test placement, fixtures, factories, mocks, integration setup, and existing patterns.

## User Decisions
- [Only unresolved contract or environment decisions. Otherwise: None.]

## Scope
- Test: [specific modules, functions, endpoints, or UI behaviour].
- Do not change production behaviour merely to make tests pass unless an approved testability refactor is required.

## Requirements
1. Cover the named happy paths, edge cases, negative cases, and error handling.
2. Make each test deterministic and focused on one behaviour.
3. Prefer behaviour-based assertions over implementation details.
4. Follow existing fixture, mock, naming, and placement conventions.
5. Avoid redundant coverage and brittle timing, snapshot, or selector assumptions.
6. Report any discovered product ambiguity or existing defect rather than encoding an unsupported expectation.

## Verification
- Run the new tests repeatedly where flakiness is plausible.
- Run all related existing tests and the broader suite appropriate to the change.
- Run lint, type checks, and build if test files participate in them.
- Confirm no production functionality was changed unintentionally.

## Memory
Add only durable testing conventions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local recurring corrections. Do not store task-specific test cases in project memory. Update only after verification and keep it under 200 lines.

## Log
Append: `## [YYYY-MM-DD] test | Brief description [HH:MM IST]`
One verified outcome, one line, IST. Create `log.md` if missing.
```
