# Database / Migration Prompt Template

This is high-risk work. Apply `../high-risk-review.md` and separate diagnosis/planning from implementation unless the exact plan is already approved.

```markdown
## Context
[Known database, schema-change goal, and business requirement.]

## Task
[Describe the exact schema, policy, function, view, index, query, or data migration change.]

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Specifically read `/supabase-postgres-best-practices` and any applicable security or testing skills.
- Read the `.claude` file before starting.
- Inspect the live project schema sources, migration history, dependencies, policies, generated types, and data shape. Report findings and a migration plan before making changes.
- Do not execute implementation until the user has reviewed the diagnosis, impact, tests, and recovery plan.

## Known Context
- [Known tables, requirements, constraints, volumes, and desired behaviour.]

## Discover in the Repository
- Migration framework and naming, dependent tables/views/functions/triggers/RLS policies, application queries, generated types, seeds, tests, and deployment order.

## User Decisions
- [Backfill behaviour, compatibility, downtime, data retention, destructive approval, or rollout decisions. Otherwise: None.]

## Scope
- Affect only: [tables, schemas, policies, functions, and application surfaces].
- Do not modify or delete: [protected data, unrelated schemas, production directly, or unapproved contracts].

## Requirements
1. Create a reversible migration with explicit up and down behaviour.
2. Handle existing data without loss; define backfill, nullability, defaults, constraints, and validation order.
3. Preserve compatibility or clearly identify and obtain approval for any break.
4. Update affected queries, policies, functions, views, generated types, fixtures, and documentation.
5. Make destructive or irreversible commands impossible without explicit approval.
6. Ensure migrations are deterministic, idempotent where required by the project, and correctly ordered.
7. Stop if repository findings materially differ from the approved plan.

## Independent Review
Before implementation, run the independent clarity and safety reviews in `references/high-risk-review.md`, synthesize the findings, and revise the implementation prompt.

## Verification
- Back up or use the project's approved safe test environment.
- Apply the migration to a test database and verify schema, policies, data, and application behaviour.
- Verify the down migration and restoration of expected behaviour.
- Run database tests, application tests, type generation, lint, type checks, and build as applicable.
- Confirm no data loss, privilege expansion, policy regression, or broken consumer.
- Do not report success if migration or verification fails.

## Memory
Add only verified, durable schema conventions or architecture decisions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local learnings. Do not store temporary migration output in project memory. Keep it under 200 lines.

## Log
After verified completion append: `## [YYYY-MM-DD] migrate | Brief description [HH:MM IST]`
Use `plan`, `debug`, or `rollback` when that is the actual outcome. One line, IST. Create `log.md` if missing.
```
