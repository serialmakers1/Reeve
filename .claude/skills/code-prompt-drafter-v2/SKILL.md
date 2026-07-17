---
name: code-prompt-drafter-v2
description: "Draft precise, executable prompts for Claude Code. Activate when the user asks to write, draft, improve, review, or structure a prompt, instruction, implementation task, investigation, or plan for Claude Code. Covers bug fixes, features, refactors, migrations, tests, UI work, security, performance, dependency upgrades, and related coding tasks. Do not activate for ordinary coding advice unless the user wants instructions prepared for Claude Code."
---

# Claude Code Prompt Drafter

Transform rough intent into a precise Claude Code prompt that can be executed reliably without breaking existing workflows. This file is the router and control plane. Load only the supporting references required for the current task.

## Non-Negotiable Rules

1. **Use `/prompt-engineer` first.** Apply its Role, Context, Instructions, Output, Examples, Constraints, and Evaluation framework before drafting.
2. **Check Claude Code's available skills.** Every drafted prompt must say: "Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task." Explicitly list the relevant skills selected below.
3. **Read project memory.** Every drafted prompt must say exactly: "Read the `.claude` file before starting."
4. **Diagnose before acting.** Every prompt must require investigation of the current state, findings, and a plan before implementation.
5. **Prevent regressions.** Every prompt must say not to break existing functionality, run relevant tests after changes, and manually verify existing behaviour when tests do not exist.
6. **Clarify selectively.** Ask one question at a time only for material user-owned decisions. Do not ask for information Claude Code can discover from the repository or connected context.
7. **Maintain `log.md`.** Every prompt must require one append-only outcome entry: `## [YYYY-MM-DD] action | Brief description [HH:MM IST]`. Create `log.md` if it does not exist.
8. **Update memory selectively.** Add only durable project conventions or architectural decisions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local learnings and recurring corrections. Do not store temporary task information in project memory.

## Workflow

Follow these stages in order.

### 1. Understand the Request

Identify the desired outcome, current symptom or state, boundaries, constraints, and definition of done. Use information already supplied by the user; never repeat a resolved question.

### 2. Gather Relevant Context

Use connected sources only when the request references or clearly depends on project-specific tickets, documentation, discussions, pull requests, errors, schemas, analytics, email requirements, automations, or infrastructure. Do not search unrelated connectors for a standalone request.

When continuing prior work, a regression, or a recent migration, instruct Claude Code to inspect the last five relevant `log.md` entries before diagnosis.

### 3. Classify Missing Information

If anything material is missing, read `references/clarification-gate.md` and classify it as:

- **Repository-discoverable:** Claude Code should investigate it.
- **User-owned decision:** ask one concise question if it materially changes the solution.
- **Safe assumption:** follow existing patterns and state the assumption.

Draft only after any essential user-owned decision is resolved.

### 4. Classify the Primary Task and Route It

Select one primary template. Add secondary skills or high-risk review only when they truly apply.

| Primary task | Template | Skills to name in the prompt |
|---|---|---|
| Bug fix | `references/templates/bug-fix.md` | `/systematic-debugging`, `/test-driven-development` |
| New feature | `references/templates/new-feature.md` | `/brainstorming`, `/test-driven-development`; add UI skills when applicable |
| Refactor | `references/templates/refactor.md` | `/test-driven-development`, `/systematic-debugging` |
| Database or migration | `references/templates/database-migration.md` | `/supabase-postgres-best-practices` |
| Security or hardening | `references/templates/security.md` | `/security-best-practices` |
| UI or design implementation | `references/templates/ui-design.md` | `/ui-ux-pro-max`, `/frontend-design`, `/vercel-react-best-practices` |
| Test writing | `references/templates/test-writing.md` | `/test-driven-development` |
| Read-only investigation | `references/templates/investigation.md` | Relevant diagnostic or domain skills |
| Implementation plan | `references/templates/implementation-plan.md` | Relevant domain skills |
| Performance | `references/templates/performance.md` | `/systematic-debugging`, `/test-driven-development`; add domain skills |
| Dependency upgrade | `references/templates/dependency-upgrade.md` | `/test-driven-development`; add domain skills |

For design review or feedback, also name `/product-design-reviewer` and `/ui-ux-pro-max`. Any task touching visual elements, layouts, components, styling, or user-facing interfaces must name `/ui-ux-pro-max`. For n8n work, instruct Claude Code to identify and read all available n8n workflow creation, node configuration, and debugging skills.

### 5. Classify Risk

- **Low:** documentation, tests, read-only investigation, isolated copy changes, small styling changes.
- **Medium:** ordinary bug fixes, standard features, local refactors, limited API changes, routine dependency updates.
- **High:** authentication or authorization, security, billing or payments, database/schema migration, destructive or bulk data changes, infrastructure/deployment, secrets or permissions, public API breakage, large cross-service refactors, or any task requiring rollback/recovery planning.

Low- and medium-risk prompts may diagnose, explain the plan, and proceed in the same execution after the diagnosis confirms the approach.

High-risk work must separate diagnosis and planning from implementation. Require the user to review the diagnosis, impact, implementation plan, verification plan, and recovery approach before implementation. Read `references/high-risk-review.md` and apply its independent review process.

### 6. Load Supporting References

Load only what applies:

| Condition | Reference |
|---|---|
| Missing or ambiguous material information | `references/clarification-gate.md` |
| Vague verbs, broad scope, or possible prompt anti-patterns | `references/anti-patterns.md` |
| Memory may be updated | `references/dot-claude-guide.md` |
| Logging details or continuation history matter | `references/log-guide.md` |
| High-risk task | `references/high-risk-review.md` |

Do not load every template or reference by default.

### 7. Draft the Prompt

Use the selected task template. A completed prompt normally contains:

- `## Context`
- `## Task`
- `## Pre-Flight`
- `## Known Context`
- `## Discover in the Repository`
- `## User Decisions` when applicable
- `## Scope`
- `## Requirements`
- `## Verification`
- `## Memory`
- `## Log`

Use numbered, testable requirements. Clearly separate facts supplied by the user from facts Claude Code must discover. Never present an unknown repository fact as certain.

### 8. Review the Draft

For every prompt, confirm:

- The task, scope, exclusions, and success criteria are explicit.
- Relevant skills are named and all other applicable skills must be checked.
- The exact `.claude` instruction is present.
- Diagnosis, no-breakage, verification, memory, and `log.md` instructions are present.
- Repository-discoverable facts were not turned into unnecessary user questions.
- Vague verbs define the object, intended result, boundaries, and measurement.
- The worst plausible misinterpretation is blocked by a constraint.
- The prompt is under 500 words where practical.

For high-risk prompts, apply two independent reviews from `references/high-risk-review.md`, revise the prompt, and only then present it.

### 9. Present and Iterate

Present the finished prompt and briefly state whether it is a single prompt or a sequence. For complex or high-risk work, provide the complete ordered sequence and tell the user to review each stage before running the next. Ask whether anything should be added or removed.
