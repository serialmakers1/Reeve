# UI / Design Implementation Prompt Template

```markdown
## Context
[Known product, page, component, audience, and supplied design reference.]

## Task
Implement [page/component/interaction] so it matches [authoritative reference] and supports [specific behaviour].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Read `/ui-ux-pro-max`, `/frontend-design`, and `/vercel-react-best-practices` before any design or UI work. For critique or review also read `/product-design-reviewer`.
- Read the `.claude` file before starting.
- Inspect the existing design system, tokens, components, responsive conventions, accessibility patterns, and target page. Explain the implementation plan before editing.

## Known Context
- [Mockup, screenshot, copy, required states, target users, and user-supplied constraints.]

## Discover in the Repository
- Framework, component library, tokens, typography, breakpoints, reusable components, routing, data states, test tools, and visual verification method.

## User Decisions
- [Authoritative mockup, copy, interaction, visual trade-off, or scope decision. Otherwise: None.]

## Scope
- Create or modify: [specific pages/components/styles].
- Do not modify: [global tokens, shared components, third-party styles, unrelated pages, or behaviour] without approval.

## Requirements
1. Follow the existing design system and reuse owned components where appropriate.
2. Implement named layouts, spacing, typography, states, interactions, and responsive behaviour.
3. Include loading, empty, error, disabled, focus, hover, and validation states that apply.
4. Meet keyboard, screen-reader, semantic HTML, contrast, and reduced-motion expectations.
5. Do not add generic decorative patterns or animations that conflict with the reference or project language.
6. Preserve data behaviour and unrelated UI.

## Verification
- Check the target at relevant mobile, tablet, and desktop widths.
- Verify keyboard navigation, focus order, labels, semantics, contrast, overflow, loading, and error states.
- Run component/UI tests, accessibility checks, lint, type checks, and build.
- Compare against the authoritative visual reference and confirm no regressions on affected pages.
- Do not break existing functionality; manually verify when tests do not exist.

## Memory
Add only durable design-system or component conventions to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local recurring corrections. Do not store one-off visual instructions in project memory. Update only after verification and keep it under 200 lines.

## Log
Append: `## [YYYY-MM-DD] feat | Brief description [HH:MM IST]`
Use `audit` for a review-only task. One line, IST. Create `log.md` if missing.
```
