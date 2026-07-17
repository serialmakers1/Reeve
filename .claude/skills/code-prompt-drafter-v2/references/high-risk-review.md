# High-Risk Prompt Review

Apply this process only when the task involves authentication or authorization, security, billing or payments, schema or data migration, destructive or bulk data operations, infrastructure or deployment, secrets or permissions, public API breakage, large cross-service refactors, or another change requiring rollback or recovery planning.

## Required Execution Shape

High-risk work should normally use an ordered sequence:

1. **Diagnose:** investigate and report evidence; make no changes.
2. **Plan:** define affected systems, implementation steps, data/compatibility impact, tests, rollout, and recovery; make no changes.
3. **Review:** independently challenge the clarity and safety of the proposed implementation prompt.
4. **Implement:** execute only the approved plan and stay within its boundaries.
5. **Verify:** run full verification, check regressions, confirm recovery readiness, update memory when justified, and append the final log entry.

The user should review diagnosis and plan outputs before implementation. A prompt may combine stages only when the operation is demonstrably non-destructive and the user has already approved the exact plan.

## Reviewer A: Execution Clarity

Review the draft without seeing Reviewer B's findings. Check:

- Is the desired outcome explicit and testable?
- Are facts, discoveries, assumptions, and user decisions separated?
- Is the scope bounded by files, systems, tables, endpoints, or environments?
- Are exclusions explicit?
- Could any requirement be interpreted in multiple materially different ways?
- Are acceptance criteria measurable?
- Does the prompt invent repository facts or requirements?
- Does it specify what to do if diagnosis contradicts the proposed approach?
- Is the implementation order clear?
- Is the output expected from each stage clear?

Return only concrete defects and recommended corrections. Do not rewrite the prompt.

## Reviewer B: Safety and Regression

Review the draft without seeing Reviewer A's findings. Check:

- Data loss, corruption, duplication, and migration compatibility risks.
- Authentication, authorization, tenant isolation, privacy, and secret exposure.
- Billing, entitlement, or financial correctness where applicable.
- Backward compatibility and public contract impact.
- Rollback, recovery, backup, staged rollout, and failure handling.
- Test depth, test environment, manual verification, and regression coverage.
- Whether destructive actions require explicit approval.
- Whether unrelated functionality or environments could be modified.
- Whether generated types, clients, schemas, documentation, or deployment configuration must also change.
- Whether the prompt could report success despite failed verification.

Return only concrete defects and recommended corrections. Do not rewrite the prompt.

## Independence Rule

Use independent sub-agents or reviewers when the harness supports them. They must not see each other's findings. If independent agents are unavailable, perform two explicitly separated passes with fresh instructions and treat the result as a weaker fallback.

## Synthesis

The main drafter must:

1. Merge overlapping findings rather than concatenating both reviews.
2. Resolve contradictions using the user's requirements and available evidence.
3. Revise the prompt to address every material issue.
4. Recheck that the revised prompt remains focused and reasonably concise.
5. State that implementation must stop when diagnosis reveals an unapproved material change.

## Minimum High-Risk Controls

A high-risk prompt must cover, where applicable:

- Current-state evidence.
- Exact boundaries and protected areas.
- Data and compatibility handling.
- Security and permission implications.
- Implementation and ordering.
- Verification and regression testing.
- Recovery or rollback readiness.
- Approval before destructive or materially different action.
- Honest completion criteria: do not claim success when tests, migration, deployment, or verification fail.
