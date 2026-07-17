# Clarification Gate

Use this guide whenever the request lacks information that might affect the Claude Code prompt. The goal is to eliminate dangerous ambiguity without asking the user for facts Claude Code can discover itself.

## Order of Operations

1. Read the user's request and all supplied context.
2. Retrieve specifically referenced connected context when available.
3. Determine what Claude Code can discover from the repository during diagnosis.
4. Identify decisions only the user or stakeholder can make.
5. Ask one concise question only if the decision is essential.
6. Treat minor implementation details as safe assumptions governed by existing project patterns.

## Category 1: Repository-Discoverable

Do not ask the user for these unless the repository is unavailable and the fact is essential:

- Framework, language, runtime, and dependency versions.
- Relevant files, modules, routes, components, and test locations.
- Test framework, commands, and existing test conventions.
- Current implementation behaviour and likely dependencies.
- Existing architecture, naming, error-handling, or design patterns.
- Database schema, migration conventions, RLS policies, and generated types.
- Whether similar functionality already exists.
- Whether `.claude`, `log.md`, or project instructions exist.
- Build, lint, formatting, and deployment commands defined by the project.

Draft the prompt so Claude Code is instructed to discover and report these facts before acting.

## Category 2: User-Owned Decisions

Ask one question when the answer cannot be inferred reliably and different answers materially change scope, safety, architecture, or acceptance criteria. Examples:

- Which product behaviour is desired when multiple behaviours are valid.
- Which mockup, specification, ticket, or stakeholder instruction is authoritative.
- Whether backward compatibility or a public API contract must be preserved.
- How existing customer data should be migrated, transformed, retained, or deleted.
- Which portion of a broad request is in scope now.
- Whether a destructive operation is approved.
- Rollout, availability, compliance, budget, or business trade-offs.
- Which conflicting requirement should take priority.

## Category 3: Safe Assumptions

Do not interrupt the user for minor decisions that can follow established project conventions, such as:

- Internal helper names.
- Test-file placement when the repository has a clear pattern.
- Formatting and import ordering.
- Small implementation mechanics that do not change behaviour or public interfaces.
- Report structure or wording that does not affect the technical outcome.

Make any material assumption visible in the drafted prompt and tell Claude Code to verify it against existing patterns.

## The Three-Part Question Test

Ask a clarification only when all three are true:

1. The answer cannot be reliably discovered from the repository, connected context, or supplied materials.
2. Different answers would materially change the solution, scope, safety, or definition of done.
3. Proceeding with an explicit assumption would create meaningful risk or rework.

If any condition is false, do not ask. Route the uncertainty to repository discovery or a clearly stated assumption.

## How to Ask

- Ask one question at a time.
- Ask for a concrete decision, not a broad category.
- State the consequence when useful: "Should existing records be backfilled or only new records use this field?"
- Do not ask compound questions.
- Do not repeat anything the user has already answered.
- After the answer, reassess whether another user-owned decision remains.

## Examples

### Bug Fix

Discover: framework, error location, test command, existing retry logic.
Ask: expected behaviour when two plausible recovery behaviours exist.

### UI Work

Discover: component library, breakpoints, typography, design tokens.
Ask: which supplied mockup is authoritative when two conflict.

### Database Migration

Discover: schema, migration framework, dependent views, generated types.
Ask: whether historical rows must be backfilled when the requirement is unstated.

### Security

Discover: current auth flow, permission checks, security tests.
Ask: whether closing the issue may intentionally revoke an existing user capability.

### Refactor

Discover: file boundaries, consumers, test coverage, public interfaces.
Ask: whether a public interface may change when the refactor goal cannot be met otherwise.
