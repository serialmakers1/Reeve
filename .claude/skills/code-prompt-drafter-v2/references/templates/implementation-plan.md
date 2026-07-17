# Implementation Plan Prompt Template

Use after diagnosis or when the user wants a concrete plan without code changes.

```markdown
## Context
[Confirmed diagnosis, approved goal, and relevant user constraints.]

## Task
Produce an implementation plan for [specific outcome]. Do not modify code, data, configuration, dependencies, or environments.

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Read the relevant domain, debugging, design, database, security, and testing skills.
- Read the `.claude` file before starting.
- Validate the current state and any prior diagnosis before planning. If evidence contradicts the stated premise, report it instead of planning against a false assumption.

## Known Context
- [Confirmed findings, requirements, acceptance criteria, and approved decisions.]

## Discover in the Repository
- Exact files and systems affected, dependencies, existing patterns, tests, build/deploy flow, and migration or compatibility implications.

## User Decisions
- [Any unresolved product, scope, data, compatibility, rollout, or destructive-operation decisions. Otherwise: None.]

## Scope
- Plan for: [bounded change].
- Exclude: [unrelated systems, future phases, or unapproved redesigns].

## Requirements
1. Summarize the confirmed current state and target state.
2. List changes in implementation order, grouped by file, module, service, schema, or environment.
3. Explain the approach and rationale for each change.
4. Identify compatibility, data, security, permission, performance, and operational impacts.
5. Define tests, manual checks, rollout, monitoring, and recovery steps.
6. Identify dependencies, sequencing constraints, risks, and open decisions.
7. Keep the plan executable: each step must have a clear outcome and verification.

## Output
- Current state.
- Proposed approach.
- Ordered change plan with files/systems.
- Data and compatibility handling.
- Test and verification plan.
- Rollout and recovery plan.
- Risks, dependencies, and open decisions.
- Definition of done.

## Verification
- Confirm every named path, component, schema object, command, and dependency exists or label it as to be discovered.
- Check that the plan covers every acceptance criterion and does not include unapproved scope.
- For high-risk work, apply the independent reviews in `references/high-risk-review.md` before presenting the plan.

## Memory
Do not update project memory with an unimplemented plan. Add only a durable decision already approved as a project convention or architecture decision to the appropriate `CLAUDE.md` or scoped rule.

## Log
If an actionable plan is completed, append:
`## [YYYY-MM-DD] plan | Brief description [HH:MM IST]`
One line, IST. Create `log.md` if missing.
```
