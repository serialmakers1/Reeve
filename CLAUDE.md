# Reeve
Free property marketplace connecting sellers to buyers and owners to tenants in India. Users can list properties, visitors can request contact from listers. Separate Property Management Business.

## Tech Stack
React 18 + TypeScript (Vite + SWC) · Tailwind + shadcn/ui (Radix) · Supabase (Postgres + Auth + Storage) · React Router v6 · Sentry · PostHog.

## Key Commands
- `npm run build` — production build (postbuild: sitemap + SSG prerender)
- `npm run lint`
- `npm run test` — Vitest
- `npx tsc -p tsconfig.app.json --noEmit` — canonical typecheck; `npx tsc --noEmit` checks zero files because the root tsconfig uses project references.

## Verification
- Baseline: build succeeds, all tests pass, TypeScript has zero diagnostics.
- Any TypeScript diagnostic or persistent test/build failure is a regression unless independently proven unrelated.
- When diagnosing regressions, compare exact failing test identities and exact TypeScript diagnostic identities; never rely on counts alone.
- For normal implementation prompts, verify with build, tests, TypeScript, and relevant static/targeted checks. Do not require manual browser/UI verification between implementation steps unless explicitly requested.

## TypeScript Config
`strictNullChecks: false`, `noImplicitAny: false` — intentional; do not tighten as unrelated cleanup.

## Path Aliases
`@/` maps to `./src/` — use it for application imports.

## SSG / SEO Runtime
`scripts/prerender.mjs` runs after `vite build` via `postbuild`, writes route-specific static HTML, and React replaces it on mount via `createRoot`.
- Public/pre-rendered: `/`, `/search`, `/contact`.
- Public/not pre-rendered: `/privacy`, `/terms`, `/refund`, `/login`.
- Protected/CSR-only: `/admin`, `/profile`.
- Adding a public route requires both the `scripts/prerender.mjs` route entry and `ACTIVE_ROUTES` in `scripts/generate-sitemap.mjs`.
- JSON-LD lives in `scripts/prerender.mjs`, not JSX. Use `safeJsonLd()`; never raw `JSON.stringify` for injected schema. Do not add `aggregateRating` until 5+ Google reviews.
- Do not introduce vite-ssg/vite-plugin-ssr or pre-render auth/protected routes without dedicated investigation.

## Supabase
- Project ref: `tfutuqqcxqqbirnsdpvz`.
- Client: `import { supabase } from "@/integrations/supabase/client"`.
- `src/integrations/supabase/types.ts` is generated. Never manually patch generated types to silence frontend errors; fix frontend typing or regenerate from the verified schema.
- Preserve the `noOpLock` workaround in `src/integrations/supabase/client.ts` and its runtime behavior. Type-only maintenance is allowed when verified against the installed Supabase version; do not remove/replace the workaround without dedicated investigation.
- Auth storage key: `reeve-auth`.
- Schema changes must be represented by migration files. Live SQL/CLI deployment and verification are handled separately; do not make destructive schema conclusions from repository state alone.
- Do not assume migrations or generated types prove current live Supabase state when a task depends on live DB objects. Verify live state first. Avoid `CASCADE` for cleanup unless specifically investigated and justified.
- Prefer `.maybeSingle()` when zero rows is valid; do not use it on unfiltered multi-row queries.

## Auth Architecture
Phone OTP (MSG91) + Google OAuth. After verify success: `navigate(returnTo || '/')`.
- `public.users.pseudonym` is UNIQUE, permanent, system-assigned, shown on `/me` only, never `/u/:userId`.
- Profile Name is read-only and sourced from `public.users.full_name`; no client write to `full_name`.
- `last_login_at` is written through `touch_last_login()` on `SIGNED_IN`, never by direct client update.
- Never add auth-transaction triggers that sync `public.*`; use post-login RPCs. Functions touching `public.*` must pin `search_path = public`.
- `prevent_user_privilege_escalation` protects role/verification/provider/active fields from authenticated/anon escalation.
- `public.users.phone` may be null for Google-first users; use scoped `get_phone_fallback(user_id)` where required. n8n never queries `auth.*` directly.

### useAuth — single source of truth
Returns `{ session, user, isLoading, isAuthenticated, isFullyVerified, signOut, refreshUser }`.
- `onAuthStateChange` returns early on `INITIAL_SESSION`; `getSession()` owns bootstrap.
- Auth-state DB work is deferred with `setTimeout(100ms)` to avoid Supabase lock deadlocks.
- `loadUser` sets session/authenticated before its DB query; the 5s safety timeout may end loading but must not redirect a valid session.
- Use `useRequireAuth({ requireAdmin? })` on protected pages. Use `user.id`, not `session.user.id`, in render/data logic.
- Rendering/data gates must include both auth and data loading.
- Do not call `supabase.auth.getSession()` from render/useEffect data gates; event handlers may call it directly.
- `fetchUserWithRetry` handles the post-signup trigger lag; do not remove casually.

### Auth infrastructure
- `handle_new_user` handles phone OTP users; `handle_user_updated` handles phone/email verification updates.
- AppUser verification fields: `phone_verified`, `email_verified`, `auth_provider`; `onboarding_completed` is removed.
- `send-sms-otp` uses MSG91 and `verify_jwt=false`.
- Profile phone verification captures the Google token before `signInWithOtp` and sends it to `verify-phone-otp` via Authorization header.
- Google link returnTo uses sessionStorage key `reeve-link-returnTo`; do not put query params in `linkIdentity redirectTo`.
- `verify-phone-otp` protects legitimate existing users with `SPURIOUS_ROW_MAX_AGE_MS = 60_000`.

## User Roles + Route Guards
Roles: `user | admin`. Route protection is page-internal through `useRequireAuth()`; `OnboardingGuard` is removed and must not be reintroduced casually.

## Layout Rules
Public pages use `<Layout>`; admin pages use `<AdminLayout>`. Do not hardcode shared nav/footer inside pages

## Property Detail Invariants
- Non-gallery/CTA PropertyDetail sections render through `PageSection`; avoid bespoke section wrappers/styles.
- For shared realtime/mutation state, prefer a read-only TanStack Query hook sharing the same cache key instead of lifting heavy state.

## Property Status
Active enum values: `draft`, `pending_review`, `changes_requested`, `listed`, `edit_pending_review`, `unlisted`, `archived`.
- `enforce_property_owner_transitions` validates owner transitions; admins bypass through `is_admin()`.
- `handle_property_status_change` manages `is_active`.
- `property_activity_log_writer` records status changes; curated listed/unlisted events may be public.

## RLS / Migration Conventions
- New tables require RLS at creation.
- Admin/user policies should follow the established `is_admin()` / `auth.uid()` patterns; separate SELECT policies are OR-ed by Postgres.
- Single-purpose migrations; use idempotent guards where appropriate. Enum values must be committed before later use. BEFORE triggers fire alphabetically by name.
- Property images use Cloudflare R2, not Supabase Storage.

## Contact Request Edge Functions
Functions: `submit-contact-request`, `reveal-contact`, `resend-reveal`, `resend-contact-webhook`.
- `verify_jwt=false` with manual JWT where designed; phone must never be returned in response bodies; `tenant_id` comes from JWT only.
- Approve invokes `reveal-contact`; do not replace with direct client UPDATE. Decline applies to `status=pending`.
- n8n → Supabase uses scoped SECURITY DEFINER RPCs + anon key; never service_role in n8n.
- `N8N_WEBHOOK_SECRET` authenticates n8n; `RESEND_WEBHOOK_SECRET` verifies Resend/Svix webhooks.

## Property Activity + Post-publication Edits
`property_activity_log` and `property_edit_requests` are not written directly from frontend; use established RPC/trigger paths.
- Listed/edit-pending owner edits are DB-partitioned into LIVE, REVIEW, and ADMIN-ONLY fields. Do not bypass `enforce_owner_edit_partition` / image policy with frontend assumptions.
- Reviewable edits use `submit_property_edit_request`; approval stale-checks submitted base values before applying changes.
- Live-listing photos are staged in R2 until approval. Cover/delete/reorder use their established server/RPC paths and primary-photo constraints.
- `ListProperty` routes writes by canonical DB key; do not route by FormState aliases. `edit_pending_review` remains per-field editable; `pending_review`/`unlisted`/`archived` remain blocked.

## Property Form Architecture
- `property-fields.ts` + `<SpecField>` are the core field-definition surface.
- Adding a property field requires tracing FormState, initialization, prefill, DB mapping, JSX, PropertyEdit, and relevant approval/RPC behavior.
- JSONB furnishing/amenity editing uses the existing shared editors; do not create parallel field systems casually.

## Tenant Dashboard
`<VerificationGate />` protects `/list` and `/tenant-dashboard/preferences`. `rental_preferences` is one-row-per-user and upsert-oriented. 

## Payments / Razorpay
Razorpay configuration is intentionally retained. Payment writes are RLS-protected; webhook processing is the source of truth. Do not remove during unrelated cleanup.

## Google Maps / Location Architecture
- `@vis.gl/react-google-maps` v1.x; `APIProvider` is provided at app level.
- Preserve Places session-token handling, India-only restrictions, `address_mode`, `lister_flat_number`, `location_verified_by_owner`, Street View preference, and draft/changes-requested owner location-edit lock.
- `isBuildingResult` / `useApiLoadingStatus` behavior should only be removed if current active usage is first traced and replaced.
- `VITE_GOOGLE_MAPS_MAP_ID` is required for the map experience.

## Search Feature
- `src/features/search/` owns the current search domain. Public modes are `rent`/`buy`; DB mapping uses `rent`/`sale`. Never emit `sale` in public search URLs.
- URL/search params are the source of truth. `SearchPropertyResult` is the card contract; `SearchMapMarker` is the separate map payload.
- `SearchBrowsePage` is wired to `/search`; pagination is cursor-based and `locations_data` uses the versioned `{ v: 1, items: [...] }` envelope.
- `search_compact_properties` is a STABLE SECURITY DEFINER search RPC; preserve its return-type casting requirements.
- `confirm_availability_of_rental(uuid)` is authenticated-only; explicitly revoke anon execution when defining/redefining it.
- `searchDataClient.ts` owns search fetch/overlay/cursor helpers. `SearchMapView` is hidden/shown with CSS rather than repeatedly unmounted.
- Current map-RPC limitation: only BHK + price filters are passed to `get_map_markers`.
- `zeroRentBrokerage` serializes as `zero_brok`.

## Skills — Always Check Before Acting
Check `.claude/skills/` before work. Use the relevant workflow and domain skills, especially React, Supabase/Postgres, security/auth, debugging, and frontend-design skills.

## Critical Gotchas
- `posthog?.capture(...)` must remain optional-chained.
- Do not put entry animations on LCP images.

## Repository Log
Root `/log.md` is the canonical engineering log. Append new entries to the END only. Never prepend, reorder, or rewrite existing history. Do not recreate `.claude/log.md`.
