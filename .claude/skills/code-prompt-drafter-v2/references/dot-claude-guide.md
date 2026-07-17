# `.claude` File Management Guide

The `.claude` file is Claude Code's project memory. It persists conventions, decisions, and context across sessions so Claude Code does not start from zero each time.

## Golden Rule

**Read always. Update rarely. Never exceed 200 lines.**

Every drafted prompt must instruct Claude Code: **"Read the `.claude` file before starting."**

Add only durable project conventions or architectural decisions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local learnings and recurring corrections. Do not store temporary task information in project memory.

## Memory Placement

| Information | Destination |
|---|---|
| Durable project-wide convention | Appropriate project `CLAUDE.md` |
| Durable architecture decision and rationale | Appropriate project `CLAUDE.md` or scoped rule |
| Path-specific convention | Relevant scoped rule |
| Machine-local recurring correction or preference | Auto memory |
| Temporary debugging information | Keep only in current task context |
| Completed task outcome | `log.md` |
| Future work or TODO | Issue tracker |
| Rule already enforced by formatter, linter, schema, or configuration | Keep in its source of truth; do not duplicate |

## What Belongs in Project Memory

### Project Identity

- Project name and one-line purpose.
- Tech stack and important versions.
- Deployment target and major environments.

### Durable Conventions

- Naming and file-structure patterns.
- Component and state-management patterns.
- API, error-handling, and data-access conventions.
- Testing conventions not already enforced by tooling.

### Architecture Decisions

- Chosen approach and concise rationale.
- Authentication and authorization model.
- Data-flow and schema philosophy.
- Durable integration boundaries.

### Known Gotchas

- Confirmed library or environment quirks.
- Reusable workarounds.
- Performance-sensitive or fragile areas.
- Warnings that remain relevant after the current task.

## What Does Not Belong

- Temporary debug output or hypotheses.
- One-off task instructions.
- Stack traces and copied error logs.
- Current implementation status.
- TODO items.
- Verbose explanations.
- Obvious statements.
- Preferences already captured in configuration.
- Unverified findings from an incomplete diagnosis.

## Update Gate

Do not update project memory during initial diagnosis, speculative planning, or before verification. Update only after the task establishes a confirmed and durable convention, architectural decision, or recurring project gotcha.

Before adding anything, answer all five:

1. Is it durable beyond this task?
2. Is it confirmed by implementation or verification?
3. Will it help future sessions make a better decision?
4. Is it absent from existing memory?
5. Is it not already enforced or documented by a more authoritative source?

If any answer is no, do not add it.

## Maintenance Rules

1. Check the current line count before updating.
2. If the file is above 180 lines, remove outdated or resolved entries before adding.
3. Never exceed 200 lines.
4. Keep each entry to one or two lines.
5. Date architecture decisions when useful.
6. Never duplicate a convention already enforced by configuration or code.
7. Preserve existing valid content; do not rewrite the file unnecessarily.

## Reusable Prompt Block

```markdown
## Memory
- Read the `.claude` file before starting.
- Add only durable project conventions or architectural decisions to the appropriate `CLAUDE.md` or scoped rule.
- Use auto memory for machine-local learnings and recurring corrections.
- Do not store temporary task information in project memory.
- Update memory only after the work is verified and only when the information is new, confirmed, reusable, and not already documented elsewhere.
- Keep project memory under 200 lines; remove stale entries before adding when necessary.
```
