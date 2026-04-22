# Reeve

Property management platform connecting owners and tenants in India. Owners list properties, tenants apply and sign leases — Reeve manages inspections, agreements, and the full rental lifecycle.

## Tech Stack
- React 18 + TypeScript (Vite + SWC)
- Tailwind CSS + shadcn/ui (Radix primitives)
- Supabase (Postgres + Auth + Storage)
- React Router v6
- Sentry for error tracking, PostHog for analytics

## Key Commands
npm run build      # production build
npm run lint       # eslint
npm run test       # vitest

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
- VisitSchedulerModal: shared 2-step picker (src/components/VisitSchedulerModal.tsx). Accepts `mode?: 'tenant' | 'admin'` (default 'tenant'). Auto-advances to Step 2 on date pick. onConfirm receives UTC Date. No Supabase logic — pure picker. Used by PropertyDetail, VisitsList (tenant), FieldCalendar (admin).
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
  - Validates ownership + `status = 'owner_accepted'`; idempotency returns existing pending order
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
