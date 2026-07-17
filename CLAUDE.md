# Reeve

Property management platform connecting owners and tenants in India. Owners list properties, tenants apply and sign leases — Reeve manages inspections, agreements, and the full rental lifecycle.

Full decision + implementation history: `commons-decisions.md` D-001–D-177 + D-P3-000–D-P3-010. This file holds only load-bearing invariants.

## Tech Stack
React 18 + TypeScript (Vite + SWC) · Tailwind + shadcn/ui (Radix) · Supabase (Postgres + Auth + Storage) · React Router v6 · Sentry · PostHog.

## Key Commands
- `npm run build` — production build (postbuild: sitemap + SSG prerender)
- `npm run lint` · `npm run test` (vitest)

## Typecheck (IMPORTANT)
- Correct: `npx tsc -p tsconfig.app.json --noEmit`. `npx tsc --noEmit` checks ZERO files (root tsconfig has `"files": []` + project references).
- Baseline: **364 pre-existing errors** (Phase 3 Prompt 1, 2026-07-17; drifted +4 from Sync P5's 360). Supabase generated-types generic-inference noise. Diff against baseline, not zero. New TS2304/TS2552 in touched files = runtime crashes vite won't catch.

## TypeScript Config
`strictNullChecks: false`, `noImplicitAny: false` — intentional, do not tighten.

## Path Aliases
`@/` maps to `./src/` — always use this, never relative imports.

## SSG (Static Site Generation)
`scripts/prerender.mjs` runs after `vite build` via `postbuild`. Writes per-route HTML with route-specific `<title>`, `<meta>`, and static body injected into `<div id="root">`. Vercel serves static files before rewrites; `main.tsx` uses `createRoot` (not `hydrateRoot`) so React replaces static HTML on mount.
- **Public / pre-rendered**: `/`, `/owners`, `/search`, `/savings/tenant`, `/contact`
- **Public, not pre-rendered**: `/privacy`, `/terms`, `/refund`, `/login`
- **Protected / CSR-only**: everything under `/dashboard`, `/admin`, `/owner`, `/my-properties`, `/eligibility`, `/profile`, `/refer-property`
- **Adding public route**: entry in `routes` array in `scripts/prerender.mjs` (`outFile`, `title`, `description`, `ogTitle`, `ogDescription`, `canonical`, `bodyHtml`, optional `jsonLd`) + `ACTIVE_ROUTES` in `scripts/generate-sitemap.mjs`.

### JSON-LD schema
All schema in `scripts/prerender.mjs`. Do not add to JSX. `safeJsonLd()` Unicode-escapes `<`, `>`, `&` — never raw `JSON.stringify`. `aggregateRating` MUST NOT be added until 5+ Google reviews. BreadcrumbList on every non-homepage route; homepage does NOT get one. `areaServed` uses structured City objects via `AREA_SERVED` const.

### Do NOT
- Use `vite-ssg`, `vite-plugin-ssr`, or any SSG framework (they render app tree in Node.js, conflict with Supabase/PostHog/Sentry browser-only modules).
- Pre-render any auth/protected route.
- Modify `src/integrations/supabase/client.ts` — the `noOpLock` must remain (Web Locks API deadlock fix for multi-provider auth).

## Supabase
- Project ref: `tfutuqqcxqqbirnsdpvz` (`https://tfutuqqcxqqbirnsdpvz.supabase.co`)
- Client: `import { supabase } from "@/integrations/supabase/client"`
- Types: `src/integrations/supabase/types.ts` — auto-generated, do not edit
- Auth storage key: `reeve-auth`
- Always use `apply_migration` for DDL. Never raw SQL for schema changes.
- Always use `.maybeSingle()` not `.single()` — `single()` throws on no rows.

## Auth Architecture
Phone OTP (MSG91) + Google OAuth. Email OTP removed. After verify success: `navigate(returnTo || '/')` — no onboarding check.

### useAuth — single source of truth
Returns `{ session, user, isLoading, isAuthenticated, isFullyVerified, signOut, refreshUser }`. `isFullyVerified = !!(user?.phone_verified && user?.email_verified)` (D-176). Critical patterns (do NOT remove):
- `onAuthStateChange` returns early on `INITIAL_SESSION` — `getSession()` handles bootstrap; both racing hangs isLoading.
- `onAuthStateChange` deferred via `setTimeout(100ms)` — Supabase holds internal lock; DB calls deadlock without deferral.
- `loadUser` sets session + isAuthenticated: true BEFORE DB query — ensures safety timeout can't trigger `/login` redirect.
- 5s safety timeout forces `isLoading: false` if DB fetch stalls — preserves session/isAuthenticated, never redirects.

### Auth rules
- `useRequireAuth({ requireAdmin? })` on all protected pages. Returns `loading` (not `isLoading`) — use `loading: authLoading` when aliasing.
- Never call `supabase.auth.getSession()` in rendering logic or useEffect data gates — use `useAuth()`. Event handlers may call it directly.
- Never reference `session.user.id` in component render logic or Supabase queries — use `user.id` from `useRequireAuth()` / `useAuth()`.
- Loading guards must cover BOTH auth loading and data loading: `if (authLoading || dataLoading) return null`.
- When destructuring `useAuth()` in a component that fetches data, include `isLoading` (alias `authLoading`) in every loading guard + useEffect dep array.
- After signup, users row has ~1s trigger lag — `fetchUserWithRetry` handles this, do not remove.

### Auth infrastructure
- `handle_new_user` fires for phone OTP users (phone_confirmed_at IS NOT NULL). `handle_user_updated` handles both phone_confirmed_at and email_confirmed_at. `ensure_user_exists` DB function MUST NOT be called from frontend.
- AppUser fields: `phone_verified`, `email_verified`, `auth_provider`. `onboarding_completed` removed.
- `send-sms-otp` edge function → MSG91 (TEMPLATE_ID: 1207177503631409147, sender: REEVPM). Secrets: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`. `verify_jwt=false`.
- `public.users.phone` stored as `91XXXXXXXXXX`. Display: `.replace(/^(\+91|91)/, "")` → `+91 {digits}`.
- Profile phone verify: capture Google token in `googleTokenRef` BEFORE `signInWithOtp` (it replaces the session). Pass via Authorization header to `verify-phone-otp` using raw fetch (not `functions.invoke`).
- After linkIdentity: `session.user.email` is "" — read from `identities[].identity_data.email`; full_name from `identity_data.full_name ?? identity_data.name`.
- returnTo — Phone OTP: `?returnTo=` query param via `useSearchParams` at render top level. Google link: sessionStorage key `reeve-link-returnTo` written before `linkIdentity`, read+cleared in `onAuthStateChange` after `USER_UPDATED`. Do NOT put `?returnTo` in `linkIdentity redirectTo` — Supabase whitelist strips query params.
- `verify-phone-otp`: validate JWT → POST /auth/v1/verify → age-check phoneUserId (`created_at > 60s` → 409 "already registered") → DELETE auth.users + public.users → PUT admin user with phone. `SPURIOUS_ROW_MAX_AGE_MS = 60_000`; older rows are legit and must never be deleted.

## User Roles + Route Guards
Roles: `user | tenant | owner | admin | super_admin`. Post-login redirect via `authUtils.getDefaultRouteForRole(role)`. All protection via `useRequireAuth()` inside the page component — no wrapper in App.tsx. `OnboardingGuard` removed; do not add back. `onboarding_completed` column dropped.

## Layout Rules
Public/tenant pages: `<Layout>` (`src/components/Layout.tsx`) — Header + Footer. Admin pages: `<AdminLayout>` (`src/components/admin/AdminLayout.tsx`). Never hardcode nav or footer inside pages. BottomNav fixed `bottom-0 z-50`, renders only when isAuthenticated. Mobile CTA bars in PropertyDetail use `bottom-16` (logged in) or `bottom-0` (logged out).

## Property Status
Legacy PM: `draft → inspection_proposed → inspection_scheduled → inspected → listed → occupied → off_market`. Commons added: `pending_review`, `changes_requested`, `edit_pending_review`, `unlisted`, `archived`. Full 14-transition matrix: `commons-status-flow.md`. Display via `getStatusDisplay()` (`src/lib/propertyStatus.ts`).
- `enforce_property_owner_transitions` validates owner transitions; admin bypasses via `is_admin()`.
- `handle_property_status_change` auto-manages `is_active`.
- `property_activity_log_writer` emits one log row per status change; curated events (`listed` from pending_review/unlisted, `unlisted`) are `is_public=true`.

## RLS Policy Patterns
- Admin SELECT/UPDATE: single policy `USING (is_admin())` — no role binding, no WITH CHECK
- User SELECT: `USING (user_id = auth.uid())`
- User INSERT: `WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())`
- User UPDATE (restricted): `USING (user_id = auth.uid() AND status = '<allowed_status>')`
- `is_admin()` covers admin + super_admin (no ops role)
- Multiple SELECT policies OR-ed by Postgres — separate user+admin SELECT policies are valid.

## Phase 3 Edge Functions (2026-07-17)
Phase 3 complete (2026-07-17). contact_requests + email_send_log tables live. 4 Edge Functions deployed. 3 n8n workflows active.
Four functions in `supabase/functions/`: `submit-contact-request`, `reveal-contact`, `resend-reveal`, `resend-contact-webhook`. All `verify_jwt=false` in config.toml with manual JWT validation inside the handler (matches the razorpay pattern). Phone numbers NEVER appear in any HTTP response body — email reveal only (D-P3-001). service_role key used for all DB reads/writes. `tenant_id` always derived from the verified JWT — never trusted from request body. Approval sends two emails in parallel via Promise.all; approval stands even if either send fails (resend-reveal is the retry surface). resend-contact-webhook verifies Svix signature (`RESEND_WEBHOOK_SECRET`) and always returns 200 on valid signature so Resend does not retry-storm. reveal-contact and resend-reveal call n8n webhooks (fire-and-forget). RESEND_API_KEY not used in Supabase. N8N_WEBHOOK_SECRET required in Supabase secrets.

## Phase 3 Prompt 6 — PublicProfile owner stats
Owner response-rate block rendered on `/u/:userId` below bio, above ListingsGrid + Ratings placeholder (`src/pages/PublicProfile.tsx` `OwnerStatsBlock`). Calls `get_owner_response_rate` RPC + a `properties` count query in parallel; renders null when the profile has no active listings AND zero request history (avoids empty tenant-profile strips). `< 5` handled → "New owner · Verified"; `>= 5` handled → "Responds to X% of requests · N handled all-time" + optional weekly line. Copy is intentionally "Responds to X% of requests" — never "approval rate" (D-P3-009 rationale, D-P3-011 enforcement). Column-name fallback (`_handled ?? _total`) so both RPC signatures resolve. All commons files synced through D-P3-011.

## Phase 3 Prompt 5 — Tenant Contact Requests card
`src/components/tenant-dashboard/ContactRequestsCard.tsx` replaces the Phase 2 static placeholder in TenantDashboard card 1 (position unchanged). Owns its own query, realtime (`tenant_id=eq.${user.id}` on contact_requests), per-minute cooldown tick (only mounted when a declined row is still cooling), and three actions: Withdraw (client UPDATE guarded by `.eq('status','pending').eq('tenant_id', user.id)`), Resend (calls `resend-reveal` Edge Function; 429 branches surface cooldown vs daily-limit toasts distinctly), and Re-request (navigates to `/property/:id` and delegates to RequestContactPanel — never re-implements submit logic). Header badge shows pending + approved count (hidden at zero). All property links use `/property/:id` — zero `/owner-dashboard/` refs.

## Phase 3 Prompt 4 — Owner Requests tab
`src/components/owner-dashboard/RequestsTab.tsx` renders the live grouped log (pending / approved / declined / withdrawn / auto_cancelled) on `/owner-dashboard/property/:id`. `src/components/owner-dashboard/DeclineReasonModal.tsx` — 5 templated radio options matching the `contact_request_decline_reason` enum verbatim; free text disallowed. Approve → `supabase.functions.invoke('reveal-contact')` (never a direct client UPDATE). Decline → direct `.update({status:'declined', decline_reason})` guarded by `.eq('status','pending')` (RLS allows owner). Snapshot visibility rule: declined / withdrawn / auto_cancelled render name-only compact card — no photo, no preferences, no message. Tab badge on OwnerPropertyManagement shows live pending count via `fetchPendingCount(propertyId)` + realtime subscription on `contact_requests` filtered by `property_id`.

## Phase 3 conventions
- N8N_WEBHOOK_SECRET: Supabase secret used by reveal-contact + resend-reveal Edge Functions to authenticate calls to n8n webhooks.
- RESEND_WEBHOOK_SECRET: Supabase secret used by resend-contact-webhook Edge Function to verify Resend delivery event signatures.
- n8n → Supabase reads: always use scoped SECURITY DEFINER RPC + anon key. Never store service_role in n8n. See D-P3-012.
- OwnerRateBlock (in RequestContactPanel): uses all_time_handled, all_time_responded, last_7d_handled, last_7d_responded column names from get_owner_response_rate RPC. Not _total or _rate.
- ownerDisplayName passed as null from PropertyDetail to RequestContactPanel — consent copy falls back to 'the owner'. Follow-up: add public_profiles.display_name to property fetch. See commons-forward-plan.

## Phase 3 Prompt 3 — Request Contact panel
`src/components/property-detail/RequestContactPanel.tsx` — owns all 7 button-state logic, consent capture (D-P3-010), realtime subscription on contact_requests scoped to (tenant, property), and the compact owner response-rate strip (D-P3-009, calls `get_owner_response_rate` RPC). Rendered from PropertyDetail.tsx OUTSIDE the COMMONS_HIDE block for eligible statuses only. Owner viewing own property → null return. Cooldown countdown updates every 60s and clears on unmount. All contact_requests / rental_preferences queries use `(supabase as unknown as ...)` casts to sidestep the types.ts generic-inference baseline noise.

## Database Tables (26 total)
`agreements, applications, application_notes, application_residents, contact_requests, documents, eligibility, email_send_log, favourites, inspection_callbacks, keys_tracking, leads, leases, maintenance_requests, owner_action_log, owner_bank_details, payments, profiles, properties, property_condition_reports, property_images, rental_preferences, users, visit_events, visits`. View: `properties_with_flat_number`, `public_profiles`.
`contact_requests` + `email_send_log` added Phase 3 Prompt 1 (D-P3-000–D-P3-010; commons-schema.md "Phase 3 Schema"). All mutations respect trigger-set attempt_number + event timestamps — never set from client.
Also present but not yet in active frontend use: `external_queries`, `property_inspections`, `inspection_appliances`, `inspection_rooms`.

## Property activity log + edit requests
`property_activity_log` and `property_edit_requests` are NEVER written directly from frontend — service_role via RPCs and triggers only.

## Migration Conventions
- Single-purpose files. Idempotent: `IF NOT EXISTS` on ADD VALUE/COLUMN, `DROP … IF EXISTS` before CREATE POLICY/TRIGGER/FUNCTION.
- BEFORE triggers fire alphabetically by name — name accordingly when ordering matters (e.g. `enforce_property_owner_transitions_trigger` sorts before `handle_property_status_change`).
- Enum ADD VALUE requires COMMIT before use — one BEGIN/COMMIT per ADD VALUE, or separate files.
- All new tables get RLS at creation. Index: `idx_<table>_<column>`. Storage buckets: kebab-case. Property images go to Cloudflare R2, not Supabase Storage.

## Visits — RPC-only mutations (enforced 2026-04-22)
- `reschedule_visit(p_visit_id, p_new_scheduled_at, p_actor)` → new visit UUID. Atomic. Tenant (own) or admin.
- `complete_visit(p_visit_id, p_property_feedback?, p_admin_note?)` → void. Admin-only. Writes one 'completed' event + sibling note events.
- Cancel + no_show: direct `.update()` + manual `visit_events` insert.
- **event_type**: status `scheduled | rescheduled | cancelled | completed | no_show`; notes `property_feedback_note | admin_note`. CHECK-enforced.
- **Status machine**: `scheduled | confirmed | rescheduled → rescheduled | cancelled | completed | no_show`. Terminals have no further transitions; non-status field updates on terminals allowed.
- `visit_events`: append-only. Admin may UPDATE/DELETE (RLS); tenants INSERT-only.
- `profiles.visit_scheduling_blocked` set true by trigger when `no_show_count >= 3`.
- `visits.rescheduled_by` / `.cancelled_by`: 'tenant' | 'admin'.
- `visit_events.rescheduled_to_visit_id` (FK → visits): set ONLY by `reschedule_visit` RPC on the `cancelled` event of the old visit. VisitsList tenant timeline skips `cancelled` events where non-null; admin Visit Logs shows both.
- `complete_visit` writes sibling note events; VisitLogs derives `notesMap` via `useMemo`; note events excluded from main table.

### Shared scheduler
`VisitSchedulerModal` — single tenant component. Used on PropertyDetail, Eligibility, VisitsList, FieldCalendar. `mode?: 'tenant' | 'admin'` (default 'tenant'). Auto-advances to Step 2 on date pick. `onConfirm` receives UTC Date. All scheduling routes through `useScheduleVisit` / `useRescheduleVisit` / `useCancelVisit` in `useVisits.ts`. Tenant mode: slot cards, max=+7days, today disabled after 4PM IST. Admin mode: `<input type="time">` 5-min step, max=+30days, no cutoff. Old `VisitSchedulingModal` deleted — do not recreate.

## Application Flow Guards (NewApplication.tsx)
Render guard order — strict, must never change:
1. `if (pageLoading)` — skeleton
2. `if (alreadySubmittedBlock)` — block screen (MUST be top-level)
3. `if (!property || !eligibility)` — null return
4. `if (submitted)` — success screen
5. Full form

`REAPPLICATION_ALLOWED_STATUSES` must always match the `NOT IN (...)` list inside the `check_application_limits` DB trigger. Current: `owner_rejected, platform_rejected, withdrawn, expired`. Update both atomically.
Every Supabase query in `initPage()` gating a critical flow must destructure `error` and handle explicitly.
Never use `.maybeSingle()` on unfiltered multi-row application queries — always use targeted single-status or `.in()`-list queries.

### PropertyDetail CTA button states (priority order)
1. draft → "Continue Draft" → `/apply?resume=<id>`
2. active blocking app (ACTIVE_STATUSES) → "Application in progress"
3. on_hold → "Another applicant has secured this property"
4. maxReached (decided_count >= 3) → "You've reached the maximum"
5. withinCooldown → cooldown date text
6. non-draft history → "Apply Again" → `/apply?property_id=X`
7. no history → "Apply Now" → `/apply?property_id=X`
Derive each flag via `.find()` on full applicationHistory — attempt_number ties are non-deterministic.

## Commons Phase 1 + 1.5 (D-001–D-171 — details in commons-decisions.md)
- Field spec (`src/config/property-fields.ts`) + `<SpecField>` = single source of truth for property fields. `flat_number` never public (D-091); admin direct-write bypass preserved (D-111). `getUserDisplayName()` reads `users.full_name` only.
- ListProperty `/list`: 9-section accordion, draft cap 20/user, submit → `pending_review`. Edit flows: Path A direct-patch for draft/changes_requested; Path B `submit_property_edit_request` RPC for listed/edit_pending_review.
- Property mgmt `/owner-dashboard/property/:id`: 4-tab (Requests | Details | Photos | Activity). Admin Review `/admin/listing-reviews`. Profile pages `/me` (editable) + `/u/:userId` (public_profiles view, security_invoker=false).

### Phase 1 + 1.5 invariants (details in commons-decisions.md D-153–D-171 and commons-schema.md)
- Save pipeline (D-153/154): `useListingSave.patch()` buffers pre-draft; failed-column poison guard; regression test `src/test/useListingSave.test.ts`.
- Triggers/SpecField: rent/sale trigger applied via MCP (D-160 — do NOT re-apply); date inputs via `<SpecField input='date'>` + `datePickerOptions` (D-168); `visibleWhen: v.listing_type !== 'sale'` fail-safe (D-162).
- JSONB editors (D-170): `<FurnishingEditor>` + `<AmenitiesEditor>` in `src/components/property/`; owner FormState holds `furnishing_detail[]` + flat `building_amenities[]`.
- Schema: brokerage split into fixed_amount + months (D-169); deposit prefers amount over months × rent (D-167); India rental + rent/sale + move-in charges (D-159/160/166) — full column table in commons-schema.md.

## Commons Phase 2 — Tenant Dashboard (D-172–D-177; details in commons-decisions.md)
- **D-172 Verification gate**: `<VerificationGate />` blocks unverified users on `/tenant-dashboard/preferences` + `/list` — hard redirect to `/profile?returnTo={path}&reason={missing}`. Legacy call sites (PropertyDetail/NewApplication/Eligibility) not refactored.
- **D-173** `public_profiles` view exposes `display_name` + `is_public`. **D-174** contact_requests snapshot frozen at submit. **D-175** dashboard card order: Contact Requests → Saved → Preferences. **D-176** `isFullyVerified` on `useAuth`. **D-177** Preferences form single-page, UI-only mandatory fields.
- `rental_preferences` table: one row per user (UNIQUE on user_id), RLS own-row only, no DELETE, all fields nullable at DB level. Route: `/tenant-dashboard/preferences`, upsert on submit.
- Routing: `/dashboard` → `/tenant-dashboard`. Header "My Profile" → `/me`, "Account settings" → `/profile`. D-088 nav freeze superseded for tenant nav only.

## Payments / Razorpay
- RLS on `payments`. Idempotency: UNIQUE(gateway_reference) + `x-razorpay-event-id` on `gateway_response`. Edge Functions `create-razorpay-order` + `verify-razorpay-payment` use `verify_jwt=false` + manual JWT + `EdgeRuntime.waitUntil()`.
- Status guard: `['owner_accepted','payment_pending']`. Token: fixed ₹5,000 (500000 paise), never from rent. `payment.captured` → success + competing apps→on_hold; `payment.failed` → retry allowed. Webhook is source of truth; handler polls 3s×5.

## Callback Requests
`RequestCallbackButton` → /login if unauthed, else opens `RequestCallbackModal` (4-step, iOS keyboard: `repositionInputs={false}` + visualViewport + onFocus scrollToInput). `(supabase as any).from('callback_requests')` (not in generated types).

## Skills — Always Check Before Acting
Skills in `.claude/skills/`. Read `using-superpowers` for the workflow. React → `react-best-practices`; Supabase/RLS → `supabase-postgres-best-practices`; auth → `security-best-practices`; bug → `systematic-debugging`; UI → `frontend-design` / `ui-ux-pro-max`; new feature → `brainstorming`.

## Critical Gotchas
`/eligibility` orphaned (Phase 2, no nav links, keep route). Tenant KYC docs → `tenant-documents` bucket `{userId}/{applicationId}/{type}_{ts}.ext`. `posthog?.capture(...)` optional-chain mandatory. LCP images MUST NOT have entry animations (`animate-fade-up`) — tanks PageSpeed.

## Inspection Form + PostHog
Condition labels (DB unchanged) good/minor_wear/moderate_damage/severe_damage. `useAutoPopulateApplianceDamages` emits `cosmetic` entries; `EntryList.customTextOnValue` → `<key>_custom`. Owner funnel: `list_property_cta_clicked → signup_completed(intent:'owner') → property_form_started → property_submitted → owner_clarity_guide_read`; scroll-depth via `useRef<boolean>` fire-once.
