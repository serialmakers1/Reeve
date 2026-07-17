# New Feature Prompt Template

```markdown
## Context
[User-supplied product and project context. Do not claim an unknown stack, file path, or existing architecture.]

## Task
Implement [feature] so that [specific user-visible or system behaviour].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Specifically read `/brainstorming` and `/test-driven-development`; for any UI work also read `/ui-ux-pro-max`, `/frontend-design`, and `/vercel-react-best-practices`.
- Read the `.claude` file before starting.
- First inspect the current architecture, similar features, affected flows, and test conventions. Explain findings and the implementation plan before coding.

## Known Context
- [Requirements, acceptance criteria, tickets, mockups, or constraints supplied by the user.]

## Discover in the Repository
- Framework and versions, relevant modules, existing patterns, integration points, tests, and commands.
- Existing behaviour that must remain compatible.

## User Decisions
- [Only product, scope, data, design, compatibility, or rollout decisions that cannot be discovered. Otherwise: None.]

## Scope
- Create or modify: [bounded feature area].
- Do not modify: [protected modules, APIs, design tokens, data, or environments].

## Requirements
1. Implement each acceptance criterion explicitly.
2. Reuse existing architecture and components where appropriate; do not create a parallel pattern without justification.
3. Handle named error, empty, loading, permission, and edge states that apply.
4. Preserve existing contracts and behaviour outside the approved scope.
5. Add appropriate tests and documentation or generated types when the feature changes them.
6. If the existing architecture conflicts with the requested solution, stop and explain the trade-off before a material redesign.

## Verification
- Run new tests plus all relevant existing tests.
- Run lint, type checks, build, and applicable manual or visual verification.
- Verify every acceptance criterion and confirm no regressions.
- Do not break existing functionality; manually verify when tests do not exist.

## Memory
Add only durable project conventions or architectural decisions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local learnings and recurring corrections. Do not store temporary task information in project memory. Update only after verification and keep project memory under 200 lines.

## Log
Append: `## [YYYY-MM-DD] feat | Brief description [HH:MM IST]`
One verified outcome, one line, IST. Create `log.md` if missing.
```
