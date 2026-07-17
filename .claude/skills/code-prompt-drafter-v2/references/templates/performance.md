# Performance Improvement Prompt Template

```markdown
## Context
[Known slow path, measured symptom, environment, and user impact.]

## Task
Improve [specific performance metric] from [baseline if known] toward [target] within [scope].

## Pre-Flight
- Before starting, check all available skills in your skill list. Read and follow every skill that applies to this task.
- Specifically read `/systematic-debugging` and `/test-driven-development`, plus relevant frontend, database, or infrastructure skills.
- Read the `.claude` file before starting.
- Measure or reproduce the baseline, profile the system, identify the bottleneck with evidence, and explain the plan before changing code.

## Known Context
- [Current timing, throughput, memory, query count, bundle size, traffic shape, or reported impact.]

## Discover in the Repository
- Measurement tools, relevant code paths, queries, caching, rendering, network calls, concurrency, tests, and deployment constraints.

## User Decisions
- [Acceptable trade-offs in consistency, cost, memory, quality, compatibility, or complexity. Otherwise: None.]

## Scope
- Optimize: [specific endpoint, workflow, query, component, or asset].
- Do not perform unrelated cleanup or sacrifice correctness, security, accessibility, or maintainability without approval.

## Requirements
1. Establish a repeatable baseline before implementation.
2. Identify the dominant bottleneck using profiling or instrumentation; do not optimize by intuition alone.
3. Define the target metric and test conditions.
4. Implement the smallest change that addresses the measured cause.
5. Preserve functional correctness and relevant contracts.
6. Avoid benchmark-specific hacks and document material trade-offs.

## Verification
- Repeat the same measurement after the change and compare against the baseline.
- Run functional, regression, load, query, browser, or memory checks appropriate to the bottleneck.
- Run relevant existing tests, lint, type checks, and build.
- Report the measured result honestly, including variance and unmet targets.
- Do not break existing functionality.

## Memory
Add only durable performance conventions or confirmed recurring gotchas to the appropriate `CLAUDE.md` or scoped rule. Use auto memory for machine-local tooling corrections. Do not store temporary benchmark output in project memory.

## Log
Append a verified result: `## [YYYY-MM-DD] perf | Brief measured improvement [HH:MM IST]`
If only the bottleneck was diagnosed, use `debug`. One line, IST. Create `log.md` if missing.
```
