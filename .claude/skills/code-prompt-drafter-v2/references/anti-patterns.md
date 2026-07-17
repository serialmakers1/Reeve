# Claude Code Prompt Anti-Patterns

Use this reference when the request or draft contains vague language, unlimited scope, conflicting instructions, or other signs that Claude Code could misinterpret the task.

## 1. The Vague Verb

**Bad:** "Optimize the dashboard."

**Why it fails:** Optimize for speed, UX, readability, bundle size, or something else?

**Fix:** Define the object, current state, target, boundaries, and measurement: "Reduce the dashboard's initial load time from 3.2 seconds to under 1.5 seconds. Focus on API calls in `DashboardPage.tsx` and lazy-load the charts component."

## 2. The Scope Bomb

**Bad:** "Clean up the codebase and make it production-ready."

**Why it fails:** Unlimited scope invites unrelated changes and regressions.

**Fix:** Bound the files and preserve interfaces: "Refactor `src/utils/helpers.ts`; extract date functions into `date.ts` and string helpers into `string.ts`. Do not change function signatures or existing imports."

## 3. The Missing Context

**Bad:** "Add a login page."

**Why it fails:** Desired behaviour and boundaries are unknown, but many technical details may be discoverable.

**Fix:** Separate the information:

- **User-provided decision:** required login methods, destination after success, authoritative design.
- **Repository discovery:** framework, router, auth provider already in use, design system, file locations.
- **Safe assumption:** follow existing naming and test placement.

Do not force the user to supply repository facts Claude Code can investigate.

## 4. The Implementation Jump

**Bad:** "Change the user model to add a `role` field and update all APIs."

**Why it fails:** Existing permissions, consumers, and migration impact are unknown.

**Fix:** Diagnose first. Require Claude Code to report dependencies, existing role systems, migration impact, and a plan before changing anything.

## 5. The Mega-Prompt

**Bad:** One prompt redesigns the database, rewrites APIs, changes the frontend, adds tests, and deploys.

**Why it fails:** Focus degrades and errors compound.

**Fix:** Split it into diagnosis, plan, implementation, and verification prompts with clear handoffs.

## 6. The No-Verification Prompt

**Bad:** "Add form validation to the signup page."

**Why it fails:** Edge cases and regressions remain untested.

**Fix:** Name expected scenarios and require relevant existing tests plus new tests or manual verification.

## 7. The Assumption Prompt

**Bad:** "You know the project; just fix the auth bug."

**Why it fails:** A new Claude Code session may lack the relevant context.

**Fix:** Read the `.claude` file, include the known symptom and expected behaviour, and instruct Claude Code to discover the current implementation before acting.

## 8. The Skill-Ignorant Prompt

**Bad:** Give a detailed UI or security task without invoking specialized skills.

**Why it fails:** Claude Code falls back to generic behaviour.

**Fix:** Require a scan of all available skills and explicitly name the relevant ones.

## 9. The "Fix All" Prompt

**Bad:** "Fix all TypeScript errors."

**Why it fails:** Scope is unbounded and some errors may require design decisions.

**Fix:** Restrict the area, classify errors, fix only approved categories, and report the rest.

## 10. The No-Boundary Prompt

**Bad:** "Add dark mode to the app."

**Why it fails:** It is unclear which surfaces, assets, emails, and third-party components are included.

**Fix:** Define owned components, storage behaviour, exclusions, breakpoints, and verification.

## 11. Premature Clarification

**Bad:** Ask "What framework are you using?" when Claude Code can read project files.

**Why it fails:** It interrupts the user and shifts repository investigation onto them.

**Fix:** Ask only for material user-owned decisions. Route repository facts to diagnosis and discovery.

## 12. The Everything Template

**Bad:** Include database, security, UI, deployment, and performance instructions in every prompt.

**Why it fails:** Irrelevant guidance dilutes the task and can introduce conflicting rules.

**Fix:** Select one primary task template, then add only applicable secondary skills and high-risk controls.

## 13. The Memory Dump

**Bad:** Save temporary debugging notes, copied errors, current task status, or implementation details into project memory.

**Why it fails:** Future sessions inherit stale or noisy context.

**Fix:** Store only durable project conventions or architectural decisions in the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local recurring learnings and `log.md` for completed outcomes.

## Red-Flag Validation

If the draft contains any of these words, verify that the object, target result, boundaries, and success criteria are explicit:

| Word or phrase | Required clarification in the prompt |
|---|---|
| Improve | Which metric or behaviour improves? |
| Clean up | What structural change is required? |
| Optimize | Optimize for which measurable target? |
| Fix everything | Which exact issues and scope? |
| Make it better | Better by which standard? |
| Update | From what to what, with which migration path? |
| Refactor | Toward which structural goal while preserving what? |
| Handle edge cases | Which concrete scenarios? |
| Production-ready | Which reliability, security, observability, or operational criteria? |
