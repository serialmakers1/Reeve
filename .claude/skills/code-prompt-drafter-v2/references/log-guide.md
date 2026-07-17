# `log.md` — Project Activity Log

`log.md` is an append-only chronological record of what Claude Code completed and when. It provides a concise project timeline and helps later sessions understand recent work.

## Required Format

```text
## [YYYY-MM-DD] action | Brief description [HH:MM IST]
```

Examples:

```text
## [2026-04-05] fix | Resolved null avatar crash in UserService.getProfile [15:10 IST]
## [2026-04-06] feat | Added dark mode toggle to settings page [09:20 IST]
## [2026-04-06] migrate | Added role column to users table and updated dependent types [13:30 IST]
## [2026-04-07] debug | Identified N+1 query causing slow dashboard responses [10:15 IST]
## [2026-04-07] plan | Completed approved authentication migration plan [12:40 IST]
## [2026-04-07] rollback | Reverted failed staging schema migration [14:05 IST]
```

## Action Verbs

| Verb | Use |
|---|---|
| `feat` | New feature completed |
| `fix` | Bug fixed |
| `refactor` | Structure changed without intended behaviour change |
| `test` | Tests added or materially changed |
| `debug` | Substantive investigation completed |
| `plan` | Actionable implementation or migration plan completed |
| `migrate` | Database or schema migration completed |
| `rollback` | Rollback or compensating change completed |
| `ingest` | New data, document, or content added |
| `deploy` | Deployment completed |
| `config` | Configuration changed |
| `docs` | Documentation changed |
| `audit` | Formal review or audit completed |
| `security` | Security fix completed |
| `perf` | Measured performance improvement completed |

## Entry Rules

1. Append only; never edit or delete existing entries during normal task execution.
2. Use one concise line per completed task outcome.
3. Log outcomes, not intermediate actions.
4. Use Indian Standard Time.
5. Use one entry per prompt execution unless a multi-stage sequence explicitly produces distinct approved outcomes.
6. Describe what was actually verified, not what was merely attempted.
7. If `log.md` does not exist, create it.

## Continuing Previous Work

When a task continues recent work, investigates a regression, changes a recent migration, or depends on earlier implementation decisions, inspect the last five entries before diagnosis:

```bash
grep "^## \[" log.md | tail -5
```

Do not read the full file unless the recent entries are insufficient.

## Blocked or Incomplete Work

- If Claude Code completed a substantive diagnosis but could not implement, append a `debug` entry describing the confirmed finding.
- If it completed an actionable plan that the user must approve, use `plan`.
- If no meaningful result was produced, do not create a misleading success entry.
- Never use `feat`, `fix`, `migrate`, `deploy`, `security`, or `perf` when verification failed.
- State failures and remaining blockers in the response even when a valid diagnostic or planning entry is logged.

## Parsing Commands

```bash
# Last five outcomes
grep "^## \[" log.md | tail -5

# All fixes
grep "^## \[.*\] fix |" log.md

# Count outcomes by action
grep -oP "(?<=\] )\w+" log.md | sort | uniq -c | sort -rn
```

## Reusable Prompt Block

```markdown
## Log
After completing this task, append one outcome entry to `log.md`:
`## [YYYY-MM-DD] action | Brief description [HH:MM IST]`
Use the appropriate action verb, one line only, and IST. Log the verified outcome, not intermediate steps or intended work. If `log.md` does not exist, create it. If the work is blocked, follow the blocked-work rules and do not log unverified success.
```

`log.md` is intentionally long-lived. Never auto-archive it; archival is a user decision.
