# Code Prompt Drafter Skill

A compact Claude Code skill that converts rough coding intent into precise, risk-aware Claude Code prompts.

## Contents

- `SKILL.md` — activation, mandatory controls, task routing, risk classification, and final validation.
- `references/clarification-gate.md` — separates repository-discoverable facts, user-owned decisions, and safe assumptions.
- `references/high-risk-review.md` — independent clarity and safety reviews for high-risk prompts.
- `references/anti-patterns.md` — common prompt failures and red-flag validation.
- `references/dot-claude-guide.md` — selective project-memory management.
- `references/log-guide.md` — mandatory `log.md` format and continuation rules.
- `references/templates/` — one focused prompt template per task type.

## Install

Copy the `code-prompt-drafter` folder into the skills directory used by your Claude Code setup. Preserve the folder structure because `SKILL.md` routes to the relative reference paths.

## Design Principles

- Use `/prompt-engineer` first.
- Read the `.claude` file before starting.
- Discover repository facts instead of asking the user unnecessarily.
- Ask one question at a time only for material user-owned decisions.
- Diagnose before acting and protect existing functionality.
- Apply independent criticism only to high-risk prompts.
- Load one task template and only the references needed for that request.
- Maintain verified project memory and one-line `log.md` outcomes.
