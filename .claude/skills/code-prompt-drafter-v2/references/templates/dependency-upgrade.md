# Dependency Upgrade Prompt Template

```markdown
## Context
[Known package, current version, target version or upgrade objective, and reason.]

## Task
Upgrade [dependency/runtime/tool] from [current version if known] to [target version] while preserving [contracts and supported environments].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Read `/test-driven-development` and applicable framework, security, database, or build skills.
- Read the `.claude` file before starting.
- Confirm the installed version, package manager, lockfile, peer dependencies, usage sites, official migration requirements, and test/build commands. Explain the upgrade plan before editing.

## Known Context
- [Target version, motivation, deadlines, known breaking changes, or security advisory.]

## Discover in the Repository
- Actual dependency versions, transitive constraints, config files, APIs in use, peer requirements, generated files, CI, deployment runtime, and existing tests.

## User Decisions
- [Whether adjacent dependencies may also be upgraded, compatibility floor, deprecation choices, or rollout timing. Otherwise: None.]

## Scope
- Upgrade: [specific dependencies and approved related packages].
- Do not broadly update unrelated packages, reformat the repository, or rewrite APIs beyond what the migration requires.

## Requirements
1. Confirm current and target versions and review authoritative migration or release guidance.
2. Identify breaking changes that affect this repository before editing.
3. Update manifests, lockfiles, configuration, imports, APIs, types, and tests only as required.
4. Keep unrelated dependency versions unchanged unless a peer or compatibility constraint requires an approved change.
5. Preserve supported runtime and public behaviour.
6. Report deprecated or incompatible patterns that require a user decision rather than guessing.

## Verification
- Perform a clean dependency install using the project's package manager.
- Run tests, lint, type checks, build, and relevant integration or smoke checks.
- Check for duplicate versions, peer warnings, vulnerability changes, bundle/runtime regressions, and deployment compatibility.
- Confirm the lockfile contains only expected changes.
- Do not report success if the clean install or required verification fails.

## Memory
Add only durable version decisions, migration conventions, or recurring upgrade gotchas to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local corrections. Do not store transient install output in project memory.

## Log
Append: `## [YYYY-MM-DD] config | Upgraded [dependency] from [old] to [new] [HH:MM IST]`
Use `security` when the verified outcome is primarily a security remediation. One line, IST. Create `log.md` if missing.
```
