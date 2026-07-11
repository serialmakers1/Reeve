# Reeve

Property management platform connecting owners and tenants in India. Owners list properties, tenants apply and sign leases — Reeve manages inspections, agreements, and the full rental lifecycle.

## Tech Stack
- React 18 + TypeScript (Vite + SWC)
- Tailwind CSS + shadcn/ui (Radix primitives)
- Supabase (Postgres + Auth + Storage)
- React Router v6
- Sentry for error tracking, PostHog for analytics

## Key Commands
npm run build      # production build (runs postbuild: sitemap + SSG prerender)
npm run lint       # eslint
npm run test       # vitest

## Typecheck (IMPORTANT)
- Correct command: `npx tsc -p tsconfig.app.json --noEmit` — NOT `npx tsc --noEmit`, which checks ZERO files (root tsconfig has `"files": []` + project references).
- Baseline: **411 pre-existing errors** (as of Phase 1 Prompt 2, 2026-07-10) from Supabase generated types (query generic inference); they do NOT block the vite build. Verify by diffing against this baseline, not expecting zero. New TS2304/TS2552 (unresolved identifier) errors in touched files = runtime crashes vite won't catch.

## SSG (Static Site Generation)
Approach: custom post-build prerender script — no SSR framework, no new dependencies.
Script: `scripts/prerender.mjs` — runs automatically after `vite build` via `postbuild`.

### Route classification
- **Public / pre-rendered** (crawlers get real HTML): `/`, `/owners`, `/search`, `/savings/tenant`, `/contact`
- **Also public, not pre-rendered** (low SEO value): `/privacy`, `/terms`, `/refund`, `/login`
- **Protected / CSR-only** (never pre-render): everything under `/dashboard`, `/admin`, `/owner`, `/my-properties`, `/eligibility`, `/profile`, `/refer-property`

### How it works
1. Vite builds the SPA → `dist/index.html` (app shell with hashed asset URLs).
2. `prerender.mjs` reads the shell and writes per-route HTML files with route-specific `<title>`, `<meta>`, and static body HTML injected into `<div id="root">`.
3. Vercel serves static files before applying rewrites → pre-rendered routes get real HTML; auth routes fall through to the catch-all rewrite → CSR.
4. `main.tsx` uses `createRoot` (not `hydrateRoot`) → React replaces static HTML on mount. No hydration mismatch.

### Adding a new public route to SSG
Add an entry to the `routes` array in `scripts/prerender.mjs` with `outFile`, `title`, `description`, `ogTitle`, `ogDescription`, `canonical`, `bodyHtml`, and optionally `jsonLd`. Also add it to `ACTIVE_ROUTES` in `scripts/generate-sitemap.mjs`.

### JSON-LD schema
- All schema lives in `scripts/prerender.mjs`. Do not add schema markup to JSX.
- `safeJsonLd()` Unicode-escapes `<`, `>`, `&` before embedding in `<script>` tags — do not use raw `JSON.stringify`.
- `aggregateRating` MUST NOT be added until 5+ Google reviews exist.
- BreadcrumbList is present on every non-homepage route (`/owners`, `/search`, `/savings/tenant`, `/contact`). Homepage does NOT get a BreadcrumbList.
- `areaServed` uses structured City objects (`{ "@type": "City", name, containedInPlace: { "@type": "City", name: "Bengaluru", containedInPlace: { "@type": "AdministrativeArea", name: "Karnataka" } } }`), not plain strings. Defined via `AREA_SERVED` constant; do not revert to strings.
- Current schema per route: `/` → Organization+LocalBusiness+RealEstateAgent (with openingHoursSpecification), WebSite, FAQPage; `/owners` → Service, FAQPage, BreadcrumbList; `/savings/tenant` → WebApplication, FAQPage, BreadcrumbList; `/contact` → LocalBusiness (in @graph), BreadcrumbList; `/search` → BreadcrumbList only.

### Do NOT
- Do not use `vite-ssg`, `vite-plugin-ssr`, or any SSG framework — they render the full app tree in Node.js and conflict with Supabase client, PostHog, and Sentry (all browser-only at module scope).
- Do not add pre-rendering for any auth/protected route.
- Do not modify `src/integrations/supabase/client.ts` — the `noOpLock` must remain unchanged.

## Path Aliases
@/ maps to ./src/ — always use this, never relative imports.

## Supabase
- Project ref: tfutuqqcxqqbirnsdpvz
- URL: https://tfutuqqcxqqbirnsdpvz.supabase.co
- Client: import { supabase } from "@/integrations/supabase/client"
- Types: src/integrations/supabase/types.ts — auto-generated, do not edit
- Auth storage key: reeve-auth
- Always use apply_migration for DDL. Never raw SQL for schema changes.

## Auth Architecture
- Auth system: phone OTP (MSG91) + Google OAuth. Email OTP removed — do not use for new flows.
- Login: phone 10-digit input → `+91` prefix → SMS OTP via `signInWithOtp({ phone })`. Google OAuth as equal-weight alternative.
- After verify success: navigate to `returnTo || '/'` — no onboarding check, no redirectByRole.
- `handle_new_user` trigger fires for phone OTP users (phone_confirmed_at IS NOT NULL) — no longer email-only.
- `handle_user_updated` trigger: handles phone_confirmed_at (phone OTP) and email_confirmed_at (Google OAuth). Google users get public.users row via UPDATE trigger. `ensure_user_exists` DB function exists but must NOT be called from frontend.
- `useAuth` AppUser: `phone_verified`, `email_verified`, `auth_provider` fields added; `onboarding_completed` removed.
- `useRequireAuth` returns `loading` (not `isLoading`) — use `loading: authLoading` when aliasing.
- `send-sms-otp` edge function: Supabase Send SMS Hook → MSG91 (TEMPLATE_ID: 1207177503631409147, sender: REEVPM). Secrets: MSG91_AUTH_KEY, MSG91_TEMPLATE_ID. verify_jwt=false (called by Supabase Auth internally).
- Profile phone verify: capture Google token in googleTokenRef BEFORE signInWithOtp (it replaces the session). Pass via Authorization header to verify-phone-otp using raw fetch (not functions.invoke).
- public.users phone: stored as `91XXXXXXXXXX` (no + prefix). Display: `.replace(/^(\+91|91)/, "")` → show `+91 {digits}`.
- After linkIdentity: session.user.email is "" — read from `identities[].identity_data.email`; full_name from `identity_data.full_name ?? identity_data.name`.
- Profile: "Change Phone Number" hidden once phone_verified. Email shown read-only in Google section after linking.
- Profile.tsx: Mount useEffect (empty deps) reads window.location.hash for error_description fragments on load — must appear before onAuthStateChange useEffect so it fires first. If description contains "already linked" → "This Google account is already linked to another profile."; otherwise shows decoded description. navigate('/profile', {replace:true}) strips the hash after toast shown.
- returnTo mechanism — two paths:
  Phone OTP: ?returnTo= query param read via useSearchParams at render top level. After refreshUser() in handleVerifyPhoneOtp, if returnTo && returnTo !== '/profile', navigate there and return early.
  Google link: sessionStorage key 'reeve-link-returnTo', written in handleLinkGoogle before linkIdentity, read+cleared in onAuthStateChange after USER_UPDATED. Do NOT put ?returnTo in linkIdentity redirectTo — Supabase whitelist strips query params.
  onAuthStateChange uses single navigate (no /profile flash): sessionStorage first → localStorage pendingReturnTo fallback → /profile default.
- `verify-phone-otp` edge function: validate JWT → POST /auth/v1/verify → age-check phoneUserId (if created_at > 60s ago → 409 "already registered") → DELETE auth.users/{phoneUserId} → DELETE public.users?id=eq.{phoneUserId} → PUT /auth/v1/admin/users/{googleUserId} { phone, phone_confirm: true }. Direct fetch, verify_jwt=false in config.toml. Check JWT=OFF in dashboard after each deploy. `SPURIOUS_ROW_MAX_AGE_MS = 60_000` — rows younger than 60s are assumed spurious (created by signInWithOtp); older rows are legitimate users and must never be deleted.
- useAuth() — single source of truth. Returns { session, user, isLoading, isAuthenticated, signOut, refreshUser }
- useAuth critical patterns (do NOT remove any of these):
  - onAuthStateChange returns early on INITIAL_SESSION — getSession() handles bootstrap; processing both races and hangs isLoading
  - onAuthStateChange deferred via setTimeout(100ms) — Supabase holds internal lock during callback; DB calls deadlock without deferral
  - loadUser sets session + isAuthenticated: true BEFORE the DB query — ensures safety timeout can't trigger /login redirect
  - 5s safety timeout forces isLoading: false if DB fetch stalls — preserves session/isAuthenticated, never redirects
- Known Supabase bug: navigator.locks (Web Locks API) with acquireTimeout: -1 causes deadlocks for multi-provider auth users (phone+Google). Fix: noOpLock in src/integrations/supabase/client.ts createClient({ auth: { lock: noOpLock } }). Do NOT remove — breaks phone+Google users on refresh. Trade-off: disables cross-tab session sync (acceptable, single-tab app).
- useRequireAuth({ requireAdmin? }) — use on all protected pages
- Never call supabase.auth.getSession() in rendering logic or useEffect data gates — use useAuth(). Event handlers performing one-time mutations may call it directly.
- Never reference `session.user.id` in component render logic or Supabase queries — use `user.id` from `useRequireAuth()` or `useAuth()` instead. `session` is only valid inside async event handlers that explicitly call `await supabase.auth.getSession()`.
- Loading guards on protected pages must cover BOTH auth loading and data loading: `if (authLoading || dataLoading) return null` — never guard on data loading alone. Auth hydration takes a non-zero amount of time on mount; guarding only on data loading causes a race where `navigate('/login')` fires before auth has resolved.
- When destructuring from `useAuth()` in a component that also fetches data, always include `isLoading` (alias it as `authLoading`) and add it to every loading guard and useEffect dependency array.
- After signup, users row has ~1s trigger lag — fetchUserWithRetry handles this, do not remove

## User Roles
user | tenant | owner | admin | super_admin
Post-login redirect handled by authUtils.getDefaultRouteForRole(role)

## Route Guards
All route protection is via `useRequireAuth()` inside the page component — no wrapper in App.tsx.
OnboardingGuard has been removed. Do not add it back.
`onboarding_completed` column dropped from DB and removed from code — do not reference in any new code.

## Layout Rules
- All public/tenant pages use <Layout> (src/components/Layout.tsx) — includes Header + Footer
- Admin pages use <AdminLayout> (src/components/admin/AdminLayout.tsx)
- Never hardcode nav or footer inside pages — always use Layout

## Property Status Flow
draft → inspection_proposed → inspection_scheduled → inspected → listed → occupied → off_market
Display labels and colors live in src/lib/propertyStatus.ts — keep display logic there.

## RLS Policy Patterns
- Admin SELECT/UPDATE: single policy using `USING (is_admin())` — no role binding, no WITH CHECK
- User SELECT: `USING (user_id = auth.uid())`
- User INSERT: `WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid())`
- User UPDATE (restricted): `USING (user_id = auth.uid() AND status = '<allowed_status>')`
- `is_admin()` covers roles: admin, super_admin (no ops role in this project)
- Multiple SELECT policies on one table are OR-ed by Postgres — separate user+admin SELECT policies are valid

## Database Tables (23 total)
agreements, applications, application_notes, application_residents, documents,
eligibility, favourites, inspection_callbacks, keys_tracking, leads, leases,
maintenance_requests, owner_action_log, owner_bank_details, payments, profiles,
properties, property_condition_reports, property_images, users, visit_events, visits
View: properties_with_flat_number

## Visit Mutation Pattern — RPC-Only (enforced as of 2026-04-22)
All visit state mutations MUST go through Supabase RPCs, never direct table writes for reschedule/complete:
- `reschedule_visit(p_visit_id, p_new_scheduled_at, p_actor)` → returns new visit UUID. Atomic: cancels old visit + logs cancelled event + inserts new rescheduled visit + logs rescheduled event. Callable by tenant (own visits) or admin. Actor derived server-side from is_admin().
- `complete_visit(p_visit_id, p_property_feedback?, p_admin_note?)` → void. Admin-only. Atomic: marks complete + logs exactly one 'completed' event + logs note events separately. Notes never use event_type='completed'.
- Cancel and no_show mutations: still direct `.update()` — add visit_events insert manually after update.
- Frontend call pattern: `await supabase.rpc('reschedule_visit', { p_visit_id, p_new_scheduled_at, p_actor: '' })`

## Visit event_type Taxonomy
- **Status events** (one per transition): `scheduled` | `rescheduled` | `cancelled` | `completed` | `no_show`
- **Note events** (separate from status): `property_feedback_note` | `admin_note`
- Rule: never use a status event_type to carry note data. Notes get their own event row.
- CHECK constraint enforces the full allowed list on visit_events.event_type.

## Visit Status Machine
Valid transitions (enforced by BEFORE UPDATE trigger `enforce_visit_status_transitions`):
- `scheduled` | `confirmed` | `rescheduled` → `rescheduled` | `cancelled` | `completed` | `no_show`
- `completed` | `cancelled` | `no_show` → TERMINAL, no further transitions allowed
- Non-status field updates on terminal visits ARE allowed (trigger only fires on status change).

## Visit Events
- visit_events: append-only log. Admin may UPDATE/DELETE (RLS), tenants may only INSERT own rows.
- profiles.visit_scheduling_blocked: set true automatically by trigger when no_show_count >= 3. Blocks tenant from scheduling new visits.
- visits.rescheduled_by / visits.cancelled_by: 'tenant' or 'admin' — tracks who initiated the action. Both columns exist in DB and types.ts (types were stale pre-2026-04-22).

## Shared Visit Scheduler
- VisitSchedulerModal: the single tenant scheduling component (src/components/VisitSchedulerModal.tsx). Used on /property/:id (PropertyDetail), /eligibility (Eligibility), /dashboard/visits (VisitsList, reschedule only), and /admin/calendar (FieldCalendar, admin mode). Accepts `mode?: 'tenant' | 'admin'` (default 'tenant'). Auto-advances to Step 2 on date pick. onConfirm receives UTC Date. No Supabase logic — pure picker. All scheduling / reschedule / cancel flows route through `useScheduleVisit` / `useRescheduleVisit` / `useCancelVisit` hooks in useVisits.ts. Post-booking confirmation on /eligibility is handled by an inline manage-visit card + toast (not a modal step 3). `VisitSchedulingModal` (old legacy) has been deleted — do not recreate.
  - Tenant mode: Step 2 = slot cards (Early Morning/Morning/Afternoon/Evening). max=+7days. Today disabled after 4PM IST. Past slots hidden when today selected.
  - Admin mode: Step 2 = `<input type="time">` (5-min step, HH:MM IST). max=+30days. No 4PM cutoff. Human-readable preview shown. Past datetime blocked with inline error and disabled Confirm. FieldCalendar passes mode="admin".
- FieldCalendar: visits query includes rescheduled status. 4 admin actions (Reschedule/Cancel/Mark Complete/No-Show). Reschedule → supabase.rpc('reschedule_visit'). Mark Complete → supabase.rpc('complete_visit'). No-Show increments no_show_count and shows block toast at 3.
- `visit_events.rescheduled_to_visit_id` (uuid, nullable FK → visits): set ONLY by `reschedule_visit` RPC on the `cancelled` event for the old visit. Canonical discriminator between RPC-produced cancels (non-null) and standalone cancels (null). VisitsList tenant timeline skips events where `event_type === 'cancelled' && rescheduled_to_visit_id != null`. Admin Visit Logs shows both rescheduled and cancelled rows without this filter.
- Completion notes in Visit Logs: `complete_visit` RPC writes sibling `property_feedback_note` / `admin_note` events (same `visit_id`, separate rows, `notes` field populated). VisitLogs derives `notesMap: Map<visit_id, {propertyFeedback?, adminNote?}>` via `useMemo` over all rows. Note events are excluded from the main table (never standalone rows). `completed` table rows read from notesMap for NOTES column and Event Detail sheet sections.
- VisitsList.tsx: shows full visit_events timeline per property. Reschedule → supabase.rpc('reschedule_visit'). Cancel=direct update+log event. Falls back to visit rows if no events exist. Blocks actions if profile.visit_scheduling_blocked=true.

## TypeScript Config
strictNullChecks: false, noImplicitAny: false — intentional, do not tighten.

## Critical Gotchas
- Always use .maybeSingle() not .single() — single() throws on no rows
- The users table is separate from Supabase auth — query users for role/profile, never auth.users
- eligibility table gates visit scheduling — check eligibility status before any scheduling feature
- Property images stored in Supabase Storage — property_images table holds metadata + sort order
- Tenant KYC docs uploaded to `tenant-documents` Storage bucket — path: `{userId}/{applicationId}/{type}_{timestamp}.ext`. Separate from the documents DB table.
- BottomNav is fixed bottom-0 z-50, only renders when isAuthenticated — account for this on mobile layouts
- Mobile CTA bars in PropertyDetail use bottom-16 (logged in) or bottom-0 (logged out)
- OnboardingGuard runs on every render — no expensive calls inside it
- PostHog initialized in main.tsx — use posthog?.capture() with optional chaining everywhere
- LCP images must NOT have `animate-fade-up` or any entry animation — delays opacity and tanks PageSpeed LCP score

## Skills — Always Check Before Acting

Skills live in `.claude/skills/`. Before responding to any request, check if a skill applies.
The `using-superpowers` skill defines the full workflow — read it first if unsure.

Invoke the relevant skill when:
- Writing, reviewing, or debugging any React component → `react-best-practices`
- Writing, reviewing, or optimizing any Supabase query, migration, or RLS policy → `supabase-postgres-best-practices`
- Reviewing code for vulnerabilities, auth issues, or data exposure → `security-best-practices`
- Encountering any bug, unexpected behavior, or test failure → `systematic-debugging`
- Building any new UI component, page, or layout → `frontend-design`
- Designing or reviewing any UI/UX flow → `ui-ux-pro-max`
- Reviewing a design, giving UI feedback, or critiquing a screen → `product-designer`
- Starting any new feature or significant change → `brainstorming`

Never skip a skill because the task seems simple. Read the SKILL.md, then act.

## Application Flow Guards

### Render guard ordering in NewApplication.tsx
The render guard order is strict and must never be changed:
1. `if (pageLoading)` — skeleton
2. `if (alreadySubmittedBlock)` — block screen (MUST be top-level, NOT nested inside `!eligibility` or any other check)
3. `if (!property || !eligibility)` — null return
4. `if (submitted)` — success screen
5. Full form

The `alreadySubmittedBlock` guard must NEVER be nested inside `if (!property || !eligibility)`.
Reason: `setEligibility()` is called before `setAlreadySubmittedBlock()` in `initPage()`, so
`eligibility` is always non-null when the block flag is set. Nesting the block inside the
eligibility check makes it dead code.

### NON_DRAFT_STATUSES / REAPPLICATION_ALLOWED_STATUSES
The allowed-reapplication statuses in `NewApplication.tsx` (`REAPPLICATION_ALLOWED_STATUSES`)
must always match the `NOT IN (...)` list inside the `check_application_limits` DB trigger.
If you add a new terminal status to the enum, update BOTH places atomically.
Current allowed-reapplication statuses: `owner_rejected`, `platform_rejected`, `withdrawn`, `expired`

### Supabase query error handling in initPage
Every Supabase query in `initPage()` that gates a critical flow (block check, draft insert)
must destructure `error` and handle it explicitly. Silent swallows (destructuring only `data`)
are not allowed on any query that controls navigation or user access.

### Auth hydration in PropertyDetail
The application history fetch in PropertyDetail.tsx depends on `user`. Its useEffect dependency
array must include `[id, user, authLoading, property]`. Missing `user` causes the Apply Now button to
render for users with active applications on hard refresh or direct navigation.

### Never use .maybeSingle() on unfiltered multi-row application queries
The `applications` table can have multiple rows per (tenant_id, property_id) — one per attempt
plus possibly a current draft. Never query applications for a given tenant+property without a
status filter if using .maybeSingle(). Always use targeted single-status or .in()-list queries.
Multi-row .maybeSingle() causes PGRST116 errors that surface as "Could not check application status".

### PropertyDetail CTA button states (in priority order)
1. draft exists → "Continue Draft" → /apply?resume=<id>
2. active blocking app (ACTIVE_STATUSES) → "Application in progress" text
3. on_hold → "Another applicant has secured this property" text
4. maxReached (decided_count >= 3) → "You've reached the maximum" text
5. withinCooldown → cooldown date text
6. non-draft history exists → "Apply Again" → /apply?property_id=X
7. no history → "Apply Now" → /apply?property_id=X
Derive each flag via .find() on the full applicationHistory array — never rely on sort order
alone, as attempt_number ties (e.g. withdrawn + draft both at attempt 1) make ordering
non-deterministic.

## Callback Request Components
- RequestCallbackButton (`src/components/RequestCallbackButton.tsx`): checks session (→ /login if unauthed), checks for active callback before opening modal. `className` forwarded to inner Button. Used in Contact.tsx, AdminLayout.tsx, ApplicationDetail.tsx, MyPropertyDetail.tsx.
- RequestCallbackModal (`src/components/RequestCallbackModal.tsx`): 4-step flow (Intent → Contact → Schedule India/International → Confirm). iOS keyboard: `repositionInputs={false}`, visualViewport maxHeight, onFocus={scrollToInput}. Slot greying: currentISTHour >= slotStartHour for today. Auth: `await supabase.auth.getSession()` inside handlers; `(supabase as any).from('callback_requests')` (not in generated types).

## Admin Pages
- /admin/visits: VisitLogs.tsx — visit_events with joins, client-side filters, Sheet detail.
- /admin/callbacks: Callbacks.tsx — callback_requests with status tabs, row actions, admin_notes drawer.
- TenantPipeline (/admin/applications): no_show badges, unblock button, admin_notes editor.
- AdminApplicationDetail: surfaces visit notes + admin_notes before review actions.
- PropertyDetail: visit_scheduling_blocked gate, uses VisitSchedulerModal.

## Payments / Razorpay
- Migration: `supabase/migrations/20260419150000_payments_rls_and_gateway_unique.sql`
  - RLS enabled on `payments` table; tenant SELECT policy `payments_select_own` (payer_id = auth.uid()); admin SELECT policy `payments_select_admin`
  - UNIQUE constraint `payments_gateway_reference_unique` on `payments.gateway_reference` — idempotency anchor for Razorpay order IDs
  - Service role bypasses RLS automatically — Edge Functions use service_role for INSERT/UPDATE
- `payment_pending` removed from `WITHDRAWABLE_STATUSES` in ApplicationDetail.tsx — payment-in-flight lock
- Edge Function `create-razorpay-order` (`supabase/functions/create-razorpay-order/index.ts`):
  - `verify_jwt = false`; JWT validated manually via GET /auth/v1/user (mirrors verify-phone-otp)
  - Status guard accepts `['owner_accepted', 'payment_pending']` — allows retry from `payment_pending` state
  - Idempotency (Step 4) runs AFTER the status guard: if a pending payment row exists, returns same Razorpay order_id so the checkout reopens without creating a new order
  - Admin can reset `payment_pending` → `owner_accepted` via STATUS_ACTIONS in admin ApplicationDetail (manual override for expired/stuck orders — webhook idempotency guards handle stale webhooks after reset)
  - Razorpay order via native `fetch()` (not npm SDK); `checkout_config_id: "config_SfHzUgldMePgt1"`
  - Token: fixed 500000 paise (₹5,000) — NEVER derived from rent. Advances app to `payment_pending`
  - Secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Edge Function `verify-razorpay-payment` (`supabase/functions/verify-razorpay-payment/index.ts`):
  - `verify_jwt = false`; HMAC-SHA256 via Web Crypto API; responds 200 immediately, DB in `EdgeRuntime.waitUntil()`
  - `payment.captured` → payments→success, app→payment_received, competing apps→on_hold
  - `payment.failed` → payments→failed, app→owner_accepted (NOT withdrawn — allows retry)
  - Idempotency: UNIQUE(gateway_reference) + `x-razorpay-event-id` in `gateway_response.razorpay_event_id`
  - Secret: `RAZORPAY_WEBHOOK_SECRET`
- Frontend (Phase 4 complete):
  - `index.html`: Razorpay `checkout.js` loaded before `</body>`
  - `ApplicationDetail.tsx`: `owner_accepted` → "Pay ₹5,000 Token"; `payment_pending` → "Complete Payment →"; `payment_received` → confirmation + next-steps
  - Flow: `supabase.functions.invoke('create-razorpay-order')` → `window.Razorpay` modal → handler polls 3s×5 for `payment_received`
  - Webhook is source of truth. `payment_received` toast fires once per load via `useRef`
  - `ApplicationsList.tsx`: "Pay Token →" chip on `owner_accepted` rows → navigates to detail page

## Index Naming Convention
All DB indexes follow `idx_<table>_<column>` (confirmed from existing indexes: `idx_visits_status`, `idx_leads_status`, `idx_applications_status`, etc.). Multi-column: `idx_<table>_<col1>_<col2>`. Storage bucket naming: kebab-case (`tenant-documents`, `owner-documents`). Property images go to Cloudflare R2 (not Supabase Storage) — no `property-images` bucket in `storage.buckets`.

## Migration Conventions (Reeve Commons Phase 1+)
- Single-purpose migration files — each does one logical thing. Prefer 7 focused files over 1 mega-file (rollback safety, review clarity).
- All migrations idempotent — `IF NOT EXISTS` on ADD VALUE / ADD COLUMN, `DROP … IF EXISTS` before CREATE POLICY/TRIGGER/FUNCTION.
- Postgres BEFORE triggers fire alphabetically by trigger name. When ordering matters, name accordingly. Example: `enforce_property_owner_transitions_trigger` (validate) sorts before `handle_property_status_change` (mutate), so validation runs first.
- Enum ADD VALUE requires COMMIT between the ADD and any reference to the new value. Use one BEGIN/COMMIT per ADD VALUE, or split across separate migration files.
- All new tables get RLS enabled at creation time; policies added in the same or a following migration.
- Property activity log (`property_activity_log`) and edit requests (`property_edit_requests`) are NEVER written directly from the frontend — service_role via RPCs and triggers only.

## Commons Prompt 10 fixes
- `property_images_select_public` widened to include `edit_pending_review` — previously public search returned these listings but the photos policy blocked cover images. Fixed in `20260710121000_fix_commons_gaps.sql`.
- `property_activity_log_writer` trigger extended with an `admin_edit` branch: fires when `is_admin()` UPDATE changes tracked Tier-2 fields with no status change. Log row is private (`is_public=false`). Admin PropertyEdit form itself unchanged — logging happens transparently via trigger.
- ListProperty Path B submit is now guarded against empty payloads — toast "No changes to submit" prevents empty edit requests from clogging the admin queue.
- ListProperty preview mode computes effective photos in Path B: existing minus `photo_changes.delete`, plus `photo_changes.add` mapped to preview shape.

## Commons Prompt 9 polish
- Public timeline on PropertyDetail: `src/components/property-detail/PublicTimeline.tsx` reads `property_activity_log` WHERE `is_public=true` for the property. Renders `payload.summary` only — no actor, no reasons. Distinct from owner-facing `ActivityTimeline`. First 10 events shown; "Show all" expands.
- Archived/unlisted owner branch on PropertyDetail: when `isOwnProperty && (status=archived OR status=unlisted)`, render a friendly notice with dashboard link and (for unlisted) direct link to `/owner-dashboard/property/:id`. Non-owners still 404 via RLS.
- `properties.status` added to PropertyDetail's SELECT column list and to `PropertyData` interface (previously omitted).
- ListProperty session restore modal: on mount for Path B properties, reads `sessionStorage.getItem(edit_draft:${propertyId})`. If < 7 days old and current in-memory payload is empty, offers "Restore changes" vs "Start fresh". Restore path applies field_changes + photo_changes and forces modifyingEdit=true.
- ListProperty modify-edit auto-transition REMOVED. Owner must click the explicit "Modify edit" button in the edit_pending_review banner to unlock the form. `updateField` no longer sets `modifyingEdit=true` on Path B; readOnly gate above returns before writes in the read-only state.

## Commons Admin Review (Phase 1 Prompt 8)
- Route `/admin/listing-reviews` — 2 tabs (New Listings | Edit Requests) with count badges. Sort: oldest (default), newest, owner name. City filter derived from queue data. Tab state persists in `?tab=`.
- Route `/admin/listing-reviews/:type/:id` — detail. `:type` = `new` (id is properties.id) or `edit` (id is property_edit_requests.id).
- New listing approve → direct `UPDATE properties SET status='listed'` — trigger sets is_active + listed_at + emits log entry.
- New listing "Request changes" → per D-118: `UPDATE properties SET status='changes_requested'` then non-atomic INSERT into property_activity_log with `action='listing_rejected'` payload `{ summary, reason, reason_text }`.
- Edit request approve/reject → RPCs `approve_edit_request(uuid)` / `reject_edit_request(uuid,text,text)` (from Prompt 4).
- Race guard: RPCs raise if edit no longer pending. Admin sees toast "This edit was superseded or cancelled by the owner. Refreshing…" and detail refetches.
- AdminLayout: "Listing Reviews" nav item added between Properties and Inspections. Live badge counts `properties WHERE status='pending_review'` + `property_edit_requests WHERE status='pending'`.
- Revision history: `property_edit_requests` with `status IN (superseded, rejected, withdrawn, approved)` ordered DESC. Collapsible timestamps expand to full field diff.
- Owner identity in queue rows: fetched from `public_profiles` view (single `.in()` per queue load). Cross-user `users` reads deferred (see forward-plan).
- Queue uses client-side filter+sort over a single fetch per tab (D-119).

## Commons Property Management (Phase 1 Prompt 7)
- `/owner-dashboard/property/:id` = full 4-tab (Requests | Details | Photos | Activity) page. Replaces Prompt 6 placeholder. Tab state persisted in `?tab=`.
- Reusable pieces: `src/components/property-management/ConfirmDialog.tsx` (single dialog used for all 5 owner action modals) and `src/components/property-management/ActivityTimeline.tsx` (renders `property_activity_log` with discriminated union narrowing).
- Confirmation modals — copy locked per commons-ux.md §7:
  1. Withdraw (pending_review → draft) — direct UPDATE
  2. Cancel listing (any → archived) — direct UPDATE, destructive
  3. Unlist (listed → unlisted) — direct UPDATE, destructive
  4. Re-list (unlisted → listed) — direct UPDATE, trigger handles is_active
  5. Cancel pending edit (edit_pending_review → listed) — RPC `cancel_pending_edit_request`
- Per-field "Currently live: X" subtitles (deferred from Prompt 4) IMPLEMENTED in Details tab: for every field in `pendingEdit.payload.field_changes`, `FieldRow` renders the pending value in blue with a small "Currently live: <old value>" line underneath.
- Photos tab shows: existing photos (with strikethrough + "Marked for deletion" if in `photo_changes.delete`), pending adds (with "Pending review" badge). Owner clicks "Manage photos" → `/list/:id` to edit.
- Activity tab reads `property_activity_log` in reverse chrono, narrows payload via switch on `action`, prefers `payload.summary` with fallback derived per action. Rejection reason expandable.
- `changes_requested` banner reason resolves from most recent `listing_rejected` or `edit_rejected` activity log entry (looks at `payload.reason_text ?? payload.reason`). Ack via `owner_action_acknowledgments` (target_type='property').
- Legacy PM statuses (`inspection_*`, `agreement_pending`, `occupied`, `off_market`, `inactive`, etc.): read-only details, no owner actions, notice "Contact your account manager for changes."
- Summary card visible on all tabs; "View public listing" link only for `listed` / `edit_pending_review`.

## Commons Owner Dashboard (Phase 1 Prompt 6)
- `/owner-dashboard` is the new canonical dashboard URL. `/my-properties` redirects to it. `/my-properties/new` still redirects to `/list` (unchanged from Prompt 3). `/my-properties/:id` (MyPropertyDetail) preserved for legacy PM properties — Commons cards route to `/owner-dashboard/property/:id`.
- BottomNav "Owner Dashboard" tab points to `/owner-dashboard`; active-tab check also matches `/my-properties` during transition.
- Header dropdown unchanged (D-088 — nav updates deferred to Phase 6).
- `OwnerPropertyManagement.tsx` at `/owner-dashboard/property/:id` is a Prompt 6 placeholder. Prompt 7 replaces it with the full 4-tab (Requests/Details/Photos/Activity) experience. Placeholder actions: draft/changes_requested → "Continue editing" → `/list/:id`; listed/edit_pending_review → "Edit listing"; unlisted → "Re-list" (direct UPDATE, valid owner transition).
- Draft cap of 20 (D-101) enforced client-side in dashboard Add Property button + DB trigger belt-and-suspenders.
- Legacy PM statuses (inspection_*, occupied, off_market, etc.) render in the Active tab with their existing badges — no special treatment. Archived properties in a separate tab, hidden from Active (D-069).
- Reusable components: `PropertyCard` (owner-dashboard folder), `TopRequestsStrip` (reserved for Phase 3 contact requests — renders null when count=0).

## Commons Profile Pages (Phase 1 Prompt 5)
- Two new routes: `/me` (editable public identity) and `/u/:userId` (read-only view). Header nav still points to `/profile` (D-088).
- `/me` uses `getUserDisplayName()` fallback chain; UPSERT on `profiles` (INSERTs if missing). Shows Google-pulled `profile_photo_url` + initials fallback via `ProfileAvatar`.
- `/u/:userId` reads from `public_profiles` VIEW (migration `20260710120800`) — exposes only `user_id, display_name, bio, profile_photo_url, is_public`. Sensitive columns (Aadhaar, PAN, KYC, etc.) are unreachable via the view. Filters by `COALESCE(is_public, true) = true`. Grants: SELECT to authenticated and anon.
- View is `security_invoker = false` — runs as owner, bypasses profiles RLS by design (only the 5 safe columns exposed). Self-redirect: viewing `/u/<own id>` → `/me`.
- Shared components: `src/components/profile/ProfileAvatar.tsx` (djb2-hash → 12-color palette; stable per name), `src/components/profile/ListingsGrid.tsx` (queries `properties` where `owner_id = userId AND status IN ('listed','edit_pending_review') AND is_active = true`).
- Empty ratings section reserves space for future ratings system; do not build ratings now.
- Verified badge: subtle green checkmark shown if `users.phone_verified` OR `users.email_verified`.

## Commons Edit Flow (Phase 1 Prompt 4)
- Route `/list/:id` opens ListProperty in edit mode; wrapped in `<ListPropertyEditWrapper>` to force `key={id}` remount (D-102).
- Two write paths derived from property status:
  - **Path A** (`draft`, `changes_requested`): field changes patch `properties` directly via `useListingSave` (auto-save 500ms).
  - **Path B** (`listed`, `edit_pending_review`): field changes accumulate in local `editRequestPayload = {field_changes, photo_changes}`; no DB write until Submit. Submit calls RPC `submit_property_edit_request` which supersedes any prior pending row and transitions `listed → edit_pending_review`.
- Blocked statuses (`pending_review`, `unlisted`, `archived`) redirect to `/my-properties` with a status-specific toast.
- `edit_pending_review` opens in read-only mode (`opacity-70 pointer-events-none` on the accordion) with two actions: **Modify edit** (unlock form; next Submit supersedes the pending row) and **Cancel pending edit** (RPC `cancel_pending_edit_request`).
- `changes_requested` shows an amber banner with the admin's rejection reason. "OK, got it" inserts into `owner_action_acknowledgments` (target_type='property'). Ack persists cross-device.
- Photo upload branches on `path`. In Path B modify-edit mode the Edge Function receives `pending_edit_request_id` and folds the R2 URL into `payload.photo_changes.add[]` (no property_images INSERT). In Path B first-time editing a `listed` property (before any Submit), photos INSERT directly to property_images but are ALSO mirrored into `editRequestPayload.photo_changes.add` so the RPC has a complete snapshot on Submit.
- Photo delete in Path B: local-add cancels drop from `photo_changes.add`; existing images append to `photo_changes.delete` (admin applies on approval).
- Session storage: `edit_draft:${propertyId}` — silent save on every payload change; cleared on Submit/cancel. Restore is silent (no prompt).
- RPCs (in migration `20260710120700_add_edit_request_rpcs.sql`): `submit_property_edit_request(uuid,jsonb,jsonb) → uuid`, `approve_edit_request(uuid) → void`, `reject_edit_request(uuid,text,text) → void`, `cancel_pending_edit_request(uuid) → void`. All SECURITY DEFINER; all authorize via `auth.uid() + is_admin()`.
- Rejected edits keep property `listed` with the live values intact (D-094).
- Approve RPC uses `COALESCE` per column so partial edits work correctly. Enum type: **`parking_availability`** (not `parking_type`).

## Commons ListProperty (Phase 1 Prompt 3)
- Route: `/list` (create), `/list/:id` (edit — Prompt 4). `/my-properties/new` redirects to `/list`.
- File: `src/pages/ListProperty.tsx` — 9-section vertical accordion, auto-save via `useListingSave`, photo pipeline via `processPhotoForUpload`.
- Shared preview: `src/components/listing/PropertyPreview.tsx` (lightweight tenant-view dialog; not a wrapper around PropertyDetail).
- Shared constants: `src/config/property-form.ts` (BHK/PROPERTY_TYPE/FURNISHING/etc. options — duplicated from admin/PropertyEdit, admin file untouched).
- Draft lifecycle: draft row auto-created 800ms after 6 required INSERT fields fill in (`building_name`, `street_address`, `city`, `bhk`, `furnishing`, `owner_id`). Once draft exists, every field change auto-saves via `useListingSave.patch()`. URL becomes `/list?draft=<id>` — route stays `/list` so `key="new"` doesn't remount.
- Draft cap: 20 per user. Enforced client-side (modal blocking entry) + DB trigger (belt-and-suspenders).
- Photo section (Section 7) disabled until draft exists (D-108). Uses PHOTO_CONFIG constants.
- Submit → `properties.status = 'pending_review'`. DB trigger enforces required-field + min-3-photos gate server-side. Missing sections turn 🔴 and page scrolls to first incomplete.
- Session-expired modal is non-dismissible; shows JSON block of form state so owner can copy manually before re-login.
- Header/Footer/BottomNav NOT touched — `/list` unlinked until Phase 6 cutover.

## Commons Frontend Primitives (Phase 1 Prompt 2)
- Photo constants: `src/config/photo.ts` (PHOTO_CONFIG — compression, min/max count, accepted formats, sections).
- User display: `src/lib/user.ts` — `getUserDisplayName(user, profile)` is the ONLY correct way to render user names. Fallback chain: `profiles.display_name` → `users.full_name` → email prefix → "Anonymous". Never throws.
- Photo pipeline: `src/lib/photo.ts` — `processPhotoForUpload(file)`. Raw size check → HEIC conversion (dynamic import of heic2any) → compression. Silent, returns `{ ok, file } | { ok:false, error }`.
- Listing auto-save: `src/hooks/useListingSave.ts` — mirrors `useInspectionSave` (ref-based patch, 500ms debounce, newer-edits-win on failure). `saveState` includes `session_expired` for D-100 modal wiring. No-op if propertyId is null.
- Activity log types: `src/types/activity-log.ts` — `ActivityLogPayload` discriminated union. Every variant has `summary: string`. Only writers (triggers + RPCs) touch these; readers narrow via `switch(payload.action)`.
- Deps added: `browser-image-compression` (static), `heic2any` (**always dynamic-import only** — ~200KB gzipped, do not `import` at module top).

## Commons Property Status Machine (Phase 1)
Seven Commons statuses added to `property_status` enum: `pending_review`, `changes_requested`, `edit_pending_review`, `unlisted`, `archived` (plus existing `draft` and `listed`). PM statuses (`inspection_*`, `agreement_pending`, `occupied`, `off_market`, `expiring`, `turnover`, `inactive`) remain untouched. See commons-status-flow.md for the full 14-transition matrix.
- `enforce_property_owner_transitions` trigger validates owner-initiated transitions; admin bypasses via `is_admin()`.
- `handle_property_status_change` trigger auto-manages `is_active` (keeps true for `listed` and `edit_pending_review`, sets false when leaving `listed` for anything else except `occupied`/`edit_pending_review`).
- `property_activity_log_writer` trigger emits one log row per status change; curated events (`listed` from pending_review/unlisted, `unlisted`) get `is_public=true`.

## Inspection Form Conventions (post user-testing refinements, 2026-06)
- Condition display labels (DB values unchanged): good="Good", minor_wear="Minor Wear", moderate_damage="Poor — Visible Damage", severe_damage="Critical — Severe Damage".
- Auto-population: `minor_wear` + cosmetic statuses (flickering, slow_drain, leaking, low_pressure, stiff lock, torn mesh) trigger `cosmetic` damage entries. Appliance conditions auto-populate too (minor_issues→cosmetic, non_functional→repair_before_relet) via `useAutoPopulateApplianceDamages`; `source_ref` is `{room_id}|{appliance_id} + field_key` union. Auto entries pre-fill `notes` from source entry and carry `source_condition` (human-readable trigger label, shown as PDF Condition column).
- `EntryList` FieldConfig supports `customTextOnValue: "custom"|"other"` — inline free-text input appears when that option is selected, stored at `<key>_custom`. Used for wall/ceiling/flooring zones, DW item_type, electrical item, plumbing status. The old `allowCustom` add-button pattern is removed from surfaces/DW.
- Section names: "Damage Logs" (form card + PDF) and "Key Record" (form card + PDF).

## Undocumented Tables (beyond the 23 in Database Tables section)
`external_queries`, `property_inspections`, `inspection_appliances`, `inspection_rooms` — exist in DB, not yet in active frontend use. FKs confirmed in pg_constraint.

## PostHog Patterns
- Always use `posthog?.capture(...)` — optional chaining is mandatory. Never bare `posthog.capture(...)`.
- Owner acquisition funnel events: `list_property_cta_clicked` (source_page) → `signup_completed` (intent:'owner') → `property_form_started` → `property_submitted` → `owner_clarity_guide_read`.
- Owner intent is threaded through login via `returnTo=/owner/add` query param. `isOwnerIntent = returnTo === '/owner/add'` in Login.tsx; spread `{ intent: 'owner', return_to: returnTo }` onto `signup_completed` when true.
- `list_property_cta_clicked` fires on all 8 "List Your Property" CTAs across Header (×2), Footer, Index (×2), OwnerLandingPage, OwnerSavingsCalculator (×2). source_page values: 'header'|'footer'|'home'|'owners'|'savings_calculator'.
- Scroll-depth events: use `useRef<boolean>` to fire-once. Pattern used in OwnerClarityGuide for `owner_clarity_guide_read` at 80% scroll.
