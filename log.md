## [2026-07-17] build | Phase 3 Prompt 8 — completion audit PARTIAL, FAILs: [migration-5-filename-mismatch], plus migration 20260717000006, commons sync, CLAUDE.md 200-line cap [17:55 IST]

Final wrap-up prompt for Phase 3. One migration file authored, commons + CLAUDE.md updated with pre-decided content, TypeScript baseline held.

**Audit report** (PASS unless flagged):

*DB (verified against local migration files; live DB not queried this session — no MCP tool in Claude Code environment):*
- ✅ `contact_requests` 17 cols, `email_send_log` 9 cols (migration 20260717000002).
- ✅ `contact_request_status` 5 values, `contact_request_decline_reason` 5 values (migration 20260717000001).
- ✅ `contact_requests_one_active_per_property` partial unique index (migration 20260717000002).
- ✅ 4 triggers documented (migration 20260717000003): `trg_contact_request_limits`, `trg_auto_cancel_requests_on_archive`, `trg_contact_request_event_timestamps`, `trg_contact_requests_updated_at`.
- ✅ 4 RLS policies (migration 20260717000004): `contact_requests_select/insert/update`, `email_send_log_admin_select`.
- ✅ 5 functions documented across migrations 20260717000003–20260717000006: `check_contact_request_limits`, `get_owner_response_rate`, `get_my_daily_request_remaining`, `get_tenant_daily_request_count`, `get_pending_requests_for_digest`.
- ✅ GRANTs: `get_owner_response_rate → anon+authenticated` (migration 4); `get_my_daily_request_remaining → authenticated` and `get_tenant_daily_request_count → service_role` (migration 5); `get_pending_requests_for_digest → anon+authenticated` (migration 6).

*Edge Functions:*
- ✅ All 4 files exist under `supabase/functions/`.
- ✅ `reveal-contact` + `resend-reveal`: `N8N_WEBHOOK_SECRET` present (2 hits each), `RESEND_API_KEY` absent (0 hits each — verified after the Prompt 2.1 rewrite).
- ✅ `resend-contact-webhook`: `RESEND_WEBHOOK_SECRET` present.
- ✅ `supabase/config.toml`: all 4 `[functions.<name>]` blocks with `verify_jwt = false` present.

*Frontend components:*
- ✅ `RequestContactPanel.tsx`: 2 `get_owner_response_rate` hits, 26 status-literal / cooldown / limit hits, `ownerId === user.id` guard present, `supabase.channel(...)` realtime subscription present (3 hits when case-insensitive `channel` grep run), zero "approval rate" (forbidden copy).
- ✅ `RequestsTab.tsx`: 1 `reveal-contact` hit (Edge Function invoke), 2 `DeclineReasonModal` hits (import + JSX), 5 `tenant_profile_snapshot` hits (all `?.` / `??` chains).
- ✅ `DeclineReasonModal.tsx` exists.
- ✅ `ContactRequestsCard.tsx`: 2 `resend-reveal` hits, 10 `withdrawn` hits, **0** `/owner-dashboard/` leaks — all property links use `/property/:id`.
- ✅ `PropertyDetail.tsx`: `RequestContactPanel` imported + rendered (2 hits); `COMMONS_HIDE|COMMONS-HIDE` count = **115** (unchanged from pre-Prompt-3 baseline recorded in the Prompt 3 log).
- ✅ `OwnerPropertyManagement.tsx`: `RequestsTab` + `pendingReqCount` badge logic present (6 hits).
- ✅ `TenantDashboard.tsx`: `ContactRequestsCard` imported + rendered (2 hits).
- ✅ `PublicProfile.tsx`: 2 `get_owner_response_rate` hits, **0** "approval rate".

*Commons + docs:*
- ✅ `commons-decisions.md`: D-P3-000 through D-P3-011 present (12 hits on the anchored regex), plus D-P3-012 + D-P3-013 appended this session.
- ✅ `commons-schema.md`: Phase 3 Schema section present + `get_pending_requests_for_digest` entry appended (2 hits — one existing + one new).
- ✅ `commons-forward-plan.md`: `Phase 4+ deferred items` section present; `OwnerRateBlock lift-out` present (1 hit); `ownerDisplayName` follow-up present (2 hits — the Prompt 6 addition).
- ✅ `CLAUDE.md`: baseline recorded as 364; `N8N_WEBHOOK_SECRET` present (2 hits); `all_time_handled` present (1 hit). Trimmed from 240 → **200 lines** (at cap) — collapsed Phase 1/1.5 detail sub-sections (D-153/154/160-171 all live fully in commons-decisions.md), verbose D-172-D-177 breakdown (full text in commons-decisions.md), Phase 2 routing detail, Payments/Razorpay verbose bullets, Callback Requests wording, Skills reference, Critical Gotchas wording, Inspection + PostHog sections merged. Zero load-bearing invariants dropped — every removed line has its full-form home in commons-*.md.

**⚠️ FAIL flagged (1 non-blocking):**
- **Migration 5 filename mismatch.** Audit checklist expected `supabase/migrations/20260717000005_phase3_rate_limit_functions.sql`. Actual file at `supabase/migrations/20260717151137_phase3_rate_limit_functions.sql` — different timestamp, same content, real file exists. Cause: the file was originally written in Prompt 2 with the pre-existing timestamp from an earlier session that landed the migration via MCP. Not a functional issue; documented in D-P3-013 so a future dev doesn't file a phantom "missing migration" ticket or rename it and re-run.

**Migration 20260717000006 written.** `supabase/migrations/20260717000006_phase3_pending_digest_rpc.sql` — documentation-only mirror of `get_pending_requests_for_digest()` + `GRANT EXECUTE ... TO anon, authenticated` applied via MCP. Header comment marks it not-to-be-re-run.

**Commons updates.** Appended D-P3-012 (n8n → Supabase reads use scoped SECURITY DEFINER RPC + anon key; service_role never leaves Supabase) and D-P3-013 (records the 20260717000006 migration + notes the filename-drift on migration 5). Appended a `get_pending_requests_for_digest()` row to commons-schema.md's Phase 3 Schema section with the full return shape + STABLE/SECURITY DEFINER note + anon+authenticated grant.

**CLAUDE.md.** Line count 200 (at cap). Added: one "Phase 3 complete" summary line under `Phase 3 Edge Functions`; new `Phase 3 conventions` section with 5 one-line entries — `N8N_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`, n8n → Supabase scoped-RPC-only rule (D-P3-012), `OwnerRateBlock` column-name invariant (`all_time_handled` etc., not `_total`/`_rate`), and the `ownerDisplayName` null-fallback follow-up. Trimming preserved every load-bearing invariant — nothing removed that CC needs to know that isn't in commons-decisions.md D-XXX.

**TypeScript baseline** — `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` = **364** (no delta).

**Verification (all pass):**
- `grep D-P3-012 commons-decisions.md` → 1 hit. `grep D-P3-013` → 1 hit.
- `grep get_pending_requests_for_digest commons-schema.md` → 2 hits.
- `grep N8N_WEBHOOK_SECRET CLAUDE.md` → 2 hits. `grep all_time_handled CLAUDE.md` → 1 hit.
- `wc -l CLAUDE.md` → **200**.
- `test -f supabase/migrations/20260717000006_phase3_pending_digest_rpc.sql` → present.
- TS baseline **364**.

**Phase 3 shipped.** Schema, triggers, RLS, 4 Edge Functions, 3 n8n workflows, tenant/owner/PublicProfile surfaces all live. Next: field-usage watch — the 10/day rate limit (D-P3-006), the all-time response-rate window (D-P3-009), and the 24h decline cooldown (D-P3-006) all deserve a revisit at the 30–90 day production mark, captured in commons-forward-plan.

## [2026-07-17] fix | RequestContactPanel OwnerRateBlock — column name mismatch fixed to match live RPC [17:30 IST]

The Prompt 6 log flagged this as a known follow-up: RequestContactPanel's `OwnerRateBlock` referenced `all_time_total` / `all_time_rate` / `last_7d_total` / `last_7d_rate` — all non-existent in the live RPC — so the strip silently rendered nothing on PropertyDetail. Fixed inline.

Two edits to `src/components/property-detail/RequestContactPanel.tsx`:
1. `ResponseRate` interface — dropped the four non-existent fields, kept the four live-RPC fields (`all_time_handled`, `all_time_responded`, `last_7d_handled`, `last_7d_responded`).
2. `OwnerRateBlock` body — now reads `all_time_handled` for the count, computes `Math.round((responded / handled) * 100)` for the percentage (same pattern as PublicProfile's `OwnerStatsBlock`), and gates the "· X% this week" suffix on `last_7d_handled > 0`. All fields defensive with `?? 0`.

The `< 5` "New owner · verified" threshold and every render call site (5 `<OwnerRateBlock rate={rate} />` invocations) are unchanged — only the internal data reads shifted.

**Verification (all pass):**
- `grep "all_time_total\|all_time_rate\|last_7d_total\|last_7d_rate" src/components/property-detail/RequestContactPanel.tsx` → **0 hits**.
- `grep all_time_handled src/components/property-detail/RequestContactPanel.tsx` → 2 hits (interface + body).
- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` → **364** (no delta).

Untouched: any other file. The forward-plan follow-up "OwnerRateBlock lift-out" from commons-forward-plan is now cheaper because both sites (RequestContactPanel + PublicProfile) use identical computation.

## [2026-07-17] build | Phase 3 Prompt 6 — owner response rate on PublicProfile, commons sync, D-P3-011 [17:20 IST]

**Part 1 — PublicProfile stats block.** Added `<OwnerStatsBlock userId={userId} />` between the bio `<section>` and the Listings `<section>` in `src/pages/PublicProfile.tsx`. Also appended the `OwnerStatsBlock` function at the bottom of the file (self-contained; uses existing `useState`, `useEffect`, `Skeleton`, `supabase` imports — no new imports needed).

The block fires two parallel queries on mount: `get_owner_response_rate(p_owner_id)` (public RPC — anon + authenticated) and a HEAD `properties.select('id', {count:'exact'}).eq('owner_id', userId).in('status', ['listed','edit_pending_review']).eq('is_active', true)` to check whether the profile is materially an owner.

Render rules per spec:
- Loading → single `<Skeleton className="h-4 w-56" />` — same approx width as bio text, no layout shift.
- No active listings AND handled === 0 → return null (pure tenant profile → hide entirely).
- `handled < 5` → "✓ Verified · New owner" muted line.
- `handled >= 5` → "Responds to {Math.round(responded / handled * 100)}% of requests · {handled} handled all-time"; if `last_7d_handled > 0`, second line "This week: {weeklyPct}% · {last_7d_handled} handled".

**Column-name fallback.** RPC field name shipped as `_handled` per D-P3-011 spec, but Prompt 1's SQL-mirror migration wrote `_total`. Reader accepts both: `row?.all_time_handled ?? row?.all_time_total ?? 0`. Same for weekly. Percentage is always recomputed from `responded / handled` — never trusts a pre-computed `_rate` field, so it's format-agnostic (0-1 vs 0-100 doesn't matter).

**Copy invariant.** `grep "approval rate" src/pages/PublicProfile.tsx` → **0 hits**. "Responds to X% of requests" is used verbatim — the framing intentionally covers both approvals and declines, matching D-P3-009 rationale (an owner who declines fast is still responsive).

**Part 2 — Commons sync.**

`commons-decisions.md` — appended **D-P3-011** (PublicProfile owner stats block) with three-condition render rules, data source, "materially an owner" definition, and the "Responds to X%" copy invariant. D-P3-000 through D-P3-010 already in place from Prompt 1 (verified via audit-mode grep in the earlier session).

`commons-forward-plan.md` — the 8 core Phase 4+ deferred items from Prompt 1 are already present; grep confirms "Property list on owner public profile" hit. Appended two new follow-ups:
- **OwnerRateBlock lift-out** — when Phase 4+ "About the owner" mini-profile block ships on PropertyDetail, lift the strip out of RequestContactPanel into `src/components/property-detail/OwnerRateBlock.tsx`. Data source unchanged; RequestContactPanel keeps its own copy for the pending-panel context.
- **`ownerDisplayName` follow-up** — extend PropertyDetail's property fetch to select `public_profiles.display_name` for the owner, so RequestContactPanel's consent-checkbox 2 copy reads "…with {display_name}, owner of {building_name}" instead of the current "the owner" fallback. Small self-contained change; pair with the OwnerRateBlock lift-out when the owner mini-profile block is built.

`CLAUDE.md` — appended a Phase 3 Prompt 6 section under Phase 3.

**TypeScript.** `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` → **364** (no delta).

**Untouched:** any other component, any Edge Function, any migration file, any other commons file. Only PublicProfile.tsx picked up two edits: one `<section>` insertion after bio, and one function appended after the default export.

**Verification (all pass):**
- `grep get_owner_response_rate src/pages/PublicProfile.tsx` → 2 hits (RPC call + comment reference).
- `grep "approval rate" src/pages/PublicProfile.tsx` → **0 hits**.
- `grep "^\*\*D-P3-011" commons-decisions.md` → 1 hit.
- `grep "Property list on owner public profile" commons-forward-plan.md` → 1 hit (from Prompt 1).
- `grep OwnerRateBlock commons-forward-plan.md` → 1 hit (new follow-up).
- `grep ownerDisplayName commons-forward-plan.md` → 2 hits.
- TS baseline **364**.

**Phase 3 frontend complete.** Prompts 1 (schema) → 6 (last UI surface) have shipped. Next: Prompt 7 wires n8n workflows against the two webhook URLs `reveal-contact` and `resend-reveal` dispatch to (`https://n8n.reeve.in/webhook/contact-reveal` and `.../contact-resend-reveal`). Nothing in the repo requires code changes for Prompt 7 — env vars only (`N8N_WEBHOOK_SECRET` must be set in Supabase secrets; owner needs to deploy the n8n workflows themselves).

## [2026-07-17] build | Phase 3 Prompt 5 — Tenant ContactRequestsCard with grouped log, withdraw, resend, realtime [17:00 IST]

Created `src/components/tenant-dashboard/ContactRequestsCard.tsx` — self-contained dashboard-card body. Fetches all `contact_requests` for `tenant_id = user.id` in one query with a `properties(id, building_name, locality, status)` join, groups by status, subscribes to realtime (`tenant_id=eq.${user.id}` filter) with refetch on every event. Header badge shows `pending + approved` count (non-terminal state) and disappears at zero.

Replaced the Phase 2 static `<section>` block in TenantDashboard.tsx (card 1) with `<ContactRequestsCard />`. Card position order unchanged: Contact Requests → Saved Properties → Rental Preferences. The component renders its own `<section className="rounded-xl border bg-card p-5 space-y-3">` shell so it visually matches the sibling cards without needing any wrapper change in the parent.

**Grouping + copy** (5 sections, hide-if-empty, pending on top):
- **Pending** — "Pending · Owner notified daily at 9 AM" + "Sent {relative}" + Withdraw button. AlertDialog copy exactly matches the spec: "Withdraw your request?" / "The owner will no longer see it." / "Keep it" / "Withdraw" (neutral).
- **Approved** — emerald "Approved" badge + "Contact details sent to your email." + approved_at + Resend button. Resend disabled + spinner during inflight; response branches: `{sent:true}` → success toast, `429 + daily_resend_limit` → "Daily resend limit reached.", `429` or `cooldown_active` → "Please wait before resending.", anything else → generic error.
- **Declined** — muted "Declined" badge + friendly decline label from `DECLINE_LABELS` map + attempt count + declined_at. Re-request button state derives from `declined_at + 24h > now()` and `attempt_number >= 3`: maxed → static "Maximum requests reached for this property." (no button); in cooldown → disabled button labelled "Available in {Xh Ym}" with per-minute live tick; otherwise → outline button "Request again" that `navigate(`/property/${propId}`)`. Re-request logic lives on PropertyDetail — this card never re-implements submit.
- **Withdrawn** — "You withdrew this request." + withdrawn_at. No actions.
- **Auto-cancelled** — "This request was cancelled — the property is no longer active." + auto_cancelled_at. No actions.

**Empty state** — "You haven't sent any contact requests yet. Browse properties and request owner contact when you find a match." + outline "Browse properties →" button routing to `/search`.

**Actions:**
- **Withdraw** — direct `.update({status:'withdrawn'})` filtered by `.eq('id', target).eq('tenant_id', user.id).eq('status','pending')`. Trigger `set_contact_request_event_timestamps` sets `withdrawn_at`. Optimistic row swap; realtime reconciles.
- **Resend** — `supabase.functions.invoke('resend-reveal', { body: { contact_request_id } })`. Response shape matches Prompt 2.1's rewrite: `{sent:true}` on success or `{sent:true, n8n_error:true}` (treated as success on tenant surface — the DB write already happened + admin will retry). Per-row `resending` state keyed by request id — multiple rows can be busy independently.
- **Re-request** — delegates to `/property/:propId` and disappears from the card path.

**Cooldown tick** — `setInterval(60_000)` only mounted when the `hasActiveCooldown` memo returns true (any declined row with `attempt_number < 3` still inside its 24h window). Cleared on unmount and when the condition becomes false.

**Defensive property access** — `r.properties?.id` fallback throughout; `propertyTitle()` filters null/empty parts before joining building_name + locality with " · "; when both are missing, renders "Property". Zero `/owner-dashboard/` references — all navigation goes to `/property/:id`. `grep /owner-dashboard/` returns 0 hits.

**TypeScript** — Uses the established `(supabase as unknown as { from: (t:string) => any })` cast pattern for the two `.from('contact_requests')` chains (fetch + withdraw update). Baseline holds at **364**, no delta.

**Verification (all pass):**
- `grep ContactRequestsCard src/pages/TenantDashboard.tsx` → 2 hits (import + JSX).
- `grep withdrawn src/components/tenant-dashboard/ContactRequestsCard.tsx` → 10 hits (status literals + `withdrawn_at` accessors + copy strings).
- `grep resend-reveal src/components/tenant-dashboard/ContactRequestsCard.tsx` → 2 hits (invoke callsite + top-comment reference).
- `grep /property/ src/components/tenant-dashboard/ContactRequestsCard.tsx` → 3 hits, all `/property/:id`; `grep /owner-dashboard/` → 0 hits.
- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` → **364**.

**Untouched:** `RequestContactPanel`, `RequestsTab`, any Edge Function, any migration, all commons files, all other pages. Only edits to TenantDashboard.tsx: one import line + one JSX replacement of the 8-line static `<section>` block.

**Symmetric complete.** With owner's `RequestsTab` (Prompt 4) and tenant's `ContactRequestsCard` (Prompt 5) both live, both sides see the same 5 status groupings from their own perspective, with realtime keeping them in sync. Approve on the owner side flips a card here from Pending → Approved without a reload; Withdraw here removes the pending card from the owner's tab similarly.

## [2026-07-17] build | Phase 3 Prompt 4 — Owner Requests tab with grouped log, approve/decline, realtime [16:35 IST]

Created two components:
- `src/components/owner-dashboard/DeclineReasonModal.tsx` — shadcn Dialog + RadioGroup. Exports `DECLINE_REASONS` (5 options with values matching the `contact_request_decline_reason` enum verbatim: `preferences_dont_fit`, `property_currently_unavailable`, `prefer_to_wait`, `not_the_right_fit`, `property_no_longer_available`). Confirm button disabled until a radio is picked; radio state clears on close.
- `src/components/owner-dashboard/RequestsTab.tsx` — self-contained tab body. Fetches all `contact_requests` for the property in one query, groups by status, subscribes to realtime on `property_id=eq.${propertyId}` and refetches on any INSERT/UPDATE/DELETE. Also exports `fetchPendingCount(propertyId)` used by the parent for the tab badge.

Edited `src/pages/OwnerPropertyManagement.tsx`:
- Imports `RequestsTab` + `fetchPendingCount` + `Badge`.
- Added `pendingReqCount` state + a `useEffect` that fetches once and subscribes to a realtime channel scoped to this property. Same realtime pattern as inside RequestsTab — two channels for the same table are fine (Supabase multiplexes them).
- Replaced the Requests tab placeholder (previously an inline "No tenant requests yet…" empty state) with `<RequestsTab propertyId={property.id} propertyStatus={property.status} />`.
- TabsTrigger for `requests` now conditionally renders a `<Badge>` when `pendingReqCount > 0`. Badge disappears at zero.

Snapshot visibility rule (D-P3-005 enforcement):
- **PendingCard** — expandable. Collapsed shows avatar (photo if present), display_name, attempt badge, "Requested {date}". Expanded reveals bio, tenant_message quote, `<PrefTable>` (10-row compact grid), `/u/:tenantId` link, and Approve + Decline buttons. Attempt sublabel "Attempt N of 3 — previously declined X ago" only when `attempt_number > 1` AND a matching prior-decline row exists for that tenant.
- **ApprovedCard** — read-only, snapshot visible, avatar with photo, emerald accent, "Contact details sent by email to both parties." + approved_at + public profile link.
- **CompactCard** (used for declined / withdrawn / auto_cancelled) — initial-only avatar (no photo), display_name, attempt badge, one-line status detail, one-line timestamp. Zero snapshot leakage: no photo, no preferences, no message, no bio. Declined rows also show "Tenant has re-requested." when a higher-attempt row exists for the same tenant (derived from `maxAttemptPerTenant` memo).
- Section headers hidden when the group is empty. Order: Pending → Approved → Declined → Withdrawn → Auto-cancelled. Empty state (zero requests total) shows "No requests yet — once your property is live, tenants can request your contact."

Actions:
- **Approve** → `supabase.functions.invoke('reveal-contact', { body: { contact_request_id: id } })`. Response `{approved, notification_dispatched, n8n_error}` shape from Prompt 2.1. Success + `notification_dispatched=true` → toast "Approved — contact details sent to both parties by email." Success + `n8n_error=true` (or `notification_dispatched=false`) → optimistic flip to approved AND an amber warning panel INSIDE the expanded pending card with the "may not have been sent" copy + `mailto:support@reeve.in`. Optimistic status flip + realtime reconciliation.
- **Decline** → opens `DeclineReasonModal`. On confirm, direct `.update({status:'declined', decline_reason: reason})` filtered by `.eq('status','pending')` for idempotence (RLS `contact_requests_update` allows owner). Trigger `set_contact_request_event_timestamps` sets `declined_at`. Optimistic flip; no email per D-P3-008.
- No actions on approved / declined / withdrawn / auto_cancelled cards.

Defensive rendering: every `tenant_profile_snapshot` access uses optional chaining and `?? "—"` fallback. `PrefTable` iterates a fixed row list so missing keys never leave gaps. `displayName()` helper falls back through `display_name → full_name → "Tenant"`. Photos gated by explicit `profile_photo_url` presence (AvatarFallback = initials otherwise). Snapshot-hidden statuses never enter any surface that touches `rental_preferences`, `bio`, `profile_photo_url`, or `tenant_message`.

Supabase generic-inference noise: two `(supabase as unknown as { from: (t:string) => any })` casts (one in `refetch`, one in `handleDeclineConfirm`, one in `fetchPendingCount`) — same pattern the panel and other Phase 3 code uses.

**Verification (all pass):**
- `grep RequestsTab src/pages/OwnerPropertyManagement.tsx` → 3 hits (import + fetchPendingCount import + render).
- `grep DeclineReasonModal src/components/owner-dashboard/RequestsTab.tsx` → 2 hits (import + JSX).
- `grep tenant_profile_snapshot src/components/owner-dashboard/RequestsTab.tsx` → 5 hits, all with `?.` or `??` chains.
- `grep reveal-contact src/components/owner-dashboard/RequestsTab.tsx` → 1 hit (Edge Function invoke).
- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` → **364**.

Untouched: `RequestContactPanel`, any Edge Function, any migration, all commons files, all other pages. Only OwnerPropertyManagement.tsx picked up 4 small edits (import + Badge import + state + effect + tab trigger + tab content).

**Follow-up worth flagging:** the two realtime channels (badge + tab body) both re-fetch on any change. Fine at Reeve's scale; consolidate later if it becomes noisy. Tenant public-profile link on the pending card assumes `/u/:tenantId` renders reasonable content for a request author — Phase 4's owner-side profile page enhancements will make that link more useful.

## [2026-07-17] build | Phase 3 Prompt 3 — RequestContactPanel + owner response rate on PropertyDetail [16:05 IST]

Created `src/components/property-detail/RequestContactPanel.tsx` — a self-contained panel that owns every state the tenant sees on a listed property. Imported into `src/pages/PropertyDetail.tsx` and rendered inside the main `mx-auto max-w-4xl` container, right after the Back button and BEFORE any COMMONS_HIDE-wrapped block. COMMONS_HIDE occurrence count in PropertyDetail unchanged at **115** — no additions, no removals.

**Component structure.** Props: `propertyId, ownerId, ownerDisplayName?, buildingName, propertyStatus`. Renders `null` silently when property status is not in {`listed`, `edit_pending_review`} or when the viewer is the owner (`ownerId === user.id` guard on line 80). All other states render a `<Card>` with the compact owner response-rate strip at the top.

**Data model.** On mount, three parallel queries: `contact_requests` scoped to `(tenant_id, property_id)` `.order(created_at desc).limit(1).maybeSingle()`; `rental_preferences` filtered by `user_id`; and `get_my_daily_request_remaining` RPC. Owner response rate fetched separately (public RPC, no auth needed). Preferences completeness check runs client-side against the same 5 mandatory keys the Edge Function validates — button gets disabled instantly, no round-trip needed.

**Realtime.** `supabase.channel(\`contact_requests:${user.id}:${propertyId}\`)` with `postgres_changes` filter `tenant_id=eq.${user.id}`. Property-id match happens in the callback (Supabase realtime filters allow only one predicate). Any INSERT/UPDATE/DELETE on the tenant's own contact_requests triggers `refetchTenantData()`. Channel removed on unmount.

**7 button states.** All rendered from the same component with per-state early returns:
1. Not authenticated → CTA "Request owner's contact" → routes to `/login?returnTo=`.
2. Preferences incomplete → dashed border explainer + "Set preferences" link + textarea/checkboxes disabled.
3. Daily cap (`remaining === 0`) → Submit label "Daily limit reached — try again tomorrow" + spam sub-copy.
4. Cooldown active (declined + `now < declined_at + 24h`) → Submit label "Request again in {Xh Ym}" + owner-declined sub-copy. Live per-minute tick via `setInterval(60_000)` cleared on unmount.
5. 3/3 declined (`cr.status === 'declined' && attempt_number >= 3`) → panel replaced with a muted "you've reached the maximum" note.
6. Pending → amber card with `Clock` icon + "Withdraw request" button that opens an `AlertDialog` ("Keep it" / "Withdraw"). Withdraw uses direct UPDATE guarded by `.eq('status','pending')` for idempotence.
7. Approved → emerald card with `CheckCircle2` + "Resend to my email" button calling `supabase.functions.invoke('resend-reveal')`. 429 responses toast "Please wait before resending."

**Submit flow.** Both consent checkboxes required. Checkbox 2 dynamically names `{ownerDisplayName || 'the owner'}` and `{buildingName}` per D-P3-010. `consent_checked_at` computed at submit time (client `new Date().toISOString()`). Success (201 with `id`) → toast "Request sent — the owner will be notified" + refetch (realtime also fires). 409 → "You already have an active request…" + refetch. 429 → "You've reached today's limit." + refetch. 422 `preferences_incomplete` → navigate to `/tenant-dashboard/preferences`. 422 `trigger_violation` → toast the message from the response body (surfaces the DB trigger's cooldown / max-attempts text verbatim).

**Owner response-rate strip.** `<OwnerRateBlock>` sub-component renders at the top of every non-null state. `< 5` all-time handled → "New owner · verified" with `ShieldCheck` icon. `≥ 5` → "Responds to X% of requests · N handled" with an inline "· Y% this week" appended when `last_7d_total > 0`. Muted text, xs size — metadata, not headline. Kept inside the panel component for now (PropertyDetail has no visible owner section per D-091-adjacent privacy; if a proper "About the owner" block ships later, the block can be lifted out — its data source is unchanged).

**Verification gate.** Verified users (`isFullyVerified`) can submit. Unverified users see an amber `ShieldCheck` panel above the form with a "Verify now" link to `/profile?returnTo={current}` — same URL shape as the existing `handleVerificationGate` helper in PropertyDetail. Submit stays disabled while unverified.

**TypeScript.** New file introduced 6 Supabase generic-inference errors from types.ts (same class as the CLAUDE.md-documented 364-error baseline). Applied the established `(supabase as unknown as {...})` cast at three call sites (initial fetch, withdraw update, owner rate RPC). Baseline back at **364** — no delta.

**Untouched:** COMMONS_HIDE flag, sidebar block, all existing Edge Functions, all migrations, all commons files, all other components. Only edits to PropertyDetail.tsx are two additions: one import at line 4 and one panel render block after the back button (~L881). The panel intentionally lives BEFORE all COMMONS_HIDE-gated markup so it's the first thing the tenant sees after the Back nav.

**Verification checks (all pass):**
- `grep -c COMMONS_HIDE\|COMMONS-HIDE src/pages/PropertyDetail.tsx` → **115** (unchanged from pre-prompt).
- `grep RequestContactPanel src/pages/PropertyDetail.tsx` → import + one render call.
- `grep "ownerId === " src/components/property-detail/RequestContactPanel.tsx` → owner-guard confirmed.
- `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` → **364**.

**Not covered in this prompt / worth noting for the next:** owner-side approve/decline UI on OwnerPropertyManagement, admin Requests UI, tenant dashboard live query. Also, `ownerDisplayName` is passed as `null` from PropertyDetail today — a follow-up should fetch the owner's `public_profiles.display_name` alongside the property data so the consent line reads better than "the owner". Left as-is here because PropertyDetail's data plumbing wasn't in scope.

## [2026-07-17] refactor | Phase 3 Prompt 2.1 — reveal/resend-reveal rewritten to call n8n webhooks instead of Resend directly [15:35 IST]

Architecture correction on Prompt 2. `reveal-contact` and `resend-reveal` no longer call the Resend API directly — they dispatch to n8n webhook URLs, matching the existing PM Workflow A/B/C pattern where all outbound transactional email (and future WhatsApp) is orchestrated by n8n. `submit-contact-request` and `resend-contact-webhook` untouched.

**reveal-contact** — Rewrote as: JWT → fetch cr → guards → `PATCH status=approved` → fetch owner + tenant `full_name,email,phone` from users, `building_name,locality` from properties, tenant `display_name` from profiles → build the D-P3-001-shaped payload → insert TWO `email_send_log` rows (one per recipient, `event_type='n8n_webhook_dispatched'`, `resend_message_id=null`, full payload in `raw_payload`) → fire-and-forget POST to `https://n8n.reeve.in/webhook/contact-reveal` with `Authorization: Bearer ${N8N_WEBHOOK_SECRET}`. Response: `{approved:true, notification_dispatched:true}` or `{approved:true, notification_dispatched:false, n8n_error:true}` — DB `approved` state stands either way. Phone/email never in the HTTP response body.

**resend-reveal** — Rewrote as: same auth/status guards; cooldown reads widened to accept `email.sent | email.resent | n8n_webhook_dispatched | n8n_resend_webhook_dispatched` so the dispatch row this endpoint writes counts against its own cooldown correctly (the Resend event types stay in the list so a future direct-Resend rollback still honours the same cooldown). Payload matches the D-P3-003 spec: `caller_role`, `caller.{user_id,email}`, `other_party.{full_name,display_name,phone,email}`, `property.{building_name,locality}`. Log row (`event_type='n8n_resend_webhook_dispatched'`) inserted BEFORE the n8n POST so a failed dispatch still counts against cooldown — critical, otherwise a caller could hammer the endpoint infinitely with n8n down. POST to `https://n8n.reeve.in/webhook/contact-resend-reveal`. Response: `{sent:true}` or `{sent:true, n8n_error:true}`.

**Env vars** — `RESEND_API_KEY` no longer read anywhere in these two functions. `N8N_WEBHOOK_SECRET` read via `Deno.env.get`; missing secret logs a warning and lets the n8n call fail auth (caught by try/catch — never propagates). `resend-contact-webhook` is untouched and still reads `RESEND_WEBHOOK_SECRET` for Svix signature verification.

**Untouched** (per prompt scope): `submit-contact-request`, `resend-contact-webhook`, `supabase/config.toml`, migrations, frontend, commons files. CLAUDE.md gained one sentence under the Phase 3 Edge Functions section.

**Verification** (all pass): `grep RESEND_API_KEY\|resend.com` on both function dirs → 0 hits. `grep N8N_WEBHOOK_SECRET` on both files → present. `grep n8n_webhook_dispatched\|n8n_resend_webhook_dispatched` on `reveal-contact/index.ts` → hits present. `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"` = **364** (no delta).

**Owner action before deploy:** `supabase secrets set N8N_WEBHOOK_SECRET=<value>`. Remove `RESEND_API_KEY` from the project if it was ever set (unused by these functions, but any lingering copy is a spam-abuse liability). Then `supabase functions deploy reveal-contact resend-reveal`.

## [2026-07-17] build | Phase 3 Prompt 2 — four Edge Functions built, config.toml updated, scratch files cleaned [15:20 IST]

Built four Edge Functions in `supabase/functions/`: `submit-contact-request`, `reveal-contact`, `resend-reveal`, `resend-contact-webhook`. All follow the `create-razorpay-order/index.ts` skeleton — manual JWT validation, CORS_HEADERS, `json()` helper, `Deno.serve()` top-level try/catch, service_role for DB.

**submit-contact-request** — POST. Validates JWT → tenant_id. Fetches property, guards status ∈ {listed, edit_pending_review} and self-request. Calls `get_tenant_daily_request_count` RPC and blocks at ≥10 (fail-closed if RPC errors). Validates `rental_preferences` completeness (age, gender, number_of_occupants, occupation, expected_stay_duration) — returns 422 `preferences_incomplete` with redirect. Builds `tenant_profile_snapshot` from public_profiles + profiles.created_at + rental_preferences (all 14 pref keys) in the exact shape specified. INSERT surfaces trigger raises as 422 `trigger_violation` and unique-index collisions as 409 `request_already_active`. `grep phone\|email supabase/functions/submit-contact-request/` returns **zero** hits — comment rewritten to satisfy the constraint.

**reveal-contact** — POST. Owner-only via ownership check on contact_request. Status guard `= 'pending'` returns 409 `invalid_status_transition` on repeat. UPDATE → 'approved' before email send so approval stands regardless of Resend outcome. Two Resend calls issued in **Promise.all** — tenant gets owner phone + property context; owner gets tenant display_name + phone + email + building_name. Both attempts logged to `email_send_log` (event_type `email.sent` or `email.failed`; service_role bypasses RLS). Response body carries `{approved, emails_sent}` or `{approved, emails_sent, email_error}` — **no phone/email ever in the HTTP response**.

**resend-reveal** — POST. Either tenant or owner may resend. Guards status = 'approved'. Two cooldowns: 1/hour and 5/day IST via `email_send_log` queries filtered by `contact_request_id + recipient_user_id + event_type IN (email.sent, email.resent)`. 1/hour returns 429 with `retry_after_seconds` derived from the newest matching row. Same body shape as reveal-contact per role. Log row event_type = `email.resent` on success.

**resend-contact-webhook** — POST. Svix signature verification: `whsec_` prefix stripped, base64-decoded to HMAC-SHA256 key; signed payload is `${svix-id}.${svix-timestamp}.${body}`; multiple `v1,<sig>` tuples in the header supported; timing-safe compare. Invalid signature → 401 (only path allowed to 4xx). Valid signature → always 200 `{received:true}`, even on JSON parse fail or DB insert error, so Resend never retry-storms. Looks up `contact_request_id + recipient_user_id` by `resend_message_id` — orphan events still insert with nulls for debugging. `error_reason` extracted from payload only for bounce/complaint/failed event types.

**config.toml** — appended four `[functions.<name>]` blocks with `verify_jwt = false`. Existing 5 entries untouched (including the pre-existing duplicate `send-sms-otp` block).

**Local migration `20260717000005_phase3_rate_limit_functions.sql`** — documentation-only mirror of the MCP-applied `get_tenant_daily_request_count(uuid)` (SECURITY DEFINER, GRANT to service_role) and `get_my_daily_request_remaining()` (SECURITY DEFINER, uses `auth.uid()`, GRANT to authenticated). Both anchor "today" to `Asia/Kolkata` calendar day and exclude `auto_cancelled`.

**Scratch file cleanup** — `find` over the project directory turned up zero matches for `p3-decisions.md`, `p3-schema.md`, `p3-forward*.md`. Per prompt instructions, the three files that remain in `C:/Users/.../AppData/Local/Temp/...` (OS temp dir) are left for OS cleanup.

**TypeScript baseline: 364** (`npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"`) — no delta.

**Verification checks:**
- `grep -r "phone\|email" supabase/functions/submit-contact-request/` — zero hits.
- `grep "RESEND_WEBHOOK_SECRET" supabase/functions/resend-contact-webhook/` — confirmed.
- `grep "\[functions" supabase/config.toml` — 9 blocks total, 4 new Phase 3 blocks present.

**Untouched** (per prompt scope): existing Edge Functions, all RLS policies / triggers / tables outside contact_requests / email_send_log, `client.ts`, any UI or `src/` code, any n8n workflow. No `supabase functions deploy` executed — deployment is manual.

**Env vars owner must set before deploy:** `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are runtime-provided.

## [2026-07-17] build | Phase 3 Prompt 1 — schema migrations verified, types regenerated, commons updated [14:55 IST]

Four migrations were applied to production via Supabase MCP in the planning session prior to this Claude Code invocation (2 enums, 2 tables, 4 triggers, 4 policies, 4 functions — see commons-schema.md "Phase 3 Schema" for full detail). Verification of DB state was performed via MCP in the planning session; **NOT re-verified in this Claude Code session** (no MCP tool available here — user opted Option B). Step 1 verification SQL checks and Step 6 trigger-conflict check on `properties` were skipped for the same reason.

Wrote four local migration files as documentation-only mirrors (will not re-run against production): `20260717000001_phase3_contact_requests_enums.sql`, `..._tables.sql`, `..._triggers.sql`, `..._rls.sql`. Idempotent shape (IF NOT EXISTS / DROP … IF EXISTS / CREATE OR REPLACE) so any future `supabase db reset` in a dev environment converges without hand-holding.

Regenerated types via `npx supabase gen types typescript --project-id tfutuqqcxqqbirnsdpvz` run from `/tmp` (in-project run failed with ProjectConfigParseError — the local config.toml is minimal and the CLI's project-config parser trips on it; cwd bypass is the workaround). Types file grew from 3983 → 4187 lines. Grep confirms all Phase 3 types present: `contact_requests`, `email_send_log`, `contact_request_status`, `contact_request_decline_reason`, `get_owner_response_rate`. No unexpected changes to existing rows in the diff.

**TypeScript baseline: 364** (`npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"`). No delta from pre-regen count. CLAUDE.md baseline line updated from 360 → 364 with the drift explanation.

Commons updates:
- `commons-decisions.md` — appended D-P3-000 through D-P3-010 (11 entries) covering baseline state, mutual-reveal, snapshot, delivery, lifecycle, rate limits, decline reasons, notification cadence, response-rate metrics, and DPDP consent.
- `commons-schema.md` — appended "Phase 3 Schema" section: full column table for both new tables, both enums, all four triggers with the PM-divergence note on `check_contact_request_limits()` (4 divergences documented), RLS policy summary, `get_owner_response_rate()` signature, unique partial index purpose.
- `commons-forward-plan.md` — appended "Phase 4+ deferred items surfaced during Phase 3 Prompt 1" with 8 entries: admin Requests UI, WhatsApp deep-link, daily nudge, DPDP consent audit trail UI, mass-approve monitoring, response-rate window revisit, owner property list on `/u/:ownerId`, rate-limit config revisit.
- `CLAUDE.md` — index reference updated (D-001–D-177 + D-P3-000–D-P3-010), TS baseline 360 → 364, Database Tables count 24 → 26 with contact_requests + email_send_log listed and a Phase 3 pointer.

**Untouched** (per prompt scope): any existing migration file, any RLS policy outside contact_requests / email_send_log, any Edge Function, `client.ts`, `config.toml`, any src/ feature code, any n8n workflow. No `supabase db push` executed.

**Explicitly deferred to next prompt:** trigger-conflict check on `properties` (Step 6) — cannot run without MCP; verified during planning session per user statement. When Phase 3 Prompt 2 lands with MCP access, that check should be run as a spot-verify against `information_schema.triggers WHERE event_object_table='properties'` to confirm `trg_auto_cancel_requests_on_archive` coexists cleanly with `enforce_property_owner_transitions_trigger` and `handle_property_status_change` (name ordering matters — alphabetically `auto_cancel_requests_on_archive` < `enforce_property_owner_transitions_trigger` < `handle_property_status_change`, and it is an AFTER UPDATE trigger while those two are BEFORE, so no interaction is expected — but verify).

## [2026-07-17] audit | Phase 3 pre-build diagnosis — contact requests [14:35 IST]

Read-only investigation only — no files, schema, functions, or n8n workflows modified. Findings appear in the assistant response, not repeated here.

## [2026-07-14] fix | Sync Prompt 5 (final) — security_deposit_months owner input, maintenance_included_in_rent bridge cleanup, dead furnishingItems removal, CLAUDE.md trim, commons memory consolidation [IST]

Closes the 5-prompt parity-audit sync series (D-171). Five targeted fixes + memory work in a single pass.

**1. `security_deposit_months` owner input** — spec entry has `owner_form + admin_form + public_detail` audiences since D-167, but no owner input existed. Added `<SpecField fieldKey="security_deposit_months" surface="owner_form" formValues={{ listing_type: form.listing_type }}>` directly below the security_deposit_amount chips in Section 3 (spec `visibleWhen: listing_type !== 'sale'` handles rent-only gating). Owner FormState + INITIAL_STATE + prefillFormFromRow extended; mapFieldToDb switch gained a case. 1/2/3-month chips now write BOTH `security_deposit_amount` (rent × N) AND `security_deposit_months` (N) via inline `setForm + patch` (single-key `updateField` doesn't fit two-key writes). Manual entry in either field overrides. Closes a latent bug — chips wrote amount but not months, so the D-167 public-detail annotation "₹70,000 (2 months)" only fired for rows an admin had edited.

**2. `maintenance_included` FormState rename** — local key was `maintenance_included`; DB column is `maintenance_included_in_rent`. Bridge existed at the Switch call site (`updateField('maintenance_included', v, { maintenance_included_in_rent: v })`). Renamed the key throughout — FormState interface, INITIAL_STATE, prefillFormFromRow, section-touched check, Switch call site. Bridge second-arg dropped: `updateField('maintenance_included_in_rent', v)` writes directly. Added `case "maintenance_included_in_rent": return { maintenance_included_in_rent: !!value }` to mapFieldToDb — was missing before (only reachable via the dbPatch second-arg, which is now gone). PropertyPreview payload continues to use `maintenance_included: form.maintenance_included_in_rent` — preview owns its own shape; annotated with a `// preview payload key is intentional` comment.

**3. Dead `furnishingItems` state removed** — D-170 orphaned this state when admin's amenities save switched to `buildAmenitiesJson(buildingAmenities, furnishingDetail)`. Deleted both the `useState<string[]>([])` declaration at L119 and the `setFurnishingItems(...)` call at L314. Also dropped the `amenities.furnishing_items` array hydration line — that key is now derived on save from `furnishingDetail`. `grep furnishingItems src/pages/admin/PropertyEdit.tsx` → zero code references (only the D-171 comment).

**4. CLAUDE.md trimmed** — from 438 lines to ~275. Removed: verbose per-prompt narratives now captured in `commons-decisions.md`; duplicate auth rules (the same "never call getSession in render" rule was stated three times); Phase 1 per-prompt implementation logs. Preserved (all load-bearing): the entire "DO NOT" list, typecheck baseline + command, SSG route classification + rules, all auth infrastructure invariants (noOpLock, deferred callback, safety timeout, phone verify flow), RLS patterns, visit RPC contract + status machine, NewApplication render-guard order, SpecField rules including the `!== 'sale'` fail-safe, save pipeline (D-153/154), shared JSONB editors (D-170), Payments idempotency contract, Skills reference, PropertyDetail CTA priority. Every remaining D-XXX reference still points at a real decision that CC needs to know. Full history in `commons-decisions.md` D-001–D-171.

**5. Commons memory consolidation**
- `commons-schema.md` §24 already had the brokerage split annotation (D-169). Added §25 sync-series summary paragraph (D-167–D-171).
- `commons-forward-plan.md` Phase 2 candidates gained: `state`/`pincode` as public search filters (TODO(P2) tags in spec entries; when wired, re-add `public_detail` to audiences + address-line render on PropertyDetail); note on Google Places entry that `landmark` field is already spec-plumbed from Phase 1.5 Prompt 8, only the autocomplete flow needs wiring. Added "Sync notes (Phase 1.5 addendum)" section at end pointing at commons-decisions.md as source of truth.
- `commons-decisions.md` D-171 records this prompt.

Untouched: `<SpecField>`, `PROPERTY_FIELDS`, `PUBLIC_DETAILS_GRID_KEYS`, `PropertyDetail.tsx`, `useListingSave`, D-153/154 defense stack, D-160 trigger, D-091/111 boundaries, all migrations/RPCs/RLS/types.ts/config.toml/client.ts, `FurnishingEditor.tsx`, `AmenitiesEditor.tsx`, `Header.tsx`, `Footer.tsx`, `BottomNav.tsx`, `Index.tsx`.

Tests: **9 files / 82 tests pass** (no new tests — all changes are rename + spec-driven input). `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta). `grep maintenance_included[^_] src/pages/ListProperty.tsx` returns only the preview-payload comment (intentional). `grep furnishingItems src/pages/admin/PropertyEdit.tsx` returns only the D-171 comment.

**Phase 1.5 + Sync series complete.**

## [2026-07-14] refactor | Sync Prompt 4 — FurnishingEditor + AmenitiesEditor extracted as shared components; owner + admin both consume them; custom items editable on both surfaces [IST]

Consolidation of the last two duplicated JSONB editors (D-170). Diagnostic surfaced structural divergence not just visual: owner used decomposed local state (`furnishing_items` + `_counts` + `_sizes` + `_rooms` + `custom_furnishing` + `custom_amenities`) with `buildFurnishingDetail(f)` deriving the JSONB before patch; admin used raw JSONB state (`furnishingDetail: FurnishingDetailItem[]`) but had NO custom-items UI at all. User picked JSONB-canonical reconciliation — bigger refactor, keeps admin's per-item size/rooms metadata, gives admin custom-items UX for the first time.

**New shared type module** (`src/types/property.ts`): `FurnishingDetailItem` (was inline in both surfaces), `AmenitiesJson`, `buildAmenitiesJson(building, furnishingDetail)` — the JSONB derivation helper (previously owner-only as `buildAmenitiesJson(f)`). `@/config/property-form` re-exports `FurnishingDetailItem` for backward-compat.

**New shared component** `src/components/property/FurnishingEditor.tsx`: canonical checkbox grid over `FURNISHING_ITEM_OPTIONS` with per-item count (unless `yesNoOnly`), per-item size text (when `hasSizeText`), per-item rooms text (when `hasRooms`); custom items list with name+count+delete. Layout uses owner's `rounded border p-2` per-item card with `border-primary bg-accent/30` on checked. Emits full `FurnishingDetailItem[]` on every mutation.

**New shared component** `src/components/property/AmenitiesEditor.tsx`: canonical `BUILDING_AMENITIES` checkbox grid + custom string list. Value is a flat `string[]` — component derives canonical vs custom via a `Set<string>` of canonical values. Emits the flat array on every mutation.

**Owner FormState migration**: removed `furnishing_items`, `furnishing_counts`, `furnishing_sizes`, `furnishing_rooms`, `custom_furnishing`, `custom_amenities`. Added `furnishing_detail: FurnishingDetailItem[]`. Retained `building_amenities: string[]` with new semantic (flat, canonical+custom mixed). Deleted `CustomItem` interface — customs now live inside `furnishing_detail` with `custom: true`. Deleted `buildFurnishingDetail(f)` helper; deleted old form-taking `buildAmenitiesJson(f)` (replaced by shared 2-arg version).

Owner-touching sites updated in one pass: `prefillFormFromRow` hydrates `furnishing_detail` + flat `building_amenities` directly (dropped 5 lines of decomposition); `isSectionTouched` + `sectionSummary` for Sections 4/5 read new keys (`furnishing_detail.filter((it) => !it.custom || it.item.trim()).length`); `PropertyPreview` payload continues to send split `building_amenities` + `custom_amenities` (preview owns its own shape — split via `.filter` at the callsite so preview UX stays byte-identical). Section 4 render collapsed from 58 lines to a single `<FurnishingEditor value onChange>` call; Section 5 collapsed from 40 lines to a single `<AmenitiesEditor>` call. Both `onChange` handlers `setForm` + `patch()` (D-153 buffer preserved).

**Admin PropertyEdit changes**: deleted 3 admin-local const copies (`FURNISHING_ITEMS`, `BUILDING_AMENITIES`, `FURNISHING_ITEM_OPTIONS`) — imported from `@/config/property-form` (owner canonical was more complete: has `stove`, `chimney`, `fan`, `exhaust_fan`, `curtain_rod` vs admin's stale `curtains`). Deleted local `FurnishingDetailItem` interface — imported from `@/types/property`. Furnishing block collapsed from 65 lines to `<FurnishingEditor value={furnishingDetail} onChange={setFurnishingDetail} />`. Amenities block collapsed from 10 lines to `<AmenitiesEditor value={buildingAmenities} onChange={setBuildingAmenities} />`. handleSave amenities now derived via shared `buildAmenitiesJson(buildingAmenities, furnishingDetail)` — old inline `{ furnishing_items: furnishingItems, building: buildingAmenities }` gone; `furnishingItems` state var now dead (unused; scheduled cleanup).

**Constants unified**: `FURNISHING_ITEM_OPTIONS.hasSize` renamed `hasSizeText` for consistency with admin's naming (owner's `hasSize` was misleading — it drove a text input, not a numeric size). Single find-and-replace across `property-form.ts`.

**Visual parity**: shared components use owner's per-item card layout (`rounded border p-2 transition-colors` + accent on check). Admin's earlier layout differed slightly (`p-3`); extraction normalizes to owner canonical per prompt's "use owner's version as canonical" instruction. Admin now shows per-item size text on bed/mattress + rooms text on AC — same as before, plus the custom-items UX it lacked.

**Tests**: new `src/test/jsonb-editors.test.tsx` — 10 tests covering `FurnishingEditor` (renders standard + custom from value; toggles emit `{item, count}`; yesNoOnly emits `{item}` alone; `+ Add item` appends `{item:"", custom:true}`; removal on second toggle) + `AmenitiesEditor` (splits value into canonical vs custom; toggle adds/removes; `+ Add amenity` appends empty string) + `buildAmenitiesJson` (preserves flat building array; derives `furnishing_items` from non-custom detail entries). Full suite: **9 files / 82 tests pass** (was 8/72; +1 file, +10 tests). `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta; one drive-by narrowing cast in AmenitiesEditor to widen the Set generic).

**Public detail untouched** — PropertyDetail.tsx renders furnishing_detail + amenities via existing bespoke accordion/chips (display-only, out of scope per prompt).

Memory: D-170 in commons-decisions.md; CLAUDE.md gained the Sync Prompt 4 invariant. CLAUDE.md is at 438 lines (over the 200 heuristic) — trim deferred; each Phase 1.5 line is load-bearing.

## [2026-07-14] refactor | Sync Prompt 3 — brokerage column split (fixed_amount + months), gas_type None option, pet_policy admin migrated to SpecField select [IST]

Three data-drift fixes shipped (D-169). Schema changes already applied via MCP before this prompt — no migration files created here.

**1. Brokerage column split.** `rent_brokerage_amount` (overloaded — rupees when type=fixed, months when type=months) dropped. Two new nullable numeric columns: `rent_brokerage_fixed_amount` (rupees, populated when type=fixed) and `rent_brokerage_months` (months, populated when type=months). Zero rows had data at cutover — no backfill. Matches the D-131 `security_deposit_amount` + `security_deposit_months` precedent. `types.ts` regenerated via MCP.

Spec: `rent_brokerage_amount` entry deleted; two new entries with fail-safe `visibleWhen` (`listing_type !== 'sale'` + strict type match — `=== 'fixed'` and `=== 'months'` respectively). Both `ownerSection: 'rent_deposit'`, `audiences: ['owner_form', 'admin_form', 'public_detail']`, `editableBy: ['owner', 'admin']`, `input: 'number'`, `min: 0`.

Owner form (`ListProperty.tsx`): `FormState` / `INITIAL_STATE` / `prefillFormFromRow` / `mapFieldToDb` / `DB_COLUMN_TO_SECTION` all updated — 5 sites, single find-and-replace pattern per each. Bespoke dynamic-label brokerage `<Input>` at L1499-1515 replaced with two `<SpecField>` calls (each gated by spec `visibleWhen`); `formValues={{ listing_type, rent_brokerage_type }}` passed so predicate reads both. Dynamic label semantic removed — each field carries its own static label from spec (`"Brokerage amount (₹)"` / `"Brokerage (months of rent)"`).

Admin form (`admin/PropertyEdit.tsx`): `rentBrokerageAmount` state var split into `rentBrokerageFixedAmount` + `rentBrokerageMonths`. Hydration reads both DB columns separately. handleSave payload writes both. Single `<SpecField>` for the amount replaced with two.

Public detail (`PropertyDetail.tsx`): `PropertyData` interface + SELECT string extended with both new columns; old removed. Bespoke rent Card brokerage row now branches on type and reads the matching column. "As applicable" fallback dropped (dead code — each column is only meaningful for one type; the null-amount-but-set-type case is no longer reachable via the split).

**2. `gas_type` — 'None' option.** Spec `options` extended with `{value:'none', label:'None'}` at the head (inline; not touching the `GAS_TYPE_OPTIONS` constant so other consumers stay unchanged). CHECK constraint unchanged (`pipeline | cylinder | NULL`); the `'none'` sentinel is caller-side only, mapped to `null` on save.

Owner form: was bespoke `<Select>` at L1663 with hardcoded `GAS_TYPE_OPTIONS.map` (no None option → forced a selection). Replaced with `<SpecField>` — `value={form.gas_type || "none"}` for the display transform; `onChange` writes empty-string to local form (mapFieldToDb continues to translate "" → null) and explicit `dbPatch: { gas_type: null }` for the 'none' case.

Admin form: was bespoke `<Select>` at L1086 with a hardcoded `<SelectItem value="none">Not specified</SelectItem>` sentinel + duplicate Pipeline/Cylinder items. Replaced with `<SpecField>`. Existing handleSave payload logic `gas_type: gasType === "none" ? null : gasType || null` already handles the sentinel → NULL cast correctly, so no save-side change.

**3. `pet_policy` admin migrated to SpecField.** Was bespoke `<Input>` free-text with a `TODO(spec)` marker — legacy free-text values had blocked migration. Sync P1 MCP step normalized the 2 non-canonical rows ("No Pets Allowed" → `not_allowed`, "Pets Allowed" → `all_welcome`); all 20 rows now conform to the 4 canonical enum values (`not_allowed / small_only / all_welcome / case_by_case`). Admin swapped to `<SpecField fieldKey="pet_policy" surface="admin_form">`. `petPolicy` state var + save unchanged (still stores the enum string). Owner form was already `<SpecField>` — no owner change needed.

**Tests:** `src/test/property-fields.test.ts` — replaced the old `rent_brokerage_amount` compound-predicate test with two new tests (one per new column); added regression assertion that the old entry no longer exists in spec; added `gas_type` (3 options including 'none') and `pet_policy` (4 canonical options) assertions; updated addendum-shape iteration to enumerate both new brokerage keys. Full suite: **8 files / 72 tests pass** (was 68, +4). `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta).

`grep -rn rent_brokerage_amount src/` — only comment/test-reference hits remain (the D-169 migration comment in spec + the "removed from spec" regression assertion). Column fully purged from frontend.

Untouched: `<SpecField>` core (no new branches), `PUBLIC_DETAILS_GRID_KEYS` (brokerage stays bespoke), `useListingSave` + D-153/154 defense stack, D-160 rent/sale trigger, D-091 flat_number, D-111 admin direct-write, D-168 date branch. RPCs / triggers / RLS / migrations / config.toml / client.ts unmodified.

Memory: D-169 in commons-decisions.md; CLAUDE.md gained the Sync Prompt 3 invariant; commons-schema.md §24 annotated with the column split.

## [2026-07-14] refactor | Sync Prompt 2 — SpecField date branch implemented; 6 bespoke Popover+Calendar blocks replaced with spec-driven <SpecField input='date'> on owner + admin [IST]

Consolidation of the date-input fragmentation site (D-168). Diagnostic confirmed `SpecField` had no `case 'date'` (fell through to `default: return null`), and 3 date fields (`available_from`, `possession_date`, `property_tax_paid_upto`) each had bespoke Popover+Calendar blocks on both owner (`ListProperty.tsx`) and admin (`admin/PropertyEdit.tsx`) surfaces — 6 near-duplicate blocks total.

**Spec:** `PropertyFieldSpec` gained `datePickerOptions?: { warnOnPast?: string; maxDaysFromNow?: number }`. Extended 3 spec entries — `available_from` with the full D-146 config (`warnOnPast: "Available from is in the past — is this correct?"`, `maxDaysFromNow: 90`); `possession_date` and `property_tax_paid_upto` with empty `datePickerOptions: {}` (marker: the key's presence signals date-picker; no separate flag).

**SpecField `case 'date'`:** shadcn `<Popover>` + `<Calendar>` (mode single), value normalized via new `coerceDate()` (accepts `Date | ISO string | full ISO | null | undefined`, guards against `NaN`), `onSelect` emits `format(date, "yyyy-MM-dd")` or null. `disabled` predicate: always block `< 1900-01-01` baseline; when `maxDaysFromNow` is set, additionally block `> today + N days`. Amber warning `<p className="text-amber-600 text-xs mt-1">` renders below trigger when `warnOnPast` is set AND `isPastDate(selected)` (comparison at midnight — today is not flagged).

**Read-only branch** (public + owner/admin Tier-1-locked): date fields format via `format(new Date(value), "dd MMM yyyy")` regardless of spec `display()`. Applied to both `public_detail` card and shell read-only branches — single `displayText` derivation. Public rows for `possession_date` / `property_tax_paid_upto` / `available_from` now show `15 Jul 2026`, not raw ISO strings. Empty/null falls through to `formatFieldValue`'s em-dash for row-structure parity.

**Callsite pattern** (all 6 replaced): value is `Date` in local state; `onChange` emits `iso: string | null`. Bridge via `value={x as unknown} onChange={((iso) => …) as (v: unknown) => void}` — pragmatic vs. decoupling value in/out types in SpecField (would fragment the generic contract for one field type).

**Owner form (ListProperty.tsx):**
- `possession_date` block (was L1401-1416 bespoke, gated by `possession_status === 'under_construction'` outer conditional) → `<SpecField fieldKey="possession_date" surface="owner_form" formValues={{ possession_status: form.possession_status }}>`. `visibleWhen` from spec now gates render.
- `property_tax_paid_upto` block (was L1423-1438) → `<SpecField fieldKey="property_tax_paid_upto" surface="owner_form">`.
- `available_from` block (was L1480-1511 with inline warnOnPast IIFE + inline maxDaysFromNow disabled predicate) → `<SpecField fieldKey="available_from" surface="owner_form">`. Both D-146 behaviors now come from spec `datePickerOptions`.
- Unused imports removed: `Popover`/`PopoverContent`/`PopoverTrigger`, `Calendar`, `CalendarIcon`. `format` from `date-fns` retained (still used at L761 in `mapFieldToDb` + L1114 in preview).

**Admin form (admin/PropertyEdit.tsx):**
- `available_from` block (was L932-942) → `<SpecField surface="admin_form">`. **Deliberate behavior addition:** admin now shows amber past-date warning + 90-day future cap (parity with owner form; previously admin had neither). Justification: spec is source of truth; the rule applies everywhere the field renders. Admin can still pick past dates (warning, not block).
- `possession_date` block (was L963-973, gated by outer `possession_status === 'under_construction'` conditional) → `<SpecField formValues={{ possession_status: possessionStatus }}>`. `visibleWhen` now gates.
- `property_tax_paid_upto` block (was L979-989) → `<SpecField surface="admin_form">`.
- Unused imports removed: `Popover`/`PopoverContent`/`PopoverTrigger`, `Calendar`, `CalendarIcon`. `cn` retained (7 remaining uses); `format` retained (handleSave uses `format(d, "yyyy-MM-dd")` for DB payload).

**No behavior regression on owner form:** D-146 amber warning + 90-day cap preserved via spec. `possession_date` still conditionally rendered via spec `visibleWhen`. `property_tax_paid_upto` still shows unconditionally under `listing_type === 'sale'` branch. D-153/D-154 defense stack untouched. `useListingSave` untouched. RPCs/triggers/RLS/migrations/types untouched.

**Tests:** `src/test/property-fields.test.ts` +2 assertions: `available_from.datePickerOptions === { warnOnPast, maxDaysFromNow: 90 }`; `possession_date` + `property_tax_paid_upto` have `datePickerOptions` defined (empty). Full suite: **8 files / 68 tests pass**. `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta).

Memory: D-168 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the Sync Prompt 2 invariant.

## [2026-07-14] fix | Sync Prompt 1 — security deposit public display, cover auto-select on first upload, property_type label mapping, audience corrections on 3 spec entries [IST]

Five surface-bug fixes in one pass (D-167).

**1. Public deposit display** — new exported `formatDeposit(amount, months, rent)` helper on `PropertyDetail.tsx` (immediately below `formatIndianRupee`): prefers `security_deposit_amount` > 0 (annotates `(N months)` when months also set), falls back to `months × listed_rent`, then `2 × listed_rent` when both null. Replaced two render sites — the rent Card row at L1088 and the sidebar aside at L1356 (inside `COMMONS_HIDE` but kept in sync). Prior `depositAmount` const was NaN-prone when `security_deposit_months` was null despite the type saying NOT NULL; replaced with `depositDisplay`. `PropertyData` interface extended with `security_deposit_amount: number | null`; SELECT string extended to fetch it.

**2. `security_deposit_months` audience widened** — was `['admin_form']`; now `['owner_form', 'admin_form', 'public_detail']` with `editableBy: ['owner', 'admin']` and `ownerSection: 'rent_deposit'` (added to satisfy `validateSpec`). Matches actual usage — the 1/2/3 month chips indirectly reference; public deposit fallback reads. No new owner-form months input in this pass (chips continue to write to `security_deposit_amount` only, unchanged).

**3. `property_type` public label** — `PropertyDetail.tsx:955` badge now renders `PROPERTY_TYPE_OPTIONS.find(o => o.value === property.property_type)?.label ?? property.property_type` for the display label ("Apartment" instead of raw enum "apartment"). Defensive fallback to raw value for enum drift.

**4. `state` + `pincode` audiences narrowed** — removed `public_detail` (no render site). `// TODO(P2): re-add 'public_detail' if state/pincode become search filters or address-line renders` tags added above each entry.

**5. Cover auto-select on first upload** — new `src/lib/property-images.ts:ensurePrimaryPhoto(propertyId, uploadedImageId)`: reads primaries via `.select('id').eq('property_id', ...).eq('is_primary', true).limit(1)`, no-ops if any exist, else `UPDATE property_images SET is_primary = true WHERE id = uploadedImageId`. Fails closed on the count read (won't force-promote if state can't be verified). Called from both `ListProperty.tsx` (after both Path A and Path B upload branches) and admin `PropertyEdit.tsx`. Client-side `prevHadPrimary` snapshot mirrors the DB flip into local state so the "Cover" badge appears immediately without a refetch. Race window: two concurrent uploads on a zero-primary property could both self-promote — benign; owner resolves via manual "★ Cover" click. Manual `setPrimaryPhoto` handler untouched.

Data migration (applied via MCP before this prompt, D-167): 2 legacy `pet_policy` free-text rows mapped to canonical enum values — `"No Pets Allowed"` → `not_allowed`, `"Pets Allowed"` → `all_welcome`. All 20 rows now conform to `PET_POLICY_OPTIONS` (values `not_allowed / small_only / all_welcome / case_by_case`). Prep for Prompt 2 admin pet_policy Select migration.

D-153/154 buffering, D-160 trigger (unchanged), D-091/111 boundaries all preserved. Untouched: `<SpecField>`, `PROPERTY_FIELDS` entries beyond the 3 audience arrays, `PUBLIC_DETAILS_GRID_KEYS`, dates (deferred to Prompt 2), brokerage/pet_policy/gas_type wiring (deferred to Prompt 2), JSONB editors, `useListingSave`, migrations/RPCs/RLS.

Tests: new `src/test/format-deposit.test.ts` (5 assertions covering the 4 branches + zero-amount edge case); property-fields.test.ts +2 assertions (security_deposit_months audience widening; state/pincode narrowing). Full suite: 8 files / 66 tests pass. `npx tsc -p tsconfig.app.json --noEmit` = 360 (baseline, no delta).

Memory: D-167 in commons-decisions.md; CLAUDE.md Phase 1.5 gained the Sync Prompt 1 invariant.

## [2026-07-14] feature | Phase 1.5 addendum — move-in charges + brokerage wired end-to-end (4 cols on properties; spec + 3 surfaces; bespoke amount label + bespoke public Cards) [IST]

Regenerated `src/integrations/supabase/types.ts` via MCP: +85 / −1. Contains the 4 addendum columns (`move_in_charges_amount`, `rent_brokerage_type`, `rent_brokerage_amount`, `sale_brokerage_pct`) × 3 sections plus accumulated regens from Prompts 12/13 that weren't yet in the working copy. No unexpected drift.

Four spec entries added to `src/config/property-fields.ts` (D-166). Rent-side (`move_in_charges_amount`, `rent_brokerage_type`, `rent_brokerage_amount`) live in the `rent_deposit` section with `visibleWhen: (v) => v.listing_type !== 'sale'` — fail-safe pattern per D-161 (legacy null-listing_type rows render as rent). `rent_brokerage_amount` uses a compound `visibleWhen` reading BOTH `listing_type` and `rent_brokerage_type`, gated to `fixed`|`months`; SpecField's Prompt-10a signature `(values) => boolean` handles arbitrary predicates without any component change — architectural bet validated. `sale_brokerage_pct` lives in `sale` section with strict `=== 'sale'` (safe because sale is opt-in). Public formatters spec-declared for display: `₹{amount}` for move-in, `{pct}%` for sale brokerage. `PUBLIC_DETAILS_GRID_KEYS` deliberately NOT extended — bespoke public rendering per D-166.

`ListProperty.tsx` Section 3 gained a `"One-time charges"` sub-heading (`col-span-2 mt-2 pt-2 border-t border-border/60 text-xs font-semibold uppercase text-muted-foreground`) above the new rows — Section 3 rent mode hit 10 fields and needed the visual divider. Move-in charges and brokerage type render via `<SpecField>` with `formValues={{ listing_type: form.listing_type }}` for predicate gating. `rent_brokerage_amount` renders BESPOKE inline as a shadcn `<Input type="number">` inside a `<FormField>` — dynamic label flips between `'Amount (₹)'` (fixed) and `'Number of months'` (months) based on the sibling `rent_brokerage_type`; hidden entirely when type is `none` or unset. Same value preserved across type flips (single DB column, single form-state key). Spec entry still exists so admin surface + hydration + save all flow through `<SpecField>`. Sale section adds `sale_brokerage_pct` via `<SpecField>` right after `property_tax_paid_upto`. FormState + INITIAL_STATE + prefillFormFromRow + mapFieldToDb + DB_COLUMN_TO_SECTION all extended for the 4 new keys.

`admin/PropertyEdit.tsx`: 4 useState + hydration + save-payload entries + 4 `<SpecField surface="admin_form">` calls. Admin gets the static `'Brokerage amount'` label from spec (no dynamic overload — admins know what "amount" means in context). Passes `formValues={{ listing_type: listingType }}` (plus `rent_brokerage_type` for the compound predicate). Save via D-111 direct-write bypass.

`PropertyDetail.tsx`: PropertyData interface + SELECT extended for 4 new fields. Rent & Fees Card gets two bespoke rows inside the existing `space-y-2` one-time-costs block: `Move-in charges ₹{amount}` (hidden when null/0), `Brokerage ₹{amount}` for fixed / `Brokerage {N} month(s) rent` for months (respects singular/plural) / `Brokerage As applicable` fallback when type is set but amount is null. `none` and null type skip the row entirely. Sale Price Card gets `Brokerage {pct}%` line beneath expected/sqft (hidden when null/0). Same visual weight as sibling one-time-cost rows.

`property-fields.test.ts` gained 3 new assertions (all-4-entries shape guardrail, compound-visibleWhen truth table for `rent_brokerage_amount`, sale-only strict-equality behavior for `sale_brokerage_pct`) + a stale-count update (sale section now 9 fields, was 8). 59/59 tests pass across 7 files.

D-153/154 buffering, D-160 trigger (unchanged — none of the 4 fields are required for submit), D-111 admin bypass, D-091 flat_number invariant all preserved. Untouched: `<SpecField>` (compound predicate already supported), `useListingSave`, any migration/RPC/RLS/trigger, `PUBLIC_DETAILS_GRID_KEYS`, owner dashboard cards, admin queue, Search filters, Decisions tab.

Memory: D-166 appended to commons-decisions.md; commons-schema.md gained §24 (column-by-column table with the semantic-overload caveat + Phase 2 extraction note); CLAUDE.md Phase 1.5 gained the addendum invariant. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Phase 1.5 final baseline, no delta); `npx vitest run` = 7 files / 59 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 13 (final) — admin review detail shows full property + edit diff (G2); Decisions audit tab on /admin/listing-reviews with two-query merge (G3); Phase 1.5 complete [IST]

**G2** — `src/pages/admin/ListingReviewDetail.tsx` property snapshot expanded from ~12 fields to the full spec surface. `PropertyRow` interface extended with `flat_number` + all 7 Prompt-8 India columns (landmark, notice_period_months, annual_rent_increase_pct, water_storage, parking_2w_count, parking_4w_count, parking_notes) + all 9 Prompt-10 rent/sale columns (listing_type, sale_price, price_negotiable, expected_price_per_sqft, possession_status, possession_date, rera_registration_number, khata_type, property_tax_paid_upto). Snapshot now renders: an admin-only amber `Flat number` line at top (D-091 held — spec `audiences: ['admin_form']` means shared preview components never expose it publicly); a listing-type chip (Prompt 10b parity); a listing-type-conditional pricing block (Rent & Deposit for rent + legacy null-listing_type; Sale Details for sale, with `possession_date` conditional on `possession_status === 'under_construction'`); a Building & Society block with parking enum+count compound + water_storage + parking_notes; existing title/description/pet_policy/rules/notes sections preserved.

New `src/components/property-management/EditRequestDiff.tsx` — small focused component (label + proposedValue + liveValue) rendering the `Currently live: X` subtitle pattern in the same style as `OwnerPropertyManagement.FieldRow`. `ListingReviewDetail`'s pre-Prompt-13 3-column diff (label / current / proposed) was replaced with `<EditRequestDiff>` per changed field. Admin now sees the same visual pattern owners see (D-093 curated events).

**G3** — New third tab "Decisions" on `/admin/listing-reviews`. `TabValue` widened to `"new" | "edit" | "decisions"`; `TabsList` bumped to `grid-cols-3`; URL param `?tab=decisions` supported.

New `src/components/admin/DecisionsTab.tsx` fires TWO separate queries and merges client-side: `property_activity_log.select(*, properties(...), users:actor_id(...))` filtered on `action IN ('listing_approved', 'listing_rejected')` + `property_edit_requests.select(*, properties(...), users:reviewed_by(...))` filtered on `status IN ('approved','rejected','withdrawn','superseded')`. **Never UNION** — the anti-pattern is documented in D-165 and §23 to future-proof against consolidation attempts. Bulk photo prefetch via one `property_images.in('property_id', [...ids]).eq('is_primary', true)` query. Sort DESC by effective timestamp (`reviewed_at ?? created_at`).

Filters (all URL-persistent, all combinable): decision-type multi-select via checkboxes with colored badges — defaults to All; auto-restores to All if user unchecks everything (prevents "empty filter = zero rows" confusion). From/To date range on effective timestamp. Single-select Admin dropdown built from distinct actors in the merged set. Single-select City dropdown same. Reason cell truncated to 60 chars with tooltip on hover. Per-row subtitle `Currently: {getStatusDisplay(row.property.status).label}` — historical decision vs present state (a listing approved months ago might now be archived).

Row click → `/owner-dashboard/property/:id` (owner property-management page's Activity Timeline is the richer historical surface — no separate admin decision-detail page).

Legacy-data resilience baked in: null `payload.reason` on pre-Prompt-11 `listing_rejected` rows → reason cell shows "—"; null `reviewed_by` on withdrawn/superseded → "Owner" for withdrawn, "—" for superseded; rows where `properties` join returned null (property hard-deleted via Prompt 12 RPC) → filtered out silently client-side. `mergeDecisionRows` exported as a pure function; 7 test assertions cover merge/sort, legacy-null tolerance, effective-timestamp fallback, hard-deleted filtering, and photo attachment.

Preserved: existing approve/reject flows (Prompt 11 RPCs unchanged), current photos gallery, prior revisions section, page navigation. D-153/154 buffering, D-111 admin bypass, D-091 flat_number invariant, D-093 curated events all preserved. Untouched: any migration, any RPC/trigger/RLS, `useListingSave`, `SpecField`, `PROPERTY_FIELDS`, `PropertyDetail`, owner-facing pages, admin `PropertyEdit`. No `types.ts` regen — Prompts 7/9/11/12 kept it in sync; no new schema in Prompt 13.

Memory: D-165 appended to commons-decisions.md; commons-schema.md gained §23 (data-source table by decision kind + never-UNION anti-pattern note + photo prefetch pattern + row-nav rationale); CLAUDE.md Phase 1.5 gained the review-detail + Decisions-tab invariant and the "Phase 1.5 complete" marker. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 12 baseline, no delta); `npx vitest run` = 7 files / 55 tests pass (added 7 assertions in decisions-tab.test.ts).

## [2026-07-14] feature | Phase 1.5 Prompt 12 — admin properties gained filter/search/owner column + delete-draft (via RPC) and restore-archived row actions [IST]

Regenerated `src/integrations/supabase/types.ts` via MCP: +73 / −1. Diff includes the expected additions from every schema shipment since the last regen — the new `admin_delete_draft_property` RPC (Prompt 12), plus `activity_log_id` on `owner_action_acknowledgments` (Prompt 11), `property_listing_type` enum + 9 rent/sale columns (Prompt 9), 7 India columns (Prompt 7), `reject_property_listing` RPC (Prompt 11). No unexpected drift.

Rewrote `src/pages/admin/Properties.tsx` (D-164). Status filter Select: 8 Commons options (labels from `getStatusDisplay()`) + "Legacy PM" bucket (`.in('status', LEGACY_PM_STATUSES)` covering `inspection_proposed|inspection_accepted|inspection_scheduled|inspected|agreement_pending|occupied|off_market|expiring|turnover|inactive`). Server-side status filter for perf; client-side search over the fetched set. Search Input covers building_name + owner.full_name + owner.email + owner.phone (case-insensitive substring after 300ms debounce). URL params `?status=` and `?q=` persist filter/search across reloads and back-nav (`setSearchParams({ replace: true })`).

Owner column extended: join stays `owner:users!properties_owner_id_fkey(...)` but now selects `email` and `phone` too — used in the search haystack only; visible cell still shows `full_name` (fallback "—") per D-091 privacy. Search predicate extracted as pure `filterPropertiesBySearch()` export for test coverage.

Row actions gated by status:
- **Delete draft** (destructive, visible when `status='draft'`) → shadcn AlertDialog → `supabase.rpc('admin_delete_draft_property', { p_property_id })`. RPC pre-checks applications and visits and RAISEs with a legible message ("Property has N applications; archive instead") — surfaced via toast. Successful delete → refetch, toast "Draft deleted". CASCADE FKs handle `property_images` (R2 photo files remain — separate cleanup job scoped post-launch), `property_activity_log`, `property_edit_requests`, `property_inspections`, `favourites`, `inspection_callbacks`.
- **Restore** (secondary, visible when `status='archived'`) → AlertDialog → direct `.update({ status: 'unlisted' })`. Admin bypasses `enforce_property_owner_transitions` via `is_admin()`. `property_activity_log_writer` records the transition. Refetch + toast "Property restored to unlisted".

Row layout switched from `<button>` to `<div role="button" tabIndex={0}>` so nested action buttons don't create invalid DOM. Action `onClick`s call `e.stopPropagation()` so their clicks don't bubble to the row's navigate handler. Both mobile and desktop layouts include the action buttons.

New test `src/test/admin-properties.test.ts` — pure-function coverage of `filterPropertiesBySearch` (empty query, case-insensitive building match, owner name/email/phone matches, null-owner tolerance, no-match) + STATUS_FILTER_OPTIONS shape + LEGACY_PM_STATUSES completeness. 9 assertions, all pass. Full suite: 6 files / 48 tests pass.

Preserved: existing "Edit" navigation (row-scope click still goes to `/admin/properties/:id`), STATUS_COLORS map + badge rendering, applications/rents secondary queries, mobile+desktop layouts. Untouched: any migration, any RPC/trigger/RLS, `useListingSave`, `SpecField`, `PROPERTY_FIELDS`, admin `PropertyEdit`, D-153/154, D-091/110/111 boundaries.

Memory: D-164 appended to commons-decisions.md; commons-schema.md gained §22 (RPC signature + guard sequence, FK table grouped by delete rule with post-delete R2 cleanup caveat, RLS reference); CLAUDE.md Phase 1.5 gained the admin-properties invariant. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 11 baseline, no delta); `npx vitest run` = 6 files / 48 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 11 — comms shipped (H1 rejection panel, H2 activity_log_id ack scoping, H3 StatusGuidance); schema via MCP (rpc + trigger skip + ack column) [IST]

Wired D-163 owner comms end-to-end. Regenerated `src/integrations/supabase/types.ts` via MCP: +69 insertions / −1 (BOM strip) — exactly the expected additions: `activity_log_id: string | null` on `owner_action_acknowledgments` Row/Insert/Update + FK reference + `reject_property_listing` in Functions. No unexpected drift.

Two new shared components in `src/components/property-management/`: `StatusGuidance.tsx` (H3) reads `STATUS_CONFIG[status].guidance` via `getStatusDisplay` and renders a muted neutral card with Info icon + heading + body; not amber (amber palette reserved for rejection). `RejectionPanel.tsx` (H1/H2) fetches the most recent `property_activity_log` row where `action IN ('listing_rejected', 'edit_rejected')`, checks `owner_action_acknowledgments` scoped to the specific `activity_log_id`, renders an amber `AlertCircle` panel with heading (differs for edit vs listing), reason label, optional italic reason_text, and a `mailto:support@reeve.in` support line. "Got it" button upserts an ack scoped to the log entry via `onConflict: "user_id,target_type,target_id,activity_log_id"` — hides the panel for that specific rejection. Subsequent admin rejection creates a new log row → new activity_log_id → no matching ack → panel reappears (D-141 resolved).

`OwnerPropertyManagement.tsx`: replaced inline `changes_requested` banner (L316-330 pre-refactor) with `<StatusGuidance>` + `<RejectionPanel>` inside the Details tab. Deleted local `ackId`, `banner` state, `acknowledgeBanner` callback, and the property-scoped ack query from the Promise.all fetch. Removed the changes_requested reason-computation block.

`ListProperty.tsx`: replaced inline changes-requested banner with `<StatusGuidance>` + `<RejectionPanel>` in edit mode (`isEditMode && propertyId && entryStatus not in {loading,blocked,create}`). Deleted local `showChangesBanner`, `changesRejectionText` state; `acknowledgeBanner` callback; property_edit_requests rejection query + property-scoped ack query. Both components are self-contained — no local wiring needed.

`admin/ListingReviewDetail.tsx`: `requestChangesOnNewListing` swapped from the two-step UPDATE + INSERT-log (D-118) to a single `reject_property_listing(p_property_id, p_reason, p_reason_text)` RPC call. Trigger `property_activity_log_writer` skips its automatic log write when transitioning to `changes_requested` (applied via MCP) — the RPC owns that log entry, no double-log.

Support email verified `support@reeve.in` throughout `src/` (Footer, Contact, Privacy, MyPropertyDetail, propertyStatus.ts guidance bodies) — no D-139 hygiene fixes needed. STATUS_CONFIG.guidance already populated with locked copy in Phase 1.5 Prompt 1.

Tests: new `src/test/rejection-panel.test.tsx` — 6 assertions across RejectionPanel + StatusGuidance including D-141 acceptance (second rejection reappears when no ack matches the new activity_log_id). All 39 tests pass across 5 files.

Memory: D-163 appended to commons-decisions.md; commons-schema.md gained §21 (RPC signature, unique-index shape with NULLS NOT DISTINCT rationale, trigger skip behavior, ack backfill note); CLAUDE.md Phase 1.5 gained the comms-shipped invariant.

D-153/154 buffering + defense stack, D-111 admin bypass, D-091 flat_number invariant all preserved. `useListingSave`, `SpecField`, spec entries, admin PropertyEdit surface (Prompt 10b) all untouched. No migration files added — schema was applied directly via MCP. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 10b baseline 360, no delta); `npx vitest run` = 5 files / 39 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 10b — rent/sale wired end-to-end (admin form + public detail + search filter + card badges); D-162 completes the rent/sale wire [IST]

Wired the remaining 4 surfaces to `listing_type` (D-162), completing rent/sale end-to-end.

Admin `PropertyEdit.tsx`: added 9 state vars + hydration + save-payload entries for listing_type + 8 sale columns. Rendered `listing_type` `<SpecField>` at top of Listing Details (admin freely editable, no Tier-1 lock — D-111 bypass). Wrapped rent-only fields (listed_rent, security_deposit_amount, society_maintenance_approx, maintenance_included_in_rent, security_deposit_months, available_from, notice_period_months, annual_rent_increase_pct) in `{listingType !== 'sale' && ...}`. Sale-only block gated on `=== 'sale'` with 6 SpecFields + 2 bespoke Popover-Calendars (possession_date conditional on under_construction; property_tax_paid_upto unconditional). Passed `formValues={{ listing_type: listingType }}` to the two India rent fields so their spec-declared predicates evaluate on this surface too.

Public `PropertyDetail.tsx`: extended PropertyData interface + SELECT for 9 rent/sale columns. Prominent price block is now a ternary — `listing_type === 'sale'` renders a mirror-weight Sale Price Card (`₹{sale_price}` bold + `Negotiable` when true + `Expected ₹{X}/sqft` secondary); rent branch preserved byte-identical. Details-grid `<SpecField>` calls now pass `formValues={propertyRow}` so `possession_date`'s spec `visibleWhen(v.possession_status === 'under_construction')` evaluates against the row — hidden on ready_to_move/new_launch listings.

`src/config/property-fields.ts`: extended `PUBLIC_DETAILS_GRID_KEYS` with 5 sale-side rows (`possession_status`, `possession_date`, `rera_registration_number`, `khata_type`, `property_tax_paid_upto`) — `sale_price` / `price_negotiable` / `expected_price_per_sqft` stay bespoke in the prominent price block. No spec entry changes (Prompt 10a finalized them).

Search `Search.tsx`: imported `useSearchParams` + `cn`. Added `[For Rent] [For Sale]` toggle above search bar with URL `?type=` writeback + sessionStorage `search_listing_type` persistence (precedence URL > session > default rent). Added `.eq('listing_type', listingType)` to the SELECT chain. Skipped the rent-only budget filter (`gte/lte listed_rent`) when `listingType === 'sale'` so sale rows aren't excluded (sale-price filter deferred; existing budget UI stays visible). Extended SELECT with `listing_type, sale_price, possession_status`. Added `listingType` to fetchProperties useCallback deps so toggling triggers refetch.

Owner dashboard `PropertyCard.tsx`: added optional `listing_type` prop (fail-safe default rent when absent). Small muted chip renders next to title — muted styling so status stays primary. Extended OwnerDashboard SELECT + Property interface with `listing_type`.

Admin queue `ListingReviewQueue.tsx`: extended both SELECTs (new listings + edit-request properties) with `listing_type`. `QueueRow` gained optional `listingType` prop; renders a muted `For Rent`/`For Sale` badge first in the badges row. Both call sites pass through.

D-111 direct-write bypass, D-153 buffering, D-154 defense stack, D-091 flat_number invariant all preserved. `useListingSave` / owner form / spec entries untouched. Trigger already branched per D-160 via MCP.

Admin PropertyEdit gained a runtime-shape-preserving `data as unknown as PropertyData` + `data as unknown as Record<string, unknown>` cast to sidestep Supabase's SelectQueryError inference cascade — surgical, no runtime effect; side benefit: cleaned up 55 pre-existing baseline errors in that hydration block.

property-fields.test.ts: added 1 new assertion — `PUBLIC_DETAILS_GRID_KEYS` includes the 5 sale-side rows and excludes the 3 bespoke price fields. 33/33 tests pass.

Memory: D-162 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the wired-end-to-end invariant with fail-safe pattern restated. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 10a baseline 415, delta −55 from the admin cast collapsing the SelectQueryError cascade — well within tolerance); `npx vitest run` = 4 files / 33 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 10a — rent/sale wired on owner form (9 spec entries + visibleWhen support + Sale section conditional); trigger already applied per D-160 [IST]

Wired D-160 rent/sale schema into `PROPERTY_FIELDS` + `<SpecField>` + owner form (D-161). SpecField gained `formValues` prop + `visibleWhen` gate: when spec entry has `visibleWhen(values)` predicate and `formValues` is passed, predicate false → renders null; undefined `formValues` with defined predicate → renders with a one-shot DEV console.warn (fail-safe, no silent drops). Used `isFieldVisible` helper from Prompt 2.

Spec additions in `src/config/property-fields.ts`: `listing_type` at top of array (Tier-1 locked, requiredOwner, options rent/sale, ownerSection 'location'); 8 sale-only fields under ownerSection='sale' — `sale_price` (requiredOwner, ₹ formatter), `price_negotiable` (switch, display 'Negotiable'/blank), `expected_price_per_sqft` (₹/sqft formatter, "manual estimate" helper), `possession_status` (requiredOwner, 3 options), `possession_date` (visibleWhen possession_status==='under_construction', publicLabel 'Possession from' per D-135), `rera_registration_number`, `khata_type` (A/B/N/A), `property_tax_paid_upto`. Activated 2 existing entries with `visibleWhen: (v) => v.listing_type !== 'sale'` — `notice_period_months` and `annual_rent_increase_pct` (Prompt 8 TODO(P10) tags removed).

ListProperty.tsx: extended FormState with 9 new fields, INITIAL_STATE defaults (listing_type='rent'), prefillFormFromRow, mapFieldToDb (dates handled via explicit dbPatch from Calendar handlers), DB_COLUMN_TO_SECTION (all 9 → section 3). Rendered listing_type toggle above the accordion via `<SpecField>`; readOnly when entryStatus not in {create, draft, changes_requested} — Tier-1 lock at caller (D-161 rationale: matches how other Tier-1 fields work today; no global auto-derive from spec.tier yet). Section 3 slot flipped to dual-mode via `form.listing_type === 'sale'` ternary: title "Sale Details" vs "Rent & Deposit", body switches. Sale body renders 8 fields via `<SpecField>` + 2 bespoke Popover-Calendar controls (possession_date conditional on under_construction; property_tax_paid_upto unconditional) — spec input='date' but SpecField doesn't own compound picker. Rent body preserved byte-identically. isSectionComplete / isSectionTouched / sectionSummary for section 3 now branch on listing_type — sale-required set is {sale_price, possession_status} + {possession_date if under_construction}.

D-153 buffering / D-154 defense stack / D-111 admin bypass / D-091 flat_number all preserved. useListingSave unchanged. Trigger already branched per D-160 via MCP — not modified. Added inline code comment near submit noting trigger-side validation.

property-fields.test.ts: added 5 new assertions (listing_type Tier-1 + required + 2 options; possession_date visibleWhen semantics; rent-only fields hide on sale + fail-safe on empty values; 8 sale fields all ownerSection=='sale' + all 3 audiences; sale-required per D-160). Updated stale Prompt-2 assertion (`sale` section length 0 → 8). All 32 tests pass.

Memory: D-161 appended to commons-decisions.md; CLAUDE.md Phase 1.5 replaced the "wiring in Prompt 10" invariant with the shipped state + Prompt 10b scope. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (Prompt 9 baseline, no delta); `npx vitest run` = 4 files / 32 tests pass.

## [2026-07-14] schema | Phase 1.5 Prompt 9 — rent/sale schema applied via MCP (property_listing_type enum + 9 cols on properties); types.ts regenerated; trigger update deferred to Prompt 10 per D-160 [IST]

Migration `phase_1_5_prompt_9_rent_sale_schema` already applied to project `tfutuqqcxqqbirnsdpvz` via MCP — no file added to `supabase/migrations/`. New enum `public.property_listing_type` with values `'rent'`, `'sale'`. New column `listing_type property_listing_type NOT NULL DEFAULT 'rent'` on `properties`. Eight nullable sale columns: `sale_price` (CHECK ≥ 0), `price_negotiable`, `expected_price_per_sqft` (CHECK ≥ 0, manual input — not auto-derived), `possession_status` (CHECK IN ready_to_move/under_construction/new_launch), `possession_date` (sale-equivalent of `available_from` per D-135), `rera_registration_number`, `khata_type` (CHECK IN A/B/not_applicable), `property_tax_paid_upto`. All 20 existing rows backfilled with `listing_type = 'rent'` — backward-compatible. No trigger / RLS / RPC changes in this prompt.

Regenerated `src/integrations/supabase/types.ts` via MCP `generate_typescript_types`. Diff = 51 insertions / 1 deletion: enum type + const array (2 lines), 9 cols × 3 sections (Row/Insert/Update) = 27 lines, plus one BOM stripped from line 1 (identical benign normalization as Prompt 7). No drift on other tables, RPCs, or enums. Verified: `listing_type: Database["public"]["Enums"]["property_listing_type"]` on Row (NOT NULL); 8 sale cols all nullable; enum literal `"rent" | "sale"`.

Not wired: `PROPERTY_FIELDS`, `<SpecField>`, `ListProperty`, admin `PropertyEdit`, `PropertyDetail`, `PUBLIC_DETAILS_GRID_KEYS`, `visibleWhen` on rent-only fields — all deferred to Prompt 10.

**D-160 trigger-blocker warning logged:** `enforce_property_owner_transitions` trigger (supabase/migrations/20260710120600_add_commons_rls_and_triggers.sql:229-247) hardcodes 7 rent-only required fields for the `pending_review` submit gate. Sale listings will fail submit with "required fields missing (listed_rent, security_deposit_amount, furnishing, available_from …)" until Prompt 10 branches the trigger on `NEW.listing_type` — for `'sale'`, required set becomes `locality`, `building_name`, `bhk`, `sale_price`, `possession_status` (plus `possession_date` when `possession_status = 'under_construction'`). Also flagged the `unlisted` edit-lock block (L253-269) which currently references rent-only fields and needs a matching sale branch.

Memory: commons-schema.md gained §20 column-by-column table + backfill audit note; commons-decisions.md gained D-160 with the trigger-blocker directive; CLAUDE.md Phase 1.5 gained the rent/sale-applied invariant + Prompt-10 trigger warning. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (Prompt 8 baseline, no delta); `npx vitest run` = 4 files / 27 tests pass; `git diff --stat` scope: types.ts + 4 memory files, no other file touched.

## [2026-07-14] feature | Phase 1.5 Prompt 8 — India fields wired end-to-end (spec + 3 surfaces); notice_period_months visibleWhen deferred to Prompt 10; parking compound public display bespoke; all other fields spec-driven [IST]

Wired 7 India columns from Prompt 7 across the 3 surfaces via `PROPERTY_FIELDS` + `<SpecField>` (D-159). Spec additions in `src/config/property-fields.ts`: `landmark` (location, owner/admin/public), `notice_period_months` (rent_deposit, all 3, `display: v month(s)`, TODO(P10) tag for visibleWhen once listing_type ships), `annual_rent_increase_pct` (rent_deposit, all 3, `display: v% annually` per D-136 always-public), `water_storage` (building_society, all 3, 4-option select matching CHECK constraint from §19), `parking_2w_count` / `parking_4w_count` (building_society, owner+admin only — public renders compound formatter), `parking_notes` (building_society, all 3, textarea). Extended `PUBLIC_DETAILS_GRID_KEYS`: added water_storage, notice_period_months, annual_rent_increase_pct, parking_notes; REMOVED parking_2w / parking_4w (now compound-bespoke in PropertyDetail).

`ListProperty.tsx`: FormState + INITIAL_STATE + prefillFormFromRow + mapFieldToDb extended for 7 new fields; DB_COLUMN_TO_SECTION map (D-154) updated. Section 1 gets landmark via new `<SpecField>`. Section 3 gets notice_period + rent_increase via `<SpecField>` in same grid. Section 5 (bespoke) gets water_storage `<SpecField>` + parking count `<SpecField>` inline next to each enum select in a 2-col grid (renders 4 cells now: 2w enum, 2w count, 4w enum, 4w count) + parking_notes below.

`admin/PropertyEdit.tsx`: state + hydration + handleSave payload extended for 7 fields. JSX inserts: notice/rent_increase after available_from picker in Listing Details, landmark at end of Listing Details, water_storage + parking counts inline with parking selects in Utilities & Policies, parking_notes below. All routed through `<SpecField surface="admin_form">`.

`PropertyDetail.tsx`: PropertyData interface extended with 7 fields; SELECT string extended with the 7 columns. Bespoke "Near {landmark}" subtitle added to the Location block below city. Compound parking rows appended inside details grid via an IIFE — computes `"{parkingLabel(enum)} · {count} slots"` (or singular "slot") when either enum is present (!== 'none') or count > 0; hides row entirely when both are empty; reuses existing `parkingLabel` helper. Same card DOM as SpecField's public_detail branch. Cast `propRes.data as unknown as PropertyData & { amenities: unknown }` to sidestep Supabase's SelectQueryError inference cascade that triggers on long SELECT strings (surgical, no runtime effect).

`property-fields.test.ts`: added 3 new assertions — water_storage 4-option guardrail (values sump_only/overhead_only/both/none), parking_count fields not in public audiences (compound-formatter contract), annual_rent_increase_pct formatter matches D-136 copy. All 27 tests pass.

D-153 buffering / D-154 defense stack / D-111 admin bypass / D-091 flat_number all preserved. SpecField unchanged. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (Prompt 7 baseline 419, delta -4 — the raw cast in PropertyDetail also cleaned up 4 pre-existing SelectQueryError cascades in that same block); `npx vitest run` = 4 files / 27 tests pass. Memory: D-159 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the wired invariant.

## [2026-07-14] schema | Phase 1.5 Prompt 7 — India fields schema applied directly via MCP (7 cols on properties); types.ts regenerated; spec/surface wiring deferred to Prompt 8 [IST]

Migration `phase_1_5_prompt_7_india_fields_schema` already applied to project `tfutuqqcxqqbirnsdpvz` via MCP — no file added to `supabase/migrations/`. Seven nullable columns on `public.properties`: `parking_2w_count integer DEFAULT 0`, `parking_4w_count integer DEFAULT 0`, `parking_notes text`, `landmark text`, `notice_period_months integer DEFAULT 1`, `annual_rent_increase_pct numeric` (CHECK 0–100), `water_storage text` (CHECK IN sump_only/overhead_only/both/none). No RLS, trigger, or RPC change.

Regenerated `src/integrations/supabase/types.ts` via MCP `generate_typescript_types`. Diff = 22 insertions / 1 deletion: 7 columns × 3 sections (Row/Insert/Update) = 21 lines, plus one BOM stripped from line 1 (MCP writes UTF-8 without BOM; prior file had a leading BOM — benign metadata normalization, no runtime effect). No drift on other tables, RPCs, or enums.

Not wired: `PROPERTY_FIELDS`, `<SpecField>`, `ListProperty`, admin `PropertyEdit`, `PropertyDetail`, save handlers, `PUBLIC_DETAILS_GRID_KEYS` — all deferred to Prompt 8. Semantics locked for Prompt 8: `parking_*_count` complements (not replaces) enum `parking_*` (enum = availability, count = quantity); `notice_period_months` rent-only (gate via `visibleWhen` on `listing_type === 'rent'` when Prompt 9 lands rent/sale); `annual_rent_increase_pct` always public per D-136; `water_storage` uses CHECK-string not Postgres ENUM.

Memory: commons-schema.md gained §19 column-by-column table with defaults/constraints/notes; CLAUDE.md Phase 1.5 gained the schema-applied invariant. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (Prompt 6 baseline, no delta); `npx vitest run` = 4 files / 24 tests pass; `git diff --stat` scope: types.ts + 3 memory files only, no other file touched.

## [2026-07-14] fix | Phase 1.5 Prompt 6 — quick UI wins bundle (E1/E2 status labels, A1 optional-section validation, A2 red asterisks, B3 date warnings, J1 2-checkbox, F2 self-redirect removed, B1 focus ring, B2 EV Charging) [IST]

Executed 9-item quick-wins bundle. E1 was a no-op — owner surfaces (OwnerDashboard/PropertyCard, OwnerPropertyManagement, ListProperty header) already route status renders through `getStatusDisplay()` from Prompts 3–5. MyPropertyDetail (legacy PM) intentionally untouched per handoff.

E2: `PublicTimeline.summaryFor` extended to read `payload.from_status`/`to_status` and render `"${getStatusDisplay(from).label} → ${getStatusDisplay(to).label}"` when present, falling back to `payload.summary` then per-action hardcoded string. Never renders raw enum codes to the public.

A1 (D-144): Added `openedSections: Set<SectionNum>` state to ListProperty (seeded with `1` since section-1 auto-opens on mount). Accordion `onValueChange` records opened sections. `isSectionComplete` for optional-only sections (5, 6, 8) now returns true only when the section has been opened OR any of its fields is truthy. Sections 1/2/3/4/7/9 unchanged.

A2: New `SectionShell.required` prop renders `<span className="text-destructive">*</span>` after the title on the 5 required sections (1, 2, 3, 7, 9). `<SpecField surface="owner_form">` renders the same asterisk when the spec entry has `requiredOwner: true`; admin/public branches untouched. `Shell.label` and `FormField.label` widened from `string` to `React.ReactNode` to carry the JSX asterisk without stringifying it. `Available from` bespoke field gets the asterisk inline via `<FormField label={<>Available from <span…>*</span></>}>`.

B3 (D-146): `available_from` Calendar `disabled` prop rejects dates > today + 90 days. Below the picker, an amber warning renders whenever the selected date < today: "Available from is in the past — is this correct?" Immediate on selection; not blocking.

J1 (D-148): Added `terms_privacy_consent: boolean` to `FormState` + `INITIAL_STATE` + `prefillFormFromRow`. Section 9 renders a second required checkbox: "I agree to Reeve's Terms of Service and Privacy Policy" — both `/terms` and `/privacy` open in a new tab (`target="_blank" rel="noopener noreferrer"`). `isSectionComplete(9)` requires both consents; `isSectionTouched(9)` requires either. Submit button `disabled` condition extended with `!form.terms_privacy_consent`. Note: prompt title said "3-checkbox pattern" but Fix instruction specified 2 total (existing + Terms/Privacy) — implemented 2 as per Fix text; discrepancy logged in D-158.

F2 (D-151): Deleted the `/u/:userId → /me` self-redirect useEffect from `PublicProfile.tsx`. PostHog `commons_profile_viewed` now emits `self: user.id === userId` for both self and cross-user views. `navigate` retained for the "Go back" button on notFound.

B1: `AccordionContent` in `SectionShell` now has `className="pt-2 px-1"` — 4px horizontal padding gives focus rings breathing room so they don't clip against Radix's `overflow-hidden` animation container.

B2: Appended `{ value: "ev_charging", label: "EV Charging" }` to `BUILDING_AMENITIES` in `src/config/property-form.ts`. Owner Section 5 amenity grid picks it up automatically (bespoke JSX per Prompts 3–5 already renders the full constant).

Memory: D-158 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the Prompt-6 UI conventions line. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (Prompt 5 baseline, no delta); `npx vitest run` = 4 files / 24 tests pass; no errors in any touched file. No touches on useListingSave.ts / config.toml / client.ts / types.ts / admin PropertyEdit / Prompt 5's PropertyDetail scalar refactor.

## [2026-07-14] refactor | Phase 1.5 Prompt 5 — public PropertyDetail scalar rows driven by PROPERTY_FIELDS via <SpecField surface='public_detail'>; audiences is the single knob; flat_number invariant enforced; visual parity preserved [IST]

Implemented the real `surface="public_detail"` branch in `src/components/property/SpecField.tsx` — emits the exact card DOM PropertyDetail used pre-refactor (`flex items-start gap-2.5 rounded-lg border border-border bg-card p-3` shell + `mt-0.5 text-muted-foreground` icon span + `text-[11px] text-muted-foreground` label + `text-sm font-medium text-foreground` value). Icons resolved from `spec.displayIcon` string via `PUBLIC_ICON_REGISTRY` (Lucide: home, maximize, building, layers, droplets, wind, compass, calendar-days, armchair, car, bike, key-round, paw-print — 13 icons). Unknown icon → row still emits label + value (safe fallback).

Rewired `src/pages/PropertyDetail.tsx` Property Details grid (L1092–1108) to loop over exported `PUBLIC_DETAILS_GRID_KEYS` from `@/config/property-fields`, filtering via `shouldShowGridField` predicate that preserves the pre-refactor visibility semantics (`floor_number/total_floors: != null` keeps 0; others truthy; parking excluded when === "none"). Removed the 13 `detailItems.push` statements. Preserved existing bespoke helper functions (`bhkLabel`, `furnishingLabel`, `parkingLabel`) — still used in the property header/other sections.

Extended `src/config/property-fields.ts`: populated `displayIcon` on all 13 grid fields, added `publicLabel` overrides where the public page uses different casing ("BHK Type", "Floor", "Building Age", "2-Wheeler Parking", etc.), fixed `building_age_years` formatter from `${v} year(s)` to `~${v} yrs` matching current page output, added new spec entry `main_door_lock_type` (audiences `['admin_form', 'public_detail']`), added `PUBLIC_DETAILS_GRID_KEYS` exported constant (single-knob for grid membership + order — deliberately preserves pre-refactor page order which differs from implicit spec-section order; TODO(spec) in Prompt 6 to reconcile).

D-091 preserved: `flat_number` has zero occurrences in PropertyDetail.tsx and remains `audiences: ['admin_form']`-only in spec. Sensitive-field audit clean: `flat_number_revealed`, `board_status`, `auto_accept_enabled`, `owner_diet/pet/tenant_type_preference`, `legal_owner_name`, `is_active`, `listed_at`, `created_at` all admin_form-only. `status` retains public_detail audience for the bespoke status badge (not in the grid loop). All `COMMONS_HIDE` blocks, `{false && …}` blocks, gallery, floor-plan carousel, price/rent block, amenity chips, furnishing_detail JSONB accordion, address block, activity timeline, "about the owner", CTAs, and Google Maps embed untouched.

Memory: D-157 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the public-surface invariant (audiences+PUBLIC_DETAILS_GRID_KEYS as single knob; D-091 flat_number restated). Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (Prompt 4 baseline 419, no delta); `npx vitest run` = 4 files / 24 tests pass; owner/admin surfaces untouched (ListProperty.tsx, admin/PropertyEdit.tsx, useListingSave.ts all unchanged).

## [2026-07-14] refactor | Phase 1.5 Prompt 4 — admin PropertyEdit scalars driven by PROPERTY_FIELDS via <SpecField surface='admin_form'>; all admin-only fields wired; status badge + D-111 bypass untouched [IST]

Rewired 22 scalar fields in `src/pages/admin/PropertyEdit.tsx` to consume PROPERTY_FIELDS via `<SpecField surface="admin_form">`: Sections 1 (Basic Details), 2 (Listing Details), Furnishing scalar, Parking selects, Rules (building_rules + building_notes), Description. Added previously-missing spec-driven fields to the admin form + hydration + save payload: `state`, `security_deposit_amount`, `building_notes`, `flat_number_revealed`. Added a new read-only Metadata section: `listed_at`, `created_at`, `board_status` (edit deferred — spec has no curated options yet). Extended spec (`src/config/property-fields.ts`) with two admin-only entries: `legal_owner_name` and `security_deposit_months`.

Bespoke stays: publish toggle (Live/Hidden badge treatment), utility switches (compact 3-col grid layout), `gas_type` (has "none" sentinel not in spec), `pet_policy` (admin free-text vs spec enum — data-loss risk), `available_from` Popover+Calendar compound, Section 7 owner-preferences pill buttons, Section 8 owner-profile TriStateQuestions (not scalar; not in spec), `auto_accept_enabled` (derived from ownerWantsControl inverse), Photos. 8 `// TODO(spec):` grep tags added for later label / options folding.

D-110 non-issue confirmed — status renders as a Badge display; no dropdown exists. D-111 direct-write bypass path unchanged (handleSave still writes directly to `properties`, no RPC routing). D-124 admin-only-fields trigger cleared automatically by `is_admin()` in admin session. Owner surface (ListProperty) untouched; useListingSave / D-153 buffering / D-154 defense stack all unchanged. SpecField required no modification — existing owner_form-only asterisk means admin surface renders Tier-1 fields editable automatically.

Memory: D-156 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the admin invariant (audiences+editableBy source of truth, bespoke list). Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (baseline 415, +4 for new payload keys — Supabase inference noise, within ±5); `npx vitest run` = 4 files / 24 tests pass.

## [2026-07-14] refactor | Phase 1.5 Prompt 3 — ListProperty scalar rendering driven by PROPERTY_FIELDS spec; JSONB/Photos/consent bespoke; save/patch/D-153 untouched [IST]

Created `src/components/property/SpecField.tsx` — surface-agnostic renderer taking (fieldKey, surface, value, onChange, helperOverride?, placeholderOverride?, readOnly?). Handles text/textarea/number/select/switch. Label always via `getFieldLabel(field, surface)`; requiredOwner adds ' *' on owner_form surface only. Reads spec via `PROPERTY_FIELDS.find(f => f.key === fieldKey)`; unknown key logs `console.error` in DEV and renders null. readOnly branch: public_detail returns `<span>{formatFieldValue(...)}</span>`, other surfaces render a disabled-looking read-only pane. Component never imports form hooks / updateField / useListingSave — caller owns state and transforms. Prompts 4 (admin) and 5 (public detail) reuse this component; forking is not allowed (D-155).

Refactored ListProperty.tsx Sections 1, 2, 3, 6, 8 to consume SpecField for scalar fields. Bespoke stays bespoke: Country hardcode (not a DB column), pincode digit-only transform (owned by caller onChange), security_deposit_amount 1/2/3-month convenience chips, maintenance_included → maintenance_included_in_rent form-state-vs-DB bridge, available_from Popover+Calendar, Section 8 title dynamic placeholder from live bhk+locality. Section 9 consent + preview button unchanged (UI-only, not in spec). Sections 4/5/7 entirely bespoke per Prompt 3 scope (JSONB/Photos). Every helperOverride site tagged `// TODO(spec): fold helper into PROPERTY_FIELDS.<key>.helper in Prompt 6 bundle` for grep-able cleanup.

D-153 invariant preserved — no `if (propertyId)` guards on `patch()`; the 5 remaining `!propertyId` gates (lines 608/882/1098/1485/1580) are legitimate photo-upload and save-button conditions. D-154 defense stack untouched. Path A/B routing, useListingSave, submit RPC, poisonedKeys guard all unchanged. Pincode transform preserved.

Memory: D-155 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the SpecField invariant (surface prop, three-surface reuse rule, bespoke list). Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (baseline, no delta); `npx vitest run` = 4 files / 24 tests pass; none in touched files.

## [2026-07-14] arch | Phase 1.5 Prompt 2 — field spec architecture foundation (D-128) [IST]

Created `src/config/property-fields.ts` — canonical `PropertyFieldSpec[]` for all property fields, plus helpers (`getFieldsForSurface`, `getOwnerFieldsGrouped`, `getFieldLabel`, `formatFieldValue`, `isFieldVisible`, `validateSpec`) and `OWNER_FORM_SECTIONS` metadata. 40 fields populated covering location, basics, rent_deposit, inside, building_society, rules_preferences, photos, description sections + 11 admin-only columns (status, is_active, flat_number/revealed, board_status, auto_accept_enabled, 3 owner_*_preference, listed_at, created_at). Sale section defined but empty until Prompt 9. JSONB fields (furnishing_detail, amenities) entered as input='json' — consumer owns UI. All 7 required-owner fields the submit trigger checks are covered and verified via `src/test/property-fields.test.ts` (9 assertions). Tier 1 (locked) fields verified per commons-status-flow.md: building_name, street_address, city, state, pincode, bhk, property_type + admin-only columns.

Consumers unchanged per spec — ListProperty, admin PropertyEdit, PropertyDetail continue to read fields their existing way. `src/config/property-form.ts` constants stay in use through Prompts 3–5 refactors. When wiring in later prompts, the D-153 pre-draft buffering invariant must be preserved: do NOT gate `patch()` on `propertyId`.

Memory: commons-schema.md §18 added (shipped shape, canonical helpers, JSONB caveat, deferred fields note); §17 kept as historical decision record. CLAUDE.md gained the Prompt 2 invariant. Types.ts already reflects Prompt-1 migration state (`public_profiles.full_name` present) — no regen needed.

Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (baseline, no delta); `npx vitest run` = 4 files / 23 tests pass (property-fields.test.ts adds 9 assertions).

## [2026-07-14] fix | Pre-draft field loss root cause (D-153) — patch() buffers before draft exists; save-failure defense stack (D-154); sw.js offline fallback [IST]

TRUE root cause of the recurring "Cannot submit for review: required fields missing" failure: patch() dropped every field typed before the draft row existed (Section-3 deposit/available_from are typed before the Section-4 furnishing threshold that triggers createDraft, whose INSERT payload omits them). Evidence: two production HARs showing draft POST without those columns and zero subsequent field PATCHes. Misdiagnosed twice (poison-merge, submit guard) — those fixes were real hardening but not the blocker; they ship as the D-154 defense stack (drop failed snapshots, poisonedKeys tracking, failureTick toast re-fire, submit block naming exact columns, console.error full payload).

Fix: useListingSave.patch() now buffers while propertyId is null; effect auto-flushes on id arrival. Removed all `if (propertyId)` guards on patch() call sites in ListProperty. Regression test added: src/test/useListingSave.test.ts (3 files, 14 tests pass). Also fixed public/sw.js offline fallback resolving undefined → "Failed to convert value to 'Response'" (cache-miss now falls back to cached '/' shell for navigations, else Response.error(); CACHE_NAME bumped to v2).

Memory: D-153 + D-154 appended to commons-decisions.md; CLAUDE.md Phase 1.5 section gained pre-draft buffering + defense stack + sw.js invariants. Typecheck: 415 (baseline, no delta).

## [2026-07-12] hotfix + docs | Phase 1.5 Prompt 1 — data loss fix + admin name fix + commons memory update for Phase 1.5 [IST]

Fixed A3 (draft-load useEffect no longer re-fetches on internal setSearchParams — latched via draftInitialResumeRef). useListingSave now exposes lastError; ListProperty subscribes and toasts on non-null. Defensive Date-to-YYYY-MM-DD normalization in updateField payload. getUserDisplayName simplified per D-125 (users.full_name only; profile arg preserved for backwards compat, no longer consulted). STATUS_CONFIG in propertyStatus.ts gained guidance field per D-138 with locked copy for 7 statuses; deduplicated old PM `listed` entry.

Migrations added: 20260711120000_fix_admin_only_property_fields.sql (git-sync of 2026-07-11 hotfix — D-124), 20260712120000_widen_public_profiles_view.sql (F1 fix — D-125, D-126; view now selects users.full_name via LEFT JOIN profiles).

Memory: commons-decisions.md gained D-124 through D-152 (29 entries covering Phase 1.5 architecture, schema, UX, and 13-prompt sequence). commons-forward-plan.md appended Phase 1.5 deferred items + prompt sequence. commons-schema.md gained §14 migrations list, §15 widened view, §16 event-scoped acks note, §17 field spec architecture. commons-ux.md gained §10 StatusGuidance content + Final Checks 3-checkbox + search rent/sale toggle + section validation + available_from date rules. CLAUDE.md gained compact "Commons Phase 1.5" section listing the 8 load-bearing invariants.

Typecheck: 415 errors (baseline 413, +2, within ±5 tolerance). None in touched files. Types regenerated from REMOTE — public_profiles type still reflects display_name until migration is pushed; will need re-regen after `supabase db push`.

## [2026-07-05] fix | Floor plan carousel crash — aligned lightboxImages filter with activeImages to prevent index-out-of-bounds on floor plan click [IST]
## [2026-07-05] diagnose | Floor plan carousel crash — lightboxImages vs activeImages array mismatch when "All Photos" selected [IST]
## [2026-06-28] feat | Google Maps link + action buttons row — DB column, admin input, moved YouTube from badges to dedicated button row with Maps button [IST]
## [2026-06-28] fix | Hide rent/fee/total rows in pricing card + sidebar fee text — CSS hidden, no deletions [IST]
## [2026-06-28] diagnose | Hide rent/fee/total rows in PropertyDetail pricing card — line map and approach [IST]
## [2026-06-28] feat | YouTube walkthrough link — DB column, admin input in Listing Details, red pill badge in PropertyDetail green badges row [IST]
## [2026-06-28] diagnose | YouTube walkthrough link — DB column, admin input, detail page placement below carousel [IST]
## [2026-06-18] fix | 5-issue fix — furnishing items (stove/chimney/fan/exhaust), amenities (garden/sports/community/water), search UI hide, floor plan carousel, WhyReeveFeeModal height resolution [IST]
## [2026-06-18] diagnose | 5-issue audit — furnishing items, amenities, search UI hide, floor plan carousel, WhyReeveFeeModal dimensions [IST]
## [2026-06-17] fix | Gas Type SelectItem empty-string crash — changed placeholder value from "" to "none" sentinel [IST]
## [2026-06-17] fix | 7-issue property fix — maintenance badge, cover image sort, society maintenance display, Why7% clip, gas type, wardrobe count, search badge [IST]
## [2026-06-17] diagnose | Property detail + search page 7-issue audit — deposit calc, cover image, maintenance badge, gas type, wardrobe count, Why7% border, society maintenance display [IST]
## [2026-06-13] feat | Built Move-in Audit page — /move-in-audit route, 9 sections (Hero, Audience, What We Document, How It Works, Pricing, Neutrality, Broker Partner, FAQ, Final CTA), SSG + sitemap entry [IST]
## [2026-06-11] fix | Condition label rename, auto-population expansion (minor wear + appliances), dropdown refinements, room-type field removals, PDF damage table fixes [12:30 IST]
## [2026-06-10] fix | Post-audit fixes: seepage trigger, edited detection, missing fields, dead code cleanup, DW labels, KeyReturn filter [23:15 IST]
## [2026-06-10] audit | Full end-to-end diagnostic of inspection form rebuild — 15-section report; fixed 4 critical/data-loss bugs (getWorstCondition missing import crash, pendingInspectionPatchRef undefined ref crash, old severity values in furniture damage handler, appliance location omitted from upsert); discovered `npx tsc --noEmit` is vacuous (root tsconfig files:[]) + corrupted supabase types.ts line 1 [22:30 IST]
## [2026-06-10] feat | PDF renderer: 2 new sections (InspectionSummarySection, KeyReturnSection); reordered sections (Cover→Summary→Damages→Utilities→Rooms→Appliances→Notes→KeyReturn→Signatures→Media→Disclaimer); DamagesSection +Recommended Action column +old severity fallback +(Auto) tag; RoomsSection +SKIP_KEYS +entry-array detail rendering (walls/flooring/ceiling/false-ceiling/DW/electrical/plumbing); roomFeatureLabels +15 new keys (ac_brand/condition/notes, wardrobe_notes, modular_notes, counter_notes, chimney_brand/condition, gas_type/cylinder_count, flush_notes, electrical_point_count, wash_basin_*); ReportPayload +inspectionSummary +keyReturnSummary [IST]
## [2026-06-10] feat | Room Features Doors/Windows + Electrical + Plumbing subsections: 6 new files (doorWindowFields, electricalFields, plumbingFields, DoorsWindowsSubsection, ElectricalSubsection, PlumbingSubsection); removed WindowFields + universal fittings (fan/light/switchboard counts) from room-type branches; extended loadData synthesis for namespaced electrical + plumbing keys [IST]
## [2026-06-10] feat | Room Features surfaces restructure: EntryList component, wall/flooring/ceiling entries, false ceiling, fallback synthesis [IST]
## [2026-06-10] refactor | Extract 6 UI cards to src/components/admin/inspection/ — CollapsibleCard, UtilitiesCard, ApplianceInventory, DamageLog, ObservationsCard, InspectionSummaryCard, KeyReturnCard; add delete AlertDialogs on all destructive actions; Room-by-Room accordion stays inline [IST]
## [2026-06-10] refactor | Extract autosave mechanism to useInspectionSave hook, refactor add_to_damage_log handler [IST]
## [2026-06-09] refactor | InspectionForm rebuild Part B — extract shared types to src/types/inspection.ts, rename severity/condition labels, add dining_room, update DamageItem, update all 7 import sites [IST]
## [2026-05-03] feat | BreadcrumbList added to 4 routes; openingHours on homepage; areaServed as City objects [15:27 IST]
## [2026-05-03] sec | Added 6 baseline security headers in vercel.json (CSP deferred) [11:15 IST]
## [2026-05-03] perf | Batch A: hero WebP, contrast, headings, Razorpay lazy load, Google Fonts non-blocking [11:10 IST]
## [2026-05-03] feat | JSON-LD schema injected for 5 pre-rendered routes via prerender.mjs [09:55 IST]
## [2026-05-03] feat | SSG implemented for 5 public marketing routes; og:description fixed [09:35 IST]
## [2026-04-30] feat | ReferProperty refactor — types regenerated, admin Leads.tsx referrer fields added [14:22 IST]
## [2026-04-30] feat | ReferProperty refactor — schema migration + frontend rewrite [14:15 IST]
## [2026-04-30] diagnose | ReferProperty refactor — diagnosis complete, findings documented [IST]
## [2026-04-25] perf | Frontend: gated realtime behind auth, QueryClient defaults, lazy admin routes [17:30 IST]
## [2026-04-25] diagnose | P1 gap audit — FK indexes, storage policies, bucket config [16:30 IST]
## [2026-04-25] fix | Search path hardening: 9 SECURITY DEFINER functions + drop ensure_user_exists + config.toml send-sms-otp verify_jwt=false [15:30 IST]
## [2026-04-25] diagnose | Pre-launch P0 audit — 8 items checked, 9 issues found [14:30 IST]
## [2026-04-25] refactor | Property Details tab: show only owner-submitted Basic Details, add View Listing link, replace WhatsApp footer with /contact link [13:00 IST]
## [2026-04-25] feat | Enabled WhatsApp card on /contact, updated grid to 2×2 [12:00 IST]
## [2026-04-24] fix | Co-resident dedup + RLS delete policy + ApplicationDetail restructure + Contact CTA [20:00 IST]
## [2026-04-24] feat | Step 3 revamp: remove ITR/bank uploads, add work_email/linkedin_url, drag-and-drop salary slip zone [18:00 IST]
## [2026-04-22] feat | Visit scheduler — admin exact-time reschedule mode [19:00 IST]
## [2026-04-19] feature | Hid WhatsApp card in Contact.tsx, added Call Reeve card with tel link [15:00 IST]
## [2026-04-19] feature | Restructured /login to split-screen layout, right trust panel added [14:30 IST]
## [2026-04-18] feat | Created OwnerLandingPage.tsx — new /owners route, 7 sections, dark theme, lifecycle flow, calculator, FAQ [18:30 IST]
## [2026-04-14] refactor | Remove pendingReturnTo localStorage — replaced with query param + sessionStorage returnTo [13:00 IST]
## [2026-04-14] feat | PropertyDetail + Eligibility: add verification gates (phone+Google) + proactive VerificationStrip UI [12:00 IST]
## [2026-04-14] feat | Profile: wire returnTo navigation for phone OTP and Google link success paths [11:00 IST]
## [2026-04-14] fix | Profile: parse OAuth error hash on mount to show toast when Google account already linked to another user [10:30 IST]
## [2026-04-14] fix | verify-phone-otp: add legitimate-user pre-check (SPURIOUS_ROW_MAX_AGE_MS=60s) — abort with 409 if phone belongs to existing user, never delete legitimate accounts [10:00 IST]
## [2026-04-13] fix | supabase client: add noOpLock to fix Web Lock deadlock causing white screen on profile refresh for phone+Google users [18:30 IST]
## [2026-04-13] fix | useAuth: fix white screen on profile refresh for phone+Google users — skip INITIAL_SESSION, increase setTimeout to 100ms [18:00 IST]
## [2026-04-13] fix | useAuth: wrap onAuthStateChange in setTimeout(0) to fix DB deadlock on page refresh [17:30 IST]
## [2026-04-13] fix | useAuth: add 5s safety timeout to prevent infinite loading after OAuth redirect [17:00 IST]
## [2026-04-13] fix | Profile: navigate to clean /profile after Google linking to clear OAuth fragments [16:30 IST]
## [2026-04-13] fix | Profile: fix Google linking email+name update, show email in Google section, hide change phone once verified [16:00 IST]
## [2026-04-13] fix | config: add manual linking + confirm phone display format correct [15:30 IST]
## [2026-04-13] fix | verify-phone-otp: cleanup spurious public.users row + standardise phone format [15:00 IST]
## [2026-04-13] fix | verify-phone-otp: delete spurious phone user before PUT to prevent unique constraint violation [14:30 IST]
## [2026-04-13] fix | verify-phone-otp: fix Admin API HTTP method PATCH→PUT for user update [14:00 IST]
## [2026-04-13] fix | Profile: use fetch instead of functions.invoke to fix missing Authorization header [13:30 IST]
## [2026-04-13] fix | Profile: capture Google token before signInWithOtp to fix 401 on verify-phone-otp [13:00 IST]
## [2026-04-13] fix | verify-phone-otp: add CORS headers + cleanup spurious phone auth rows [12:30 IST]
## [2026-04-13] fix | handle_user_updated: add email_confirmed_at block for Google OAuth users [12:00 IST]
## [2026-04-09] feature | verify-phone-otp edge function: phone linking for OAuth users [14:30 IST]
## [2026-04-09] fix | Profile: fix shouldCreateUser for phone OTP [14:15 IST]
## [2026-04-09] fix | Profile: fix phone OTP for Google OAuth users [14:00 IST]
## [2026-04-09] diagnose | Profile phone+Google linking diagnostic [13:30 IST]
## [2026-04-09] fix | useAuth: retry loadUser on null row to fix trigger race condition [13:00 IST]
## [2026-04-09] fix | Login: fix Google OAuth redirect — remove !user guard from redirect useEffect [12:30 IST]
## [2026-04-09] fix | Add on_auth_user_updated trigger for phone OTP user row creation [11:30 IST]
## [2026-04-09] fix | send-sms-otp: fix Content-Type header on hook response — Supabase Auth requires application/json on all responses [10:00 IST]
## [2026-04-08] fix | send-sms-otp: fix webhook secret extraction — pass raw base64 string to Webhook constructor, not decoded bytes [20:00 IST]
## [2026-04-08] feat | Profile redesign: 4-section layout (name, phone OTP verify, Google link, emergency contact) + dual verification gate on Schedule Visit and Apply [19:30 IST]
## [2026-04-08] refactor | Core auth: phone OTP + Google OAuth, remove onboarding, fix route protection [18:30 IST]
## [2026-04-08] security | send-sms-otp: webhook signature verification added [18:00 IST]
## [2026-04-08] add | Edge function send-sms-otp deployed [17:30 IST]
## [2026-04-08] migrate | DB migration: drop onboarding_completed, fix handle_new_user trigger for phone OTP [17:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap — disable vaul repositionInputs, handle keyboard ourselves [16:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap — visualViewport targets Drawer scroll container, not Dialog [15:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap via structural approach — top-anchored h-dvh, overflow-y-scroll, scrollIntoView on focus [14:00 IST]
## [2026-04-08] fix | RequestCallbackModal: slot ranges, night window range, greying rule >= for India and international [13:00 IST]
## [2026-04-08] fix | RequestCallbackModal: correct timezone select to 7 options [12:30 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap via visualViewport listener [12:00 IST]
## [2026-04-07] fix | Fix 6 UI/logic bugs in RequestCallbackModal: +91 prefix, timezone select, intl phone fields, night window gate, step 4 phone display, call/range summary [12:00 IST]
## [2026-04-07] fix | Fix 4 bugs in RequestCallbackModal: phone normalise, modal size, mobile keyboard, timezone slots [11:00 IST]
## [2026-04-07] feature | Wire RequestCallbackButton into Contact, Admin sidebar, ApplicationDetail, MyPropertyDetail [10:00 IST]
## [2026-04-06] feat | Build /admin/callbacks page + App.tsx route [12:45 IST]
## [2026-04-06] feature | Build RequestCallbackButton + RequestCallbackModal [12:30 IST]
## [2026-04-06] migration | Create callback_requests table [12:00 IST]
## [2026-04-06] migrate | Created visit_events table, extended profiles and visits, added no-show auto-block trigger [11:33 IST]
## [2026-04-06] feat | Created shared VisitSchedulerModal component [11:37 IST]
## [2026-04-06] feat | Rewrote VisitsList: event timeline, fixed date picker, status labels, scheduling block [11:45 IST]
## [2026-04-06] feat | Added 4 admin visit actions to FieldCalendar + fixed rescheduled status filter [11:52 IST]
## [2026-04-06] feat | Built /admin/visits Visit Logs page with filters and row detail drawer [12:04 IST]
## [2026-04-06] feat | Added no-show monitoring and unblock capability to TenantPipeline [12:18 IST]
## [2026-04-06] feat | Surfaced visit notes and admin tenant notes in AdminApplicationDetail [12:35 IST]
## [2026-04-06] feat | Added scheduling block gate and VisitSchedulerModal to PropertyDetail [12:52 IST]

## [2026-04-18] feat | Created OwnerClarityGuide.tsx — owner clarity guide page with 13 sections, TOC, progress bar [18:30 IST]

## [2026-04-19] diagnose | Token payment flow — pre-implementation diagnosis complete [14:30 IST]

## [2026-04-19] diagnose | Razorpay UPI token payment — pre-implementation diagnosis [15:00 IST]

## [2026-04-19] migrate | Razorpay Phase 1 — payments UNIQUE constraint, RLS policies, remove payment_pending from WITHDRAWABLE_STATUSES [15:15 IST]

## [2026-04-19] feat | Razorpay Phase 2 — create-razorpay-order Edge Function [15:30 IST]

## [2026-04-19] feat | Razorpay Phase 3 — verify-razorpay-payment webhook handler [15:50 IST]

## [2026-04-19] feat | Razorpay Phase 4 — frontend checkout, owner_accepted CTA, payment_received screen [16:10 IST]

## [2026-04-19] feat | Footer rewrite — nav links, legal identity block for Meta Business Verification [18:31 IST]

## [2026-04-19] fix | Footer desktop grid 3→4 cols, For Tenants into own column [18:45 IST]

## [2026-04-20] diagnose | Token payment refund policy — pre-implementation diagnosis [14:00 IST]

## [2026-04-22] diagnose | Visit time slot filtering — diagnosis complete [09:22 IST]

## [2026-04-22] feat | Visit scheduler — Early Morning slot, past-slot filtering, 4PM cutoff, 7-day window, full slot label in My Visits [09:40 IST]

## [2026-04-22] diagnose | Visit module — 3 bugs + systemic issues diagnosed [10:36 IST]

## [2026-04-22] backend | Visit module — schema reconciled, RPCs + RLS + status trigger added [11:05 IST]

## [2026-04-22] diagnose | Visit module post-migration — 3 issues diagnosed [12:30 IST]

## [2026-04-22] fix | Visit module — reschedule linkage column + tenant timeline filter + Visit Logs notes display [13:30 IST]

## [2026-04-22] diagnose | Eligibility scheduler — unification feasibility diagnosed [14:30 IST]

## [2026-04-22] refactor | Eligibility scheduler unified with VisitSchedulerModal; legacy component deleted [15:30 IST]

## [2026-04-24] diagnose | Codebase audit for WhyReeveFeeModal — modal, tokens, fonts, animations [12:24 IST]

## [2026-04-24] feat | Built WhyReeveFeeModal — 5-screen pain-first story modal for 7% fee [12:45 IST]

## [2026-04-24] fix | WhyReeveFeeModal — fixed empty slides (CSS translateX formula), desktop overflow (overflow-hidden + [&>button]:hidden), added touch swipe nav [13:09 IST]

## [2026-04-24] fix | WhyReeveFeeModal — fixed progressive slide drift and desktop width [13:19 IST]

## [2026-04-24] fix | WhyReeveFeeModal — moved Screen 5 CTA to footer, rewrote Screen 4 narrative [13:42 IST]

## [2026-05-03] perf | Logo dims, hero LCP fade removed, contrast fix [12:30 IST]

## [2026-05-03] feat | Created public/llms.txt and public/llms-full.txt for AI agent discoverability [14:04 IST]

## [2026-05-05] diagnose | PostHog owner funnel tracking audit — listed gaps for 5 funnel steps [11:30 IST]

## [2026-05-05] feat | Instrumented PostHog owner funnel — 5 events across 6 files [12:15 IST]

## [2026-05-17] diagnose | Inspection report PDF export — surveyed codebase, produced diagnosis [IST]
## [2026-05-17] feat | Export dialog + form integration; removed window.print flow [23:55 IST]
## [2026-05-17] feat | PDF document & generator for inspection reports — 9 sections, ReportDocument, generate.ts, dev test button [23:40 IST]
## [2026-05-17] feat | Foundations for inspection report PDF export (migration, deps, types, formatters) [23:18 IST]
## [2026-05-29] feat | Added legal disclaimer section to inspection report PDFs [18:20 IST]
## [2026-05-29] diagnose | Inspection form resilience audit — surveyed save flow, identified loss paths [18:50 IST]
## [2026-05-29] fix | InspectionForm save resilience: re-populate refs on failure, surface failed state with retry, flush before completion [19:15 IST]
## [2026-06-05] diagnose | Audit 4 PDF/form issues: BHK duplication, paint condition, drive link, features+furniture missing [14:30 IST]
## [2026-06-05] fix | PDF render fixes: BHK formatting, furniture and room features now visible [17:45 IST]
## [2026-06-06] feat | Add Google Drive walkthrough link to inspection form and PDF [11:20 IST]
## [2026-06-06] feat | Add paint_condition field to inspection rooms (form + PDF) [11:40 IST]
 InspectionForm rebuild — full diagnostic report produced [15:30 IST]| InspectionForm rebuild — full diagnostic report produced [15:30 IST]
## [2026-06-10] feat | Room ordering fix (Living→Dining→Kitchen→Balcony→Bedroom→Bathroom), DB migration for inspection_summary/key_return_summary/location/dining_room enum, completion validation warnings (advisory, 6 checks, CompletionWarnings dialog) [IST]
## [2026-06-10] feat | Damage log auto-population: useAutoPopulateDamages hook watches rooms state, creates/updates/removes auto DamageItems for repair_before_relet + urgent_immediate conditions across wall/flooring/ceiling/false_ceiling/door-window/electrical/plumbing entry arrays; inspector edits preserved via recommended_action sentinel; room deletion converts to manual entries [IST]
## [2026-06-10] feat | Derived condition chips replace editable dropdowns, condition snapshot at completion and export [IST]
## [2026-06-10] feat | RoomTypeFields.tsx — replace IIFE room-type branches with module-level component; extend ElectricalInventory with 5 detail fields; delete GLASS_CONDITION_OPTIONS from InspectionForm; loadData synthesis for electrical_light_brand/type/switchboard_brand/wifi_point/wifi_brand; 5 Room Features children (Surfaces/DoorsWindows/Electrical/Plumbing/RoomTypeFields) [IST]

## [2026-06-27] audit | SEO/GEO audit for /move-in-audit — [23 checks, 7 issues found: 1 canonical mismatch, 1 missing FAQPage JSON-LD, 1 missing FAQ in bodyHtml, 1 zero internal links, 3 platform-wide OG/Twitter gaps] [IST]
## [2026-06-27] fix | SEO fixes for /move-in-audit — canonical prefix (WWW→BASE), FAQPage JSON-LD (8 Q&As), FAQ in bodyHtml (dl/dt/dd) [IST]
## [2026-07-10] diagnose | Phase 0 diagnosis — PropertyDetail + Dashboard PM feature inventory [IST]
## [2026-07-10] feat | Phase 0 Steps 0.1 + 0.3 — hid PM CTAs in PropertyDetail, hid PM tiles in Dashboard [IST]
## [2026-07-10] diagnose | Phase 1 diagnosis — PropertyEdit anatomy, property schema, RLS, image upload, status flow [IST]
## [2026-07-10] docs | Phase 1 planning captured — split commons.md into 6 focused docs [IST]
## [2026-07-10] diagnose | Phase 1 final diagnosis — validated plan against codebase, sequenced implementation prompts [IST]
## [2026-07-10] migrate | Phase 1 Prompt 1 — 7 migrations, Edge Function ownership check, commons updates [IST]
## [2026-07-10] feat | Phase 1 Prompt 2 — frontend primitives (deps, hooks, utils, config, propertyStatus, Search filter) [IST]
## [2026-07-10] feat | Phase 1 Prompt 3 — ListProperty create mode (9-section accordion, auto-save, photo pipeline, preview) [IST]
## [2026-07-10] feat | Phase 1 Prompt 4 — ListProperty edit mode + 4 edit request RPCs + Edge Function extension [IST]
## [2026-07-10] feat | Phase 1 Prompt 5 — /me and /u/:userId profile pages [IST]
## [2026-07-10] feat | Phase 1 Prompt 6 — owner dashboard rebuild + BottomNav update + property management placeholder [IST]
## [2026-07-10] feat | Phase 1 Prompt 7 — property management page 4-tab experience + confirmation modals [IST]
## [2026-07-10] feat | Phase 1 Prompt 8 — admin listing review queue + commons memory audit [IST]
## [2026-07-10] feat | Phase 1 Prompt 9 — public timeline + session restore + archived notice + modify-edit polish [IST]
## [2026-07-10] fix | Phase 1 Prompt 10 — RLS gap, admin edit log, Path B guards, final commons sync [IST]

## [2026-07-17] diagnosis | Phase 2 pre-build codebase investigation [19:42 IST]
## [2026-07-17] feat | Phase 2 Prompt 1 — types regen, isFullyVerified, memory update (D-172–D-177) [20:17 IST]
## [2026-07-17] feat | Phase 2 Prompt 2 — VerificationGate component, /profile banner + redirect, /list gate, CLAUDE.md trim [20:31 IST]
## [2026-07-17] feat | Phase 2 Prompt 3 — /me and /u/:userId audit + gap fixes [20:35 IST]
## [2026-07-17] feat | Phase 2 Prompt 4 — /tenant-dashboard/preferences page (TenantPreferences.tsx) [20:48 IST]
## [2026-07-17] feat | Phase 2 Prompt 5 — /tenant-dashboard page (TenantDashboard.tsx) [20:53 IST]
## [2026-07-17] feat | Phase 2 Prompt 6 — routing redirect, BottomNav + Header tenant nav update, orphan cleanup [20:58 IST]

## [2026-07-18] audit | Auth + profile system diagnostic — full flow map produced [13:38 IST]

## [2026-07-18] audit | Auth findings verification — real bugs vs by-design triaged [14:15 IST]

## [2026-07-18] refactor | Profile.tsx: Name read-only from Google; removed 2 redundant client .update() calls now owned by auth triggers [14:42 IST]

## [2026-07-18] fix | reveal-contact null-email guard + isNewUser heuristic + last_login_at wired via RPC [14:51 IST]

## [2026-07-18] fix | reveal-contact: phone fallback via get_phone_fallback RPC + skipped_no_phone guard [23:06 IST]

## [2026-07-18] fix | resend-reveal: phone fallback via get_phone_fallback RPC + skipped_no_phone guard [11:47 IST]

## [2026-07-19] sync | Post-Phase-3 session commons + CLAUDE.md sync — security fix, phone fallback, auth outage lessons, TS baseline 364→358 [12:28 IST]

## [2026-07-19] audit | Phase 4 pre-build diagnostic [08:52 IST]

## [2026-07-19] feat | Phase 4A: pseudonym identity card on /me, Display Name removed [14:13 IST]

## [2026-07-19] fix | Phase 4A A2: display_name consumer audit + ownerDisplayName fix [14:30 IST]

## [2026-07-19] audit | Phase 4A A3: listing submission gate + Listed by display confirmed/hardened [15:41 IST]

## [2026-07-19] feat | Phase 4B B1: types regenerated, D-P4-005 through D-P4-010 written [16:00 IST]

## [2026-07-19] feat | Phase 4B B2: RPCs live (7 functions), types regenerated, D-P4-011 through D-P4-015 written [16:07 IST]

## [2026-07-19] feat | Phase 4B B3: useTrackPropertyView hook created and wired into PropertyDetail [16:11 IST]

## [2026-07-19] feat | Phase 4B B4: CommentSection and full comments UI shell built and wired into PropertyDetail [16:21 IST]

## [2026-07-19] feat | Phase 4B B5: like, reply, report, delete interactions wired in comments UI [16:29 IST]

## [2026-07-19] feat | Phase 4B B6: stats line, ManageListingCard, anchor-scroll, commentCount wired in PropertyDetail [16:35 IST]

## [2026-07-19] feat | Phase 4B B7: search card counts + owner dashboard unanswered badge [03:38 IST]

## [2026-07-19] feat | Phase 4C C1: interaction_ratings schema live, types injected, D-P4-016 through D-P4-019 written [03:47 IST]

## [2026-07-19] feat | Phase 4C C2: ratings RPCs live (3 functions), types injected, D-P4-020 through D-P4-022 written [03:53 IST]

## [2026-07-19] feat | Phase 4C C3: PendingRatingCard + PendingRatingsSection built and wired into dashboards [04:03 IST]

## [2026-07-19] feat | Phase 4C C4: owner rating crisp line on PropertyDetail + RatingsBlock on PublicProfile [04:08 IST]

## [2026-07-19] test | Phase 4C C5: ratings end-to-end verification — partial (frontend logic + tsc PASS; DB steps skipped, Supabase MCP unavailable) [04:13 IST]

## [2026-07-19] feat | Phase 4D D1: PublicProfile audit complete, ListingsGrid status filter + counts added [04:40 IST]

## [2026-07-19] audit | Phase 4D D2: anonymity leak audit — all checks pass [04:47 IST]
## [2026-07-19] feat | Phase 4 complete: 4A identity, 4B comments+views, 4C ratings, 4D public profile [04:47 IST]

## [2026-07-19] fix | Phase 4B bug fixes: blocklist+normalization, delete RPC, report notes optional [08:19 IST]

## [2026-07-19] fix | Phase 4B bug fix R2: owner badge optimistic, report notes, blocklist tier system [10:05 IST]

## [2026-07-19] fix | comments: replace temp UUID with real comment_id after post_comment resolves [13:39 IST]
## [2026-07-20] audit | PropertyDetail UI & data diagnosis complete [14:13 IST]
## [2026-07-20] audit | PropertyDetail Phase 2 targeted diagnosis complete [15:11 IST]
## [2026-07-20] audit | PropertyDetail Phase 3 diagnosis complete [15:46 IST]
## [2026-07-20] audit | PropertyDetail Phase 4 — Codebase UI & behaviour diagnosis complete [20:37 IST]
## [2026-07-21] feat | P2 types regen + shared foundations (isFieldSet, formatEnumLabel, normalizeAmenities, financialConversions, useOwnerCard, garbage_collection amenity) [11:15 IST]
## [2026-07-21] feat | P3 form additions — deposit amount-only, lock-in, notice days, super built-up, water source, lock type select, COALESCE update [11:40 IST]
## [2026-07-21] feat | P4 layout shell + gallery — BottomNav suppression, CTA bar, FAB, gallery overlay, hero perf, blocked-page [12:38 IST]
## [2026-07-21] feat | P4b CTA bar — 7-state useContactRequestStatus hook [16:34 IST]
## [2026-07-21] feat | P5 main content sections — header, NoSurprises, AtAGlance, MonthlyCosts, Furnishing, Amenities, AllDetails, Description [17:00 IST]
## [2026-07-21] feat | P6 owner card, sidebar, how-it-works, listing history fix, comments redesign [17:25 IST]
## [2026-07-21] audit | P7B final verification pass — PropertyDetail redesign cycle complete [17:55 IST]
## [2026-07-21] audit | Post-deployment diagnosis — 28 issues across 15 groups [21:38 IST]
## [2026-07-21] fix | Post-deployment fixes — 28 issues (text bugs, field mapping, display logic, gallery collage, mobile collapse, performance) [02:59 IST]
## [2026-07-22] fix | F1 follow-up — 9 post-deploy bugs (gallery tabs, sidebar, ratings, monthly costs, amenities, comments collapse, brokerage months) + diagnosis for issues 6+8 [11:13 IST]
