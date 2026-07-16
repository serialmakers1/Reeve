# Reeve

Property management platform connecting owners and tenants in India. Owners list properties, tenants apply and sign leases — Reeve manages inspections, agreements, and the full rental lifecycle.

Full decision + implementation history: `commons-decisions.md` D-001–D-177. This file holds only load-bearing invariants.

## Tech Stack
React 18 + TypeScript (Vite + SWC) · Tailwind + shadcn/ui (Radix) · Supabase (Postgres + Auth + Storage) · React Router v6 · Sentry · PostHog.

## Key Commands
- `npm run build` — production build (postbuild: sitemap + SSG prerender)
- `npm run lint` · `npm run test` (vitest)

## Typecheck (IMPORTANT)
- Correct: `npx tsc -p tsconfig.app.json --noEmit`. `npx tsc --noEmit` checks ZERO files (root tsconfig has `"files": []` + project references).
- Baseline: **360 pre-existing errors** (Sync P5, 2026-07-14) from Supabase generated types (query generic inference). Diff against baseline, not zero. New TS2304/TS2552 in touched files = runtime crashes vite won't catch.

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

## Database Tables (24 total)
`agreements, applications, application_notes, application_residents, documents, eligibility, favourites, inspection_callbacks, keys_tracking, leads, leases, maintenance_requests, owner_action_log, owner_bank_details, payments, profiles, properties, property_condition_reports, property_images, rental_preferences, users, visit_events, visits`. View: `properties_with_flat_number`, `public_profiles`.
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

## Commons Phase 1 + 1.5 (D-001–D-171)
- Field spec (`src/config/property-fields.ts`) + `<SpecField>` = single source of truth. Adding a scalar = spec entry with `audiences` + `editableBy` + `ownerSection`. `flat_number` never has `public_detail` in `audiences` (D-091). Admin direct-write bypass preserved (D-111).
- `getUserDisplayName()` reads `users.full_name` only. Support email: `support@reeve.in`.
- ListProperty (`/list`, `/list/:id`): 9-section accordion. Draft auto-created 800ms after 6 required INSERT fields fill. Draft cap: 20/user. Submit → `pending_review`.
- Edit flow — Path A (`draft`, `changes_requested`): direct patch via `useListingSave`. Path B (`listed`, `edit_pending_review`): accumulate in `editRequestPayload` → RPC `submit_property_edit_request`. RPCs (SECURITY DEFINER, `auth.uid() + is_admin()`): `submit_property_edit_request(uuid,jsonb,jsonb)`, `approve_edit_request(uuid)`, `reject_edit_request(uuid,text,text)`, `cancel_pending_edit_request(uuid)`. Approve uses COALESCE per column.
- Property Management (`/owner-dashboard/property/:id`): 4-tab (Requests | Details | Photos | Activity) + 5 confirmation modals.
- Admin Review (`/admin/listing-reviews`): 2 tabs, detail at `/admin/listing-reviews/:type/:id` (`:type` = `new` | `edit`). RPCs raise if edit no longer pending.
- Owner Dashboard (`/owner-dashboard`): canonical URL. `/my-properties` redirects. `/my-properties/:id` preserved for legacy PM.
- Profile pages: `/me` (editable, UPSERT on profiles) + `/u/:userId` (read-only via `public_profiles` view, security_invoker=false).

### Save pipeline invariants (do NOT unwind)
- **D-153 pre-draft buffering**: `useListingSave.patch()` buffers while `propertyId` is null and auto-flushes when draft arrives. NEVER re-add `if (propertyId)` guards around `patch()` in ListProperty. Regression test: `src/test/useListingSave.test.ts`.
- **D-154 defense stack**: failed PostgREST snapshots dropped (not re-queued — poison loop); failed columns tracked in `poisonedKeys` until re-saved; submit blocked while failed/pending/poisoned; every failure console.errors `{payload, message, details, hint, code}`. Auth/network failures still re-queue.

### Trigger + SpecField rules
- `enforce_property_owner_transitions` no longer guards `status` in `prevent_owner_updating_admin_fields()` (D-124).
- **D-160**: rent/sale trigger branch already applied via MCP — do NOT re-apply.
- Owner-form required fields get red `*` (D-158). Admin/public branches never render marks.
- **visibleWhen fail-safe**: use `!== 'sale'` not `=== 'rent'` so legacy null-listing_type rows render as rent (D-162).
- Date inputs via `<SpecField input='date'>` (D-168) with `datePickerOptions` (`warnOnPast`, `maxDaysFromNow`). Callers with local `Date` state bridge via `value={x as unknown} onChange={(...) as (v: unknown) => void}` — SpecField emits ISO string.

### JSONB editors (D-170)
`<FurnishingEditor value onChange>` and `<AmenitiesEditor value onChange>` in `src/components/property/`. Owner FormState holds `furnishing_detail: FurnishingDetailItem[]` and flat `building_amenities: string[]`. Types + `buildAmenitiesJson` in `@/types/property`.

### Schema invariants
- **Brokerage** (D-169): `rent_brokerage_fixed_amount` + `rent_brokerage_months`. Both nil unless type active. Old `rent_brokerage_amount` dropped.
- **Deposit**: `security_deposit_amount` + `security_deposit_months`. `formatDeposit` in `PropertyDetail.tsx` prefers amount over `months × rent` (D-167). 1/2/3-month chips write both columns (D-171).
- **`gas_type` 'None'** (D-169): caller-side transform writes NULL on save.
- **India fields** (D-159): 7 columns — `parking_2w_count`, `parking_4w_count`, `parking_notes`, `landmark`, `notice_period_months` (default 1), `annual_rent_increase_pct` (CHECK 0–100), `water_storage`. `annual_rent_increase_pct` always public (D-136); `notice_period_months` rent-only.
- **Rent/sale** (D-160/161/162): `listing_type` enum on properties, NOT NULL DEFAULT `rent`. 8 sale-specific columns. `PUBLIC_DETAILS_GRID_KEYS` extended with 5 sale rows. Search `[Rent] [Buy]` toggle.
- **Move-in charges + brokerage** (D-166 + D-169): 4 columns — `move_in_charges_amount`, `rent_brokerage_type` (CHECK `none|fixed|months`), `rent_brokerage_fixed_amount`/`_months`, `sale_brokerage_pct` (CHECK 0–10). In rent/sale Cards on public, NOT in `PUBLIC_DETAILS_GRID_KEYS`.

## Commons Phase 2 — Tenant Dashboard

### Decisions (D-172–D-177)
- **D-172 — Verification gate:** Both phone AND email must be verified before accessing `/tenant-dashboard/preferences` or `/list`. Hard redirect to `/profile?returnTo={path}&reason={missing}`. Gate is `<VerificationGate />` (`src/components/VerificationGate.tsx`). Existing call sites in PropertyDetail / NewApplication / Eligibility are NOT refactored.
- **D-173 — `public_profiles` view fix:** Added `display_name` and `is_public` from `profiles` to view. Applied via MCP.
- **D-174 — Contact request snapshot:** When tenant submits a contact request (Phase 3), freeze a JSON snapshot of their `rental_preferences` row into `contact_requests.tenant_profile_snapshot`. Owner always sees frozen snapshot.
- **D-175 — Tenant dashboard card order:** Contact Requests → Saved Properties → Rental Preferences.
- **D-176 — `isFullyVerified`:** Derived boolean on `useAuth`. `!!(user?.phone_verified && user?.email_verified)`. Phase 2+ uses this.
- **D-177 — Preferences form UX:** Single scrolling page (not wizard). Mandatory UI-only (no DB NOT NULL): age, gender, number_of_occupants, occupation, expected_stay_duration. Sticky footer with completion + Save. Section-level explainers.

### rental_preferences table
One row per user (UNIQUE on user_id). RLS: SELECT/INSERT/UPDATE own row. No DELETE. `updated_at` auto-trigger. All fields optional at DB level (avoids blocking partial upsert). Route: `/tenant-dashboard/preferences`. Upsert on submit, not auto-save. Full schema: `commons-schema.md`.

### Verification gate — `/profile` banner
`/profile` reads `?reason=` (phone | email | both) and renders a contextual banner. After phone OTP OR Google link success, if `?returnTo=` present: Sonner toast "You're verified! Taking you back…" + 2s delayed `navigate(returnTo, {replace:true})`.

### Routing (Phase 2 Prompt 6)
- `/dashboard` redirects to `/tenant-dashboard`. All `/dashboard/*` sub-routes (favourites, applications, visits) remain accessible by direct URL.
- BottomNav tenant tab + Header dropdown updated to `/tenant-dashboard`; Header "My Profile" → `/me`, new "Account settings" → `/profile`.
- D-088 (nav freeze) superseded for tenant nav only — owner/footer/index nav still frozen until Phase 6 cutover.

## Payments / Razorpay
- RLS on `payments`. `payments_gateway_reference_unique` is idempotency anchor. Idempotency: UNIQUE(gateway_reference) + `x-razorpay-event-id` in `gateway_response.razorpay_event_id`.
- Edge Functions `create-razorpay-order` + `verify-razorpay-payment` — `verify_jwt=false`; JWT validated manually. Both use `EdgeRuntime.waitUntil()` for async DB writes.
- Status guard accepts `['owner_accepted', 'payment_pending']` — allows retry. Admin can reset `payment_pending → owner_accepted` via STATUS_ACTIONS.
- Token: fixed 500000 paise (₹5,000), NEVER derived from rent. Advances app to `payment_pending`.
- `payment.captured` → payments→success, app→payment_received, competing apps→on_hold. `payment.failed` → payments→failed, app→owner_accepted (retry).
- Frontend: `index.html` loads Razorpay `checkout.js`. Handler polls 3s×5 for `payment_received`. Webhook is source of truth. Toast fires once per load via `useRef`.

## Callback Requests
`RequestCallbackButton`: checks session → `/login` if unauthed; checks active callback before opening modal. `RequestCallbackModal`: 4-step flow. iOS keyboard: `repositionInputs={false}` + visualViewport maxHeight + onFocus scrollToInput. `(supabase as any).from('callback_requests')` (not in generated types).

## Skills — Always Check Before Acting
Skills in `.claude/skills/`. Read `using-superpowers` for the full workflow. Invoke when: React → `react-best-practices`; Supabase/RLS → `supabase-postgres-best-practices`; auth/permissions → `security-best-practices`; bug/test failure → `systematic-debugging`; UI component → `frontend-design`; UI/UX flow → `ui-ux-pro-max`; design review → `product-designer`; new feature → `brainstorming`. Never skip because task seems simple.

## Critical Gotchas
- `/eligibility` is orphaned (Phase 2) — no nav links anywhere. Route stays in App.tsx. Do not add nav links to it.
- Tenant KYC docs → `tenant-documents` Storage bucket, path: `{userId}/{applicationId}/{type}_{timestamp}.ext`. Separate from `documents` DB table.
- PostHog: always `posthog?.capture(...)` — optional chaining mandatory.
- LCP images must NOT have `animate-fade-up` or any entry animation — delays opacity and tanks PageSpeed LCP.

## Inspection Form Conventions (2026-06)
- Condition display labels (DB values unchanged): good="Good", minor_wear="Minor Wear", moderate_damage="Poor — Visible Damage", severe_damage="Critical — Severe Damage".
- Auto-population: `minor_wear` + cosmetic statuses trigger `cosmetic` damage entries via `useAutoPopulateApplianceDamages`; `source_ref` is `{room_id}|{appliance_id} + field_key` union.
- `EntryList` `FieldConfig.customTextOnValue: "custom"|"other"` — inline free-text; stored at `<key>_custom`. Sections: "Damage Logs", "Key Record".

## PostHog Events
Owner acquisition funnel: `list_property_cta_clicked` (source_page) → `signup_completed` (intent:'owner') → `property_form_started` → `property_submitted` → `owner_clarity_guide_read`. Owner intent threaded via `returnTo=/owner/add`; `isOwnerIntent = returnTo === '/owner/add'` in Login.tsx spreads `{intent:'owner', return_to:returnTo}` onto `signup_completed`. Scroll-depth events use `useRef<boolean>` to fire-once (pattern in OwnerClarityGuide for `owner_clarity_guide_read` at 80%).
