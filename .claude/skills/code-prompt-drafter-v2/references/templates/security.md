# Security Audit / Hardening Prompt Template

This is high-risk work. Apply `../high-risk-review.md` and require approval before behaviour, permission, contract, or deployment changes.

```markdown
## Context
[Known application area, reported concern, threat, compliance constraint, or audit objective.]

## Task
Audit and harden [specific scope] against [named threats or security objective].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Specifically read `/security-best-practices`, plus relevant debugging, testing, database, or frontend skills.
- Read the `.claude` file before starting.
- Inspect the current trust boundaries, authentication, authorization, input handling, secrets, data access, and tests. Report evidence, severity, and a proposed remediation plan before making changes.
- Do not implement until the user reviews material behaviour, permission, compatibility, and rollout implications.

## Known Context
- [Reported vulnerability, affected users, reproduction, logs, endpoints, or policies.]

## Discover in the Repository
- Trust boundaries, data flows, permission checks, session/token handling, validation, storage, dependency exposure, existing controls, and tests.

## User Decisions
- [Risk acceptance, intended permission model, allowed behaviour change, compliance or rollout decision. Otherwise: None.]

## Scope
- Audit or modify only: [endpoints, services, components, policies, infrastructure].
- Do not expose secrets, test against production without approval, or change unrelated business logic.

## Requirements
1. Confirm each finding with evidence; do not report speculative vulnerabilities as facts.
2. For every confirmed issue, state severity, exploit conditions, impact, affected surface, and remediation.
3. Consider applicable vectors such as authentication bypass, authorization failure, tenant leakage, injection, XSS, CSRF, SSRF, insecure deserialization, secret exposure, dependency risk, and unsafe logging.
4. Preserve intended business behaviour where possible. If remediation changes user-visible behaviour, permissions, API contracts, or workflows, explain it and obtain approval before implementation.
5. Add security regression tests and avoid weakening existing controls.
6. Stop when the requested remediation would create an unapproved material change.

## Independent Review
Before implementation, run both reviews in `references/high-risk-review.md`, synthesize their findings, and revise the implementation prompt.

## Verification
- Run focused exploit/regression tests with safe test data and environment.
- Run all relevant existing tests, lint, type checks, dependency or static analysis, and build.
- Verify least privilege, negative cases, logging redaction, and no new data exposure.
- Do not claim the issue is fixed when a required test or verification fails.

## Memory
Add only verified, durable security conventions or architecture decisions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local recurring corrections. Never store secrets, exploit payloads, or temporary findings in project memory. Keep it under 200 lines.

## Log
Append the actual verified outcome: `## [YYYY-MM-DD] security | Brief description [HH:MM IST]`
Use `audit`, `plan`, or `debug` if no fix was completed. One line, IST. Create `log.md` if missing.
```
