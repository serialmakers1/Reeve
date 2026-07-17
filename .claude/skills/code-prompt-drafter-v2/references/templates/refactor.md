# Refactor Prompt Template

```markdown
## Context
[Module and reason for refactoring, using only known facts.]

## Task
Refactor [specific area] toward [specific structural goal] while preserving [behaviour and public contracts].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Specifically read `/test-driven-development` and `/systematic-debugging`, plus relevant domain skills.
- Read the `.claude` file before starting.
- Inspect the current structure, callers, tests, interfaces, and known pain points. Explain the plan before editing.

## Known Context
- [Known constraints and desired structure.]

## Discover in the Repository
- Consumers, public interfaces, existing tests, dependency direction, generated files, and project conventions.

## User Decisions
- [Whether interfaces may change or compatibility can be broken, if unresolved. Otherwise: None.]

## Scope
- Refactor: [files, functions, or module boundary].
- Do not modify: [behaviour, public API, unrelated modules, generated output, or data].

## Requirements
1. Preserve intended behaviour; this is not a feature change unless explicitly stated.
2. Establish the named structural outcome rather than performing generic cleanup.
3. Keep existing public interfaces and imports working unless the user approved changes.
4. Avoid opportunistic unrelated refactors.
5. Add characterization tests first when current behaviour lacks sufficient coverage.
6. For a high-risk or cross-service refactor, stop after diagnosis and produce an approved implementation plan before changes.

## Verification
- Capture the relevant test baseline before editing and run the same tests after.
- Run all affected tests, lint, type checks, and build.
- Confirm behavioural equivalence and inspect the diff for unintended scope expansion.
- Do not break existing functionality; verify manually when tests do not exist.

## Memory
Add only durable project conventions or architectural decisions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local learnings and recurring corrections. Do not store temporary task information in project memory. Update only after verification and keep project memory under 200 lines.

## Log
Append: `## [YYYY-MM-DD] refactor | Brief description [HH:MM IST]`
Use `plan` instead if only an approved plan was completed. One line, IST. Create `log.md` if missing.
```
