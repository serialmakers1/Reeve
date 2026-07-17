# Read-Only Investigation Prompt Template

Use when the user asks Claude Code to inspect, diagnose, review, understand, trace, or report without making changes.

```markdown
## Context
[Known symptom, question, incident, area, or decision the investigation should inform.]

## Task
Investigate [specific question] and produce an evidence-based report. Do not modify files, configuration, data, dependencies, or environments.

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this investigation.
- Read relevant diagnostic and domain skills.
- Read the `.claude` file before starting.
- If this continues recent work, inspect the last five relevant `log.md` entries.

## Known Context
- [User-provided facts, errors, timestamps, reproduction, ticket, or hypothesis.]

## Discover in the Repository
- Trace the relevant code and data flow, dependencies, tests, configuration, history, and current behaviour.
- Distinguish verified evidence from inference and unknowns.

## User Decisions
- [Only a decision needed to bound the investigation. Otherwise: None.]

## Scope
- Inspect: [specific modules, systems, environments, or history].
- Do not change anything. Do not run destructive commands or mutate external services.

## Requirements
1. Restate the investigation question precisely.
2. Gather evidence from source code, configuration, tests, logs, history, and connected context that are relevant.
3. Report current behaviour, likely root cause or architecture, affected surfaces, and confidence.
4. List unresolved unknowns and the smallest next step to resolve each.
5. Recommend options and trade-offs when requested, but do not implement them.
6. Do not treat an unverified hypothesis as a confirmed finding.

## Output
- Executive finding.
- Evidence and locations.
- Root cause or system explanation.
- Impact and affected areas.
- Unknowns and confidence.
- Recommended next actions.

## Verification
- Cross-check important findings against more than one source when possible.
- Confirm cited paths, symbols, commands, and behaviours exist.
- State clearly what could not be verified.

## Memory
Do not update project memory from speculative or incomplete findings. Add only a confirmed durable convention or architecture decision to the appropriate `CLAUDE.md` or scoped rule when the investigation conclusively establishes it. Use auto memory for machine-local recurring corrections.

## Log
If the investigation produces a substantive confirmed outcome, append:
`## [YYYY-MM-DD] debug | Brief description [HH:MM IST]`
Use `audit` for a formal review. If no meaningful result was produced, do not log misleading success. Create `log.md` if missing when an entry is warranted.
```
