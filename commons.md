# Reeve Commons — Documentation Index

Split into focused files for AI + human parsing. Grep across all files with `grep -r "<term>" commons-*.md`.

- [commons-decisions.md](./commons-decisions.md) — Locked decisions with reasoning (D-XXX entries).
- [commons-schema.md](./commons-schema.md) — DB tables, columns, enums, RLS policies, migrations.
- [commons-ux.md](./commons-ux.md) — UI/UX flow decisions, layouts, empty states, copy.
- [commons-status-flow.md](./commons-status-flow.md) — Property status state machine (7 statuses, 14 transitions).
- [commons-forward-plan.md](./commons-forward-plan.md) — Phase 2+ deferred items.

## Phase 0 rollback notes

### PropertyDetail.tsx
- `pb-36 lg:pb-8` changed to `pb-8` — restore to `pb-36 lg:pb-8` if mobile CTA bar is re-enabled.
- `isOwnProperty` detection kept inside partially-hidden application history useEffect — if restoring CTAs, uncomment the full useEffect.
- Desktop `<aside>` (entire sidebar) hidden via `{false && ...}` — sidebar contains only CTAs, no other content.
- All state declarations left in place to avoid TypeScript churn.

### Dashboard.tsx
- Tiles removed from array: Applications, My Visits, Payments, Maintenance, Documents, Rental Preferences.
- Rental Preferences hidden because `/eligibility` has PM blocking logic. Phase 2 builds a non-blocking replacement form — re-add a tile pointing to the new form then.
- Only Favourites tile remains.

### Orphaned routes (still in App.tsx, no UI links)
- `/dashboard/applications`, `/dashboard/visits` — pages still load by direct URL, no data issues, just no nav path to them.
- `/eligibility` — still loads, still has PM blocking logic. Will be replaced in Phase 2.

### Search pattern
All hiding uses `// COMMONS-HIDE:` prefix for comments and `{COMMONS_HIDE && ...}` for JSX. To find all hides: `grep -rn "COMMONS-HIDE" src/`.

`COMMONS_HIDE` is declared as `false as boolean` at module scope in `PropertyDetail.tsx` — the `as boolean` cast prevents the ESLint `no-constant-binary-expression` rule from flagging `{COMMONS_HIDE && ...}` blocks. When re-enabling, replace `false as boolean` with `true` (or delete the blocks entirely).
