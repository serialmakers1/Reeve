# Reeve

Property management platform connecting owners and tenants in India. Owners list properties, tenants apply and sign leases — Reeve manages inspections, agreements, and the full rental lifecycle.

Full decision + implementation history: `commons-decisions.md` D-001–D-177 + D-P3-000–D-P3-019. This file holds only load-bearing invariants.

## Tech Stack
React 18 + TypeScript (Vite + SWC) · Tailwind + shadcn/ui (Radix) · Supabase (Postgres + Auth + Storage) · React Router v6 · Sentry · PostHog.

## Key Commands
- `npm run build` — production build (postbuild: sitemap + SSG prerender)
- `npm run lint` · `npm run test` (vitest)

## Typecheck (IMPORTANT)
- Correct: `npx tsc -p tsconfig.app.json --noEmit`. `npx tsc --noEmit` checks ZERO files (root tsconfig has `"files": []` + project references).
- Baseline: **358 pre-existing errors** (post-Phase 3 auth-hardening, 2026-07-19). Supabase generated-types noise. Diff against baseline, not zero. New TS2304/TS2552 in touched files = runtime crashes vite won't catch.

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
Use SSG frameworks (vite-ssg / vite-plugin-ssr — Node.js tree render breaks Supabase/PostHog/Sentry browser-only modules); pre-render any auth/protected route; modify `src/integrations/supabase/client.ts` (the `noOpLock` must remain — Web Locks API deadlock fix for multi-provider auth).

## Supabase
- Project ref: `tfutuqqcxqqbirnsdpvz` (`https://tfutuqqcxqqbirnsdpvz.supabase.co`)
- Client: `import { supabase } from "@/integrations/supabase/client"`
- Types: `src/integrations/supabase/types.ts` — auto-generated, do not edit. Regen: `supabase gen types typescript --project-id tfutuqqcxqqbirnsdpvz --schema public 2>/dev/null > src/integrations/supabase/types.ts` (must suppress stderr — CLI update-notice will otherwise leak into the file and break parsing).
- Auth storage key: `reeve-auth`
- Always use `apply_migration` for DDL. Never raw SQL for schema changes.
- Always use `.maybeSingle()` not `.single()` — `single()` throws on no rows.

## Auth Architecture
Phone OTP (MSG91) + Google OAuth. Email OTP removed. After verify success: `navigate(returnTo || '/')` — no onboarding check.
Phase 4A (D-P4-001..004): `public.users.pseudonym` (UNIQUE, permanent, system-assigned via `generate_pseudonym()` + `trg_assign_pseudonym` BEFORE INSERT) shown on `/me` only, never on `/u/:userId`. Display Name edit UI removed from `/me`; `profiles.display_name` column retained. Listing submission gate enforced by `<VerificationGate>` wrapping ListProperty — `isFullyVerified` (phone+email) required; Google-linked email_verified guarantees non-empty `full_name` via `handle_user_updated` Block 2.
Profile Name field is read-only; sourced from public.users.full_name populated by handle_user_updated Block 2 from auth.identities.identity_data on Google link. No client write to full_name (D-P3-019).
last_login_at written via touch_last_login() RPC on SIGNED_IN transitions only — never direct client update. Login isNewUser = `|created_at − last_sign_in_at| < 2s`, not `user_metadata.full_name` (D-P3-018).
**Auth trigger danger zone (D-P3-015):** never add triggers inside GoTrue's auth transaction to sync `public.*` — use post-login RPCs. MCP SQL runs as `postgres` and doesn't surface `supabase_auth_admin` search_path failures; only real login attempts do. All functions touching `public.*` must have `search_path = public` pinned. Trigger guards check `current_user` (NOT JWT claims role) — `current_user` changes under SECURITY DEFINER, JWT does not.
**Privilege guard (D-P3-014):** `prevent_user_privilege_escalation` BEFORE UPDATE trigger on `public.users` blocks `authenticated`/`anon` from changing `role`/`email_verified`/`phone_verified`/`auth_provider`/`is_active`. Uses `IS DISTINCT FROM` (no-op writes pass silently). Admin + service_role bypass.
**Phone source (D-P3-016):** `public.users.phone` may be null for Google-first users. Call `get_phone_fallback(user_id)` via service_role only (reads `auth.users.phone`, then `identity_data`). n8n never queries `auth.*` — always via scoped SECURITY DEFINER RPC.

### PropertyDetail outer layout
`/property/:id` uses a two-column grid on desktop only: `max-w-6xl mx-auto px-4 lg:px-6` container → gallery (full-width, outside grid) → `lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 lg:items-start` → left col (`min-w-0`, all sections) / right col (`hidden lg:block` sticky `PropertySidebar`). Mobile CTA is `PropertyCTABar` (`lg:hidden`); the two together cover all viewport widths with no gap.

### PropertyDetail sections
Every non-gallery/CTA content block on `/property/:id` renders through `<PageSection title icon background>` from `src/components/property-detail/PageSection.tsx` — no bespoke section wrappers. Sections themselves live one-per-file under `src/components/property-detail/` and receive `property` (or scoped fields) as props, never lift state. Bespoke Tailwind grays or hex values are forbidden inside; only shadcn tokens + `bg-muted/*`, `bg-primary/5`, and the fixed green/amber/red pair for status indicators.

### Shared-state read pattern
When a heavier component owns state via realtime/mutations (e.g. `RequestContactPanel` and `cr`) and another component needs read access, do NOT lift state — write a small read-only TanStack Query hook keyed the same way and let both consumers share the cache (`useContactRequestStatus` is the canonical example). Cheaper than prop-drilling, safer than mid-file refactors.

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
reveal-contact + resend-reveal (v5): skip email dispatch and log `skipped_no_email` when a party lacks email (phone reveal still proceeds; webhook fires only if at least one party has email). Fall back to `get_phone_fallback` RPC when `public.users.phone` is null; log `skipped_no_phone` if unresolved.
Four functions in `supabase/functions/`: `submit-contact-request`, `reveal-contact`, `resend-reveal`, `resend-contact-webhook`. All `verify_jwt=false` in config.toml with manual JWT validation inside the handler (matches the razorpay pattern). Phone numbers NEVER appear in any HTTP response body — email reveal only (D-P3-001). service_role key used for all DB reads/writes. `tenant_id` always derived from the verified JWT — never trusted from request body. Approval sends two emails in parallel via Promise.all; approval stands even if either send fails (resend-reveal is the retry surface). resend-contact-webhook verifies Svix signature (`RESEND_WEBHOOK_SECRET`) and always returns 200 on valid signature so Resend does not retry-storm. reveal-contact and resend-reveal call n8n webhooks (fire-and-forget). RESEND_API_KEY not used in Supabase. N8N_WEBHOOK_SECRET required in Supabase secrets.

## Phase 3 UI wiring (Prompts 3–6 — full details in commons-decisions.md + commons-ux.md)
- **P3 (`RequestContactPanel.tsx`)**: 7-button state, consent (D-P3-010), realtime + `get_owner_response_rate` strip (D-P3-009). Owner-viewing-own → null. contact_requests / rental_preferences queries use `(supabase as unknown as ...)` casts to sidestep types.ts generic-inference noise.
- **P4 (`RequestsTab.tsx` + `DeclineReasonModal.tsx`)**: grouped log on `/owner-dashboard/property/:id`. Approve → `functions.invoke('reveal-contact')` (never direct UPDATE). Decline → `.update({status:'declined', decline_reason})` guarded on `status=pending` (5 templated reasons matching `contact_request_decline_reason` enum; free text disallowed). Snapshot rule: declined/withdrawn/auto_cancelled render name-only compact card.
- **P5 (`ContactRequestsCard.tsx`)**: TenantDashboard card 1, realtime on `contact_requests`, per-minute cooldown tick only when a declined row is cooling. Withdraw (RLS-guarded UPDATE), Resend (`resend-reveal`; 429 branches distinguish cooldown vs daily), Re-request (delegates to RequestContactPanel — never re-implements submit).
- **P6 (`PublicProfile.tsx` `OwnerStatsBlock`)**: rendered on `/u/:userId` above ListingsGrid; `get_owner_response_rate` + properties count in parallel; null when no listings AND no history. `< 5` handled → "New owner · Verified"; `>= 5` → "Responds to X% of requests" (never "approval rate" — D-P3-009/011). Column fallback `_handled ?? _total`.

## Phase 3 conventions
- N8N_WEBHOOK_SECRET: Supabase secret used by reveal-contact + resend-reveal Edge Functions to authenticate calls to n8n webhooks.
- RESEND_WEBHOOK_SECRET: Supabase secret used by resend-contact-webhook Edge Function to verify Resend delivery event signatures.
- n8n → Supabase reads: always use scoped SECURITY DEFINER RPC + anon key. Never store service_role in n8n. See D-P3-012.
- OwnerRateBlock (in RequestContactPanel): uses all_time_handled, all_time_responded, last_7d_handled, last_7d_responded column names from get_owner_response_rate RPC. Not _total or _rate.
- ownerDisplayName passed as null from PropertyDetail to RequestContactPanel — consent copy falls back to 'the owner'. Follow-up: add public_profiles.display_name to property fetch. See commons-forward-plan.

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
- **Adding a new `properties` column to the owner form** requires touching six sites in order: (1) spec entry in `src/config/property-fields.ts`; (2) `FormState` interface in `src/pages/ListProperty.tsx`; (3) `INITIAL_STATE` in same file; (4) `prefillFormFromRow`; (5) `mapFieldToDb` switch; (6) JSX call site (usually `<SpecField>`). Then mirror on `admin/PropertyEdit.tsx` (useState hook + hydration + payload + JSX). Also add to `approve_edit_request` COALESCE in a new migration replacing that RPC. SpecField does NOT check `audiences` — call sites control render.
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
