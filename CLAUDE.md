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
- useAuth() — single source of truth. Returns { session, user, isLoading, isAuthenticated, signOut, refreshUser }
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
All authenticated routes use <OnboardingGuard>. Users with onboarding_completed: false are redirected to /onboarding.
Every new protected route must be wrapped in <OnboardingGuard>.

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

## Visit Events
- visit_events: append-only log table for all visit state changes (scheduled, rescheduled, cancelled, completed, no_show). Never update or delete rows.
- profiles.visit_scheduling_blocked: set true automatically by trigger when no_show_count >= 3. Blocks tenant from scheduling new visits.
- visits.rescheduled_by / visits.cancelled_by: 'tenant' or 'admin' — tracks who initiated the action.

## Shared Visit Scheduler
- VisitSchedulerModal: shared 2-step date+slot picker (src/components/VisitSchedulerModal.tsx). min=today, max=+30days. Slots: Morning(9AM)/Afternoon(12PM)/Evening(4PM). No Supabase logic — pure picker. onConfirm receives UTC Date (IST slots converted: Morning=03:30Z, Afternoon=06:30Z, Evening=10:30Z). Auto-advances to Step 2 on date pick. Used by PropertyDetail, VisitsList, FieldCalendar.
- FieldCalendar: visits query includes rescheduled status. 4 admin actions (Reschedule/Cancel/Mark Complete/No-Show) write to both visits and visit_events. Mark Complete opens inline notes modal for property_feedback + admin_user_note. No-Show increments no_show_count and shows block toast at 3.
- VisitsList.tsx: shows full visit_events timeline per property. Reschedule=cancel old+insert new visit+log event. Cancel=update status+log event. Both write to visit_events. Falls back to visit rows if no events exist. Blocks actions if profile.visit_scheduling_blocked=true.

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
- RequestCallbackButton: `src/components/RequestCallbackButton.tsx`
  Usage: `<RequestCallbackButton context="property" propertyId={id} defaultIntent="tenant" />`
  Checks session → redirects to /login?returnTo=<path> if unauthenticated.
  Checks for active callback (status pending/called) before opening modal — shows toast if one exists.
  `className` prop forwarded to inner Button — use it to override button appearance (e.g., outline, link-style).
  Placed in: Contact.tsx (general, no props), AdminLayout.tsx (sidebar nav — via Phone icon, no component),
    ApplicationDetail.tsx (defaultIntent="tenant" + propertyId), MyPropertyDetail.tsx (defaultIntent="owner" context="owner_landing" + propertyId).
- RequestCallbackModal: `src/components/RequestCallbackModal.tsx`
  4-step: Intent → Contact → Schedule (3A India / 3B International) → Confirm+Submit
  Slot constants: `CALLBACK_SLOT_KEYS`, `CALLBACK_SLOT_LABELS` (exported from RequestCallbackModal.tsx)
  IST utilities: `getISTHour()`, `formatInIST(d)`, `localTimeToIST(timeStr, tz, refDate)` — all in RequestCallbackModal.tsx
  `normaliseIndianPhone(raw)` — strips +91/91 prefix from E.164 numbers before pre-filling the phone field
  `convertISTSlotToLocal(istHour, timezone)` — converts IST slot start hour to formatted local time string using Intl API; exported
  `formatSlotRange(slotKey, timezone)` — returns "HH:MM AM – HH:MM PM" range for a slot key in the given timezone; exported
  DialogContent uses `onInteractOutside={(e) => e.preventDefault()}` to prevent mobile backdrop tap from closing modal
  Step 2: India phone = `+91 (fixed prefix span) + 10-digit Input`; stored as `+91XXXXXXXXXX` in DB
  Step 3B international: slot grid replaces free-form time input; `intlSelectedSlot` state; night window label shows local converted time
  Step 3B timezone: simple 8-option `<select>` (COMMON_TIMEZONES); no search; initial value = `""` (required field)
  Step 3B phone: `+[countryCode] | phoneNumber` two-field row; `intlCountryCode` + `intlPhone` + `intlPhoneError` states
  Night window gated on `intlSelectedDate` selection (hidden until date is picked)
  Step 4 summary: always says "call"; India shows `+91XXXXXXXXXX`; international shows `+CC phone`; time shown as slot range
  step3BValid requires: channel + intlCountryCode + intlPhone + timezone !== "" + intlSelectedDate + (nightWindow || intlSelectedSlot)
  Auth: uses `await supabase.auth.getSession()` inside async handlers (never hook-derived user)
  Supabase: uses `(supabase as any).from('callback_requests')` — table not yet in auto-generated types

## Admin Pages
- /admin/visits: Visit Logs page (src/pages/admin/VisitLogs.tsx). Reads from visit_events with tenant+property joins. Client-side filtering by type/date/tenant/property/initiatedBy. Row click opens Sheet with full detail + tenant stats.
- /admin/callbacks: Callback queue page (src/pages/admin/Callbacks.tsx). Reads from callback_requests with user+property joins. Status tabs (pending/called/completed/missed/cancelled/all) with counts. Client-side filtering by intent/type/channel/date. Row actions: mark called, mark completed, mark missed, cancel. Sheet drawer with admin_notes (saves on blur/⌘Enter).
- TenantPipeline (/admin/applications): shows no_show badges. Drawer has unblock button and admin_notes editor.
- AdminApplicationDetail: shows visit property_feedback notes and admin_notes from profiles before review actions.
- PropertyDetail: checks visit_scheduling_blocked before allowing visit scheduling. Uses VisitSchedulerModal.
