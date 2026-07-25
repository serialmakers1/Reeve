# Reeve

Property management platform connecting owners and tenants in India. Owners list properties, tenants apply and sign leases — Reeve manages inspections, agreements, and the full rental lifecycle.

Full decision + implementation history: `commons-decisions.md` D-001–D-177 + D-P3-000–D-P3-019 + D-GM-001–D-GM-005. This file holds only load-bearing invariants.

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

### Gas fields — supply vs billing
`gas_type` (pipeline / cylinder) describes the property's infrastructure and renders in the "All details" grid whenever set. `utility_gas_included` describes whether the gas bill is bundled into society maintenance and drives the Monthly-Costs "Gas" chip (icon-only, no supply-type suffix). Never gate `gas_type` on `utility_gas_included` — they are independent facts.

### building_notes = "About the Property"
`properties.building_notes` is the canonical owner-authored public description of the property; it renders in the "About the Property" `PageSection`. `properties.description` (legacy) is retained in the DB + writable via `mapFieldToDb` but no longer shown to tenants and no longer collected in the owner or admin forms. `properties.title` is likewise retained but not surfaced.

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

## Phase 3 Edge Functions
Phase 3 complete (2026-07-17). Functions: `submit-contact-request`, `reveal-contact`, `resend-reveal`, `resend-contact-webhook`. All `verify_jwt=false` + manual JWT. **Phone never in response body** (D-P3-001). `tenant_id` from JWT only. service_role for all DB writes. `resend-contact-webhook` returns 200 on valid Svix signature.
Skip email if no email (`skipped_no_email`); fall back to `get_phone_fallback` if phone null (`skipped_no_phone`). Approval: 2 emails in parallel; stands if either fails.

## Phase 3 UI wiring — See D-P3-001–D-P3-019. **Key**: Approve → `functions.invoke('reveal-contact')` (never direct UPDATE); Decline on `status=pending`; Re-request delegates to RequestContactPanel. OwnerRateBlock: `< 5` → "New owner · Verified"; `>= 5` → "Responds to X%".

## Phase 3 conventions
- `N8N_WEBHOOK_SECRET`: n8n auth. `RESEND_WEBHOOK_SECRET`: Svix sig verification. n8n → Supabase: SECURITY DEFINER RPC + anon key only; never service_role in n8n (D-P3-012). OwnerRateBlock columns: `all_time_handled/responded`, `last_7d_handled/responded` — not `_total` or `_rate`.

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

### PropertyDetail CTA states (priority): 1=draft→"Continue Draft" (/apply?resume=<id>)  2=ACTIVE_STATUSES→"in progress"  3=on_hold→"secured"  4=maxReached(≥3)→"maximum"  5=withinCooldown→date  6=non-draft history→"Apply Again"  7=no history→"Apply Now"
Derive via `.find()` on full applicationHistory — attempt_number ties are non-deterministic.

## Commons Phase 1 + 1.5 (D-001–D-171)
- `property-fields.ts` + `<SpecField>` = single source of truth. `flat_number` never public (D-091). **Adding a new properties column**: spec → `FormState` → `INITIAL_STATE` → `prefillFormFromRow` → `mapFieldToDb` → JSX → mirror on `PropertyEdit.tsx` → `approve_edit_request` COALESCE migration.
- ListProperty: 9-section accordion, draft cap 20/user, submit → `pending_review`. Path A (draft/changes_requested direct-patch), Path B (`submit_property_edit_request` RPC for listed/edit_pending_review).
- DO NOT re-apply rent/sale trigger (D-160 — via MCP). `useListingSave.patch()` buffers pre-draft (D-153/154). JSONB: `<FurnishingEditor>` + `<AmenitiesEditor>` in `src/components/property/`.

## Commons Phase 2 — Tenant Dashboard (D-172–D-177)
- `<VerificationGate />` on `/list` + `/tenant-dashboard/preferences` (D-172). `rental_preferences` table: one-row-per-user, upsert-only, no DELETE. Routing: `/dashboard` → `/tenant-dashboard`. `isFullyVerified = !!(phone_verified && email_verified)` on `useAuth` (D-176).

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

## Google Maps Phase 1 (2026-07-26)
- `@vis.gl/react-google-maps` v1.x; `APIProvider` in `App.tsx` inside `QueryClientProvider`, outside `BrowserRouter`.
- `PropertyAddressInput` at `src/components/property-address/` — `mode='owner'|'admin'`; Path A (building autocomplete) + Path B (area geocode).
- Session tokens: one per session, terminated by Place Details call (zero billing for Place Details).
- India-only: `componentRestrictions: { country: 'in' }` on all calls.
- `lister_flat_number`: new column (10 char, CHECK). Old `flat_number` (admin-only, never public) untouched.
- `address_mode`: `'google_place'` (Path A) | `'manual'` (Path B).
- `location_verified_by_owner`: DB boolean, `<Checkbox>` in PropertyAddressInput, required for submission.
- `streetview_show_in_listing`: defaults true when SV available.
- Owner can edit address only in `draft` / `changes_requested` (Tier 1 lock).
