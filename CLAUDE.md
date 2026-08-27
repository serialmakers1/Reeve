# Reeve
Free property marketplace connecting sellers to buyers and owners to tenants in India, with a separate Property Management Business.

## Tech Stack
React 18 + TypeScript (Vite 7 + SWC) · Tailwind 3 + shadcn/ui (Radix) · Supabase (Postgres/Auth/Storage) · React Router v7 Declarative Mode · Sentry · PostHog.

## Core Commands + Verification
- Build: `npm run build` (postbuild runs sitemap + SSG prerender).
- Tests: `npm run test`; lint: `npm run lint`.
- Canonical typecheck: `npx tsc -p tsconfig.app.json --noEmit`; root `npx tsc --noEmit` checks zero files.
- Baseline: build succeeds, all tests pass, TypeScript has zero diagnostics.
- Treat persistent build/test/type failures as regressions unless independently proven unrelated; compare exact failing identities, not counts alone.
- Normal changes: run build, tests, typecheck, plus targeted/static checks. Dependency/security work also runs `npm audit` and relevant `npm ls` / `npm explain`.
- Database deploy verification is separate: repo tests do not prove production DB behavior. Verify migration ledger, exact live object/catalog state, relevant advisor finding, and one representative functional path when behavior could be affected.
- Avoid redundant testing when a full catalog scan plus representative behavior gives stronger coverage.
- Treat lint as diagnostic: never broad `eslint --fix` or mechanically satisfy `exhaustive-deps`/`no-explicit-any`; trace behavior first and fix only genuine issues.

## Dependency + TypeScript Rules
- Read `package.json` and resolved `package-lock.json` before recommending versions.
- Prefer the smallest safe direct/parent upgrade or in-range transitive refresh.
- Do not routinely use `npm audit fix --force`, broad `npm update`, `--force`, `--legacy-peer-deps`, or overrides.
- Do not add a transitive package as a direct dependency merely to force its version without architectural justification.
- Before major upgrades, inspect real usage and peer compatibility; after changes run typecheck, full tests, build/SSG, audit, and dependency-tree checks.
- `strictNullChecks:false` and `noImplicitAny:false` are intentional; do not tighten as unrelated cleanup.
- `@/` maps to `./src/`.

## Build / SSG / SEO
- Vite dev server stays loopback-only; do not add wildcard `server.host` without deliberate investigation.
- Production sourcemaps are conditional on `SENTRY_AUTH_TOKEN`; when generated they are uploaded to Sentry and deleted from `dist`. Never expose production source maps or disable Sentry symbolication as unrelated cleanup.
- No explicit `build.target`/Browserslist contract; keep Vite 7 defaults unless product requirements change.
- `scripts/prerender.mjs` runs after build and writes route-specific HTML; React replaces it on mount via `createRoot`.
- Pre-rendered: `/`, `/search`, `/contact`. Public/not prerendered: `/privacy`, `/terms`, `/refund`, `/login`. Protected/CSR-only: `/admin`, `/profile`.
- New public routes require both `scripts/prerender.mjs` and `ACTIVE_ROUTES` in `scripts/generate-sitemap.mjs`.
- JSON-LD lives in `scripts/prerender.mjs`; use `safeJsonLd()`, never raw `JSON.stringify`; no `aggregateRating` until 5+ Google reviews.
- Do not introduce alternate SSR/SSG frameworks or prerender auth/protected routes without dedicated investigation.

## Supabase Core Rules
- Project ref: `tfutuqqcxqqbirnsdpvz`; client import: `@/integrations/supabase/client`.
- `src/integrations/supabase/types.ts` is generated. Never hand-edit it; regenerate from verified schema or fix frontend typing at the source/boundary.
- On Windows, while regenerating types, pipe to `Out-File -Encoding utf8` or a UTF-8 writer so it stays UTF-8/LF.
- For PostgREST update typing, use generated table `Update` types; do not cast the final `.update(...)`, use `any`, or patch generated types.
- Preserve the `noOpLock` workaround in `src/integrations/supabase/client.ts`; removal/replacement requires dedicated investigation.
- Auth storage key: `reeve-auth`.
- Schema changes require migrations. The live linked DB is authoritative for security/RLS/function/index/advisor work; repo state does not prove production state.
- Never assume GitHub merge/integration deployed a migration. Verify `supabase_migrations.schema_migrations` and the resulting live object.
- Applied migrations are immutable. If production verification finds an omission, diagnose live state, create a later follow-up migration, deploy separately, then verify final state.
- Before `supabase db push --linked`, run `supabase migration list --linked` and `supabase db push --linked --dry-run`; stop if unexpected pending migrations appear.
- Avoid `CASCADE` unless specifically investigated and justified.
- Prefer `.maybeSingle()` only when zero rows is valid; never on unfiltered multi-row queries.
- Edge Functions must return stable user-safe errors; never expose raw DB/PostgREST/provider/runtime error text. Log only non-sensitive stage/status context.

## Supabase Advisor / Audit Baseline — Aug 2026
- Classify findings as actionable, accepted/intentional, deferred pending scale/evidence, or regression/new.
- Closed categories that should remain zero: `auth_rls_initplan`, `function_search_path_mutable`. Any future finding here is a regression/new issue.
- Accepted: reviewed authenticated/anon SECURITY DEFINER executable findings; intentional multi-permissive policy cases; `rls_enabled_no_policy` on the four documented deny-all tables; `auth_leaked_password_protection` while Email provider is disabled.
- Deferred: remaining `unindexed_foreign_keys` until scale/query evidence justifies them; `unused_index` until meaningful production usage exists.
- Never change working authorization, add dummy policies, revoke legitimate RPC access, add low-value indexes, drop indexes, or enable unused auth features merely to silence advisors.
- Re-open accepted/deferred items only for new objects, ACL/policy/config drift, materially changed table size/query patterns, or changed product requirements.

## RLS / Function / Index Conventions
- New tables require RLS at creation. Separate permissive SELECT policies are OR-combined by Postgres.
- In RLS, statement-constant `auth.uid()` must use `(SELECT auth.uid())` everywhere: USING, WITH CHECK, EXISTS, NULL gates, nested subqueries.
- A policy is not optimized merely because one wrapped call exists; mixed wrapped/bare calls are possible. Audit raw live `pg_policies`, not only `auth_rls_initplan`.
- Do not mechanically wrap helpers such as `is_admin()`; that optimization was reviewed and intentionally deferred absent a concrete need.
- Reviewed intentional multi-permissive cases: `callback_requests` SELECT/UPDATE, `interaction_ratings` UPDATE, `property_activity_log` SELECT, `property_edit_requests` SELECT, `property_geo_associations` SELECT, `property_images` SELECT. Do not consolidate merely to silence the advisor.
- Property-image deletion must bind the image to the requested property, delete the DB row with caller authorization and confirm exactly one row before deleting R2; preserve DB→R2 ordering and established listed/admin paths.
- Deleting a `property_images` row enqueues durable R2 cleanup (`pending_r2_deletions`, service-role only) via an AFTER DELETE trigger; R2-delete failures are retained there and never reverse the authoritative DB delete.
- 15-photo max is enforced server-side (soft): `upload-property-image` rejects when live count ≥15 (fail-closed); `submit_property_edit_request` rejects when live + distinct staged additions >15 (`PHOTO_LIMIT_REACHED`). Brief multi-tab overshoot is accepted.
- Image lifecycle cleanup all feeds `pending_r2_deletions` (one queue): reject/supersede/withdraw + archive + hard-delete enqueue staged/live keys; archive also deletes live rows DB-first; `unlisted` retains images. The internal `cleanup-property-images` worker (secret-gated) re-checks live references (fail-closed) before each R2 delete and reconciles R2-only orphans older than 7 days.
- Intentional RLS-deny-all tables with no permissive policy: `comment_allowlist`, `comment_blocklist`, `pseudonym_adjectives`, `pseudonym_nouns`. Do not add fake `USING(false)` policies.
- Function EXECUTE ACLs were comprehensively audited/hardened. Preserve per-function grants; new functions or ACL drift require fresh review.
- Trigger/internal functions should not become callable for convenience. RLS helpers such as `is_admin()` / `is_property_owner(...)` have deliberate EXECUTE needs.
- When defining/redefining SECURITY DEFINER functions, review owner, security mode, `search_path`, and EXECUTE ACLs together.
- Functions need an explicit minimal `search_path` based on actual dependencies; never set `''`, `public`, or `pg_catalog` mechanically.
- `trg_fn_bump_comments_updated_at()`, `trg_fn_bump_ratings_updated_at()`, and `update_updated_at_column()` are intentionally pinned to `pg_catalog`.
- Before search-path changes inspect unqualified tables/types/enums/extensions/PostGIS/sequences/helpers/dynamic SQL.
- `favourites.property_id` is intentionally indexed by `idx_favourites_property_id`; `(user_id, property_id)` does not cover property_id-leading lookups.
- Do not add every FK advisor index or drop an index solely because it is reported unused; usage statistics are sparse and new indexes may initially show zero scans.
- Migrations should be single-purpose; enum values must be committed before later use; BEFORE triggers fire alphabetically.
- Property images use Cloudflare R2, not Supabase Storage.
- New property photos/floor plans are browser-preprocessed once via `processPhotoForUpload` (HEIC→JPEG, ≤1280px, q0.70, EXIF-stripped, WebP-preferred with format-safe fallback, ≤10 MB) before the existing Edge upload; owner and admin paths share it.
- Image delivery: Search cards render only the cover URL (first/LCP card eager+`fetchPriority="high"`, others lazy); new R2 uploads set `Cache-Control: public, max-age=31536000, immutable` (unsigned header; keys are immutable UUIDs).

## Auth Architecture
- Active providers: Phone ENABLED (MSG91 OTP), Google ENABLED (OAuth), Email DISABLED.
- No supported password login/signup/reset/update flow exists. A legacy admin may still have an old encrypted password in `auth.users`; do not manually alter Supabase Auth internals.
- All attacker-controlled `returnTo` values must pass through `getSafeReturnTo()` in `src/lib/authUtils.ts`; same-origin internal routes only, sanitize before storage and again before navigation.
- `public.users.pseudonym` is UNIQUE, permanent, system-assigned, shown on `/me` only, never `/u/:userId`.
- Profile Name is read-only from `public.users.full_name`; no client write. `last_login_at` is written only through `touch_last_login()` on `SIGNED_IN`.
- Never add auth-transaction triggers that sync `public.*`; use post-login RPCs. `prevent_user_privilege_escalation` protects role/verification/provider/active fields.
- `public.users.phone` may be null for Google-first users; use scoped `get_phone_fallback(user_id)` where required. n8n never queries `auth.*` directly.

## Telemetry / Privacy
- Sentry is production-only. Replay masks all rendered text, blocks media, records only error sessions, and identifies authenticated users by Supabase UUID only; do not add name/email/phone or other PII.
- PostHog is production-only and intentionally limited to Web Analytics + Session Replay + UUID/role identity. `autocapture` is disabled; do not reintroduce application `posthog.capture()` events without a new analytics decision.
- PostHog identity may contain only Supabase UUID + role (`user | admin`); never send name, email, phone, auth tokens, or other PII.
- PostHog Replay keeps rendered text visible but masks all inputs. Preserve OAuth `?code=` sanitization for analytics and Replay.
- Telemetry changes must not redesign or retime the existing Supabase auth lifecycle; add telemetry side effects only within existing auth branches.

### useAuth
- Single source: `{ session, user, isLoading, isAuthenticated, isFullyVerified, signOut, refreshUser }`.
- `INITIAL_SESSION` returns early; `getSession()` owns bootstrap. Auth-state DB work is deferred with `setTimeout(100ms)` to avoid lock deadlocks.
- `loadUser` sets session/authenticated before DB query; 5s safety timeout must not redirect a valid session.
- Protected pages use `useRequireAuth({ requireAdmin? })`; render/data logic uses `user.id`, not `session.user.id`, and gates on both auth and data loading.
- Do not call `supabase.auth.getSession()` from render/useEffect data gates; event handlers may. Preserve `fetchUserWithRetry` for post-signup trigger lag.

### Auth Infrastructure
- `handle_new_user` handles phone OTP users; `handle_user_updated` handles phone/email verification updates.
- AppUser verification fields: `phone_verified`, `email_verified`, `auth_provider`
- `send-sms-otp` uses MSG91 with `verify_jwt=false`; profile phone verification preserves the Google token and sends it to `verify-phone-otp`.
- Google-link return path uses sessionStorage key `reeve-link-returnTo`; do not put query params in `linkIdentity redirectTo`.
- `verify-phone-otp` protects legitimate existing users with `SPURIOUS_ROW_MAX_AGE_MS = 60_000`.

## Roles / Routing / Layout
- Roles: `user | admin`; protected pages use `useRequireAuth()`.
- React Router v7 Declarative Mode only (`BrowserRouter`/`Routes`/`Route` via `react-router-dom`); do not introduce Data/Framework Mode as unrelated cleanup.
- Important navigation uses absolute paths; user-controlled destinations use the canonical returnTo sanitizer.
- Public pages use `<Layout>`; admin pages use `<AdminLayout>`; do not hardcode shared nav/footer inside pages.

## Property + Search Invariants
- PropertyDetail non-gallery/CTA sections use `PageSection`; shared realtime/mutation state should prefer read-only TanStack Query hooks sharing cache keys.
- Statuses: `draft`, `pending_review`, `changes_requested`, `listed`, `edit_pending_review`, `unlisted`, `archived`.
- `enforce_property_owner_transitions` validates owner transitions; `handle_property_status_change` manages `is_active`; `property_activity_log_writer` records status changes.
- Public property visibility is `listed` + `edit_pending_review` with `is_active=true`; preserve this RLS invariant.
- Direct `properties` SELECT for `anon`/`authenticated` is intentionally limited to the approved public-column allow-list (65 as of Aug 2026). Never restore broad table SELECT or expose private/internal columns; owner/admin private reads use scoped SECURITY DEFINER RPCs.
- Browser `properties` queries must not use excluded columns in SELECT/filter/order/embed/RETURNING; use the public allow-list or the owner/admin RPC path instead.
- `property_activity_log` / `property_edit_requests` are not written directly from frontend. Listed/edit-pending edits are partitioned into LIVE/REVIEW/ADMIN-ONLY; preserve `enforce_owner_edit_partition`.
- Reviewable edits use `submit_property_edit_request`; approval stale-checks base values. Photos are staged in R2 until approval and use established cover/delete/reorder server/RPC paths.
- `ListProperty` writes by canonical DB key; `edit_pending_review` remains per-field editable; `pending_review`/`unlisted`/`archived` remain blocked.
- `property-fields.ts` + `<SpecField>` define property fields; trace FormState/init/prefill/DB mapping/JSX/PropertyEdit/approval behavior when adding fields.
- JSONB furnishing/amenity editing uses shared editors; do not create parallel systems.
- `<VerificationGate />` protects `/list` and `/tenant-dashboard/preferences`; `rental_preferences` is one-row-per-user/upsert-oriented.
- Razorpay is intentionally retained; payment writes are RLS-protected and webhook processing is source of truth.
- Maps use `@vis.gl/react-google-maps` v1.x with a route-scoped shared `APIProvider` only around active owner/admin Google flows (`/list`, `/list/:id`, `/admin/properties/:id`); libraries load via `useMapsLibrary`. Preserve Places session tokens, India-only restrictions, address/location invariants, Street View preference, and owner location-edit locks.
- `VITE_GOOGLE_MAPS_MAP_ID` is required. Remove `isBuildingResult` / `useApiLoadingStatus` only after tracing/replacing active usage.
- Search domain lives in `src/features/search/`; public modes are `rent`/`buy`, DB mapping is `rent`/`sale`, never emit `sale` in public URLs.
- Search is LIST-only; no active Split/Map path. `SearchResultsHeader` owns mobile Sort; desktop toolbar owns desktop Sort. Stale `view`/map-bound URL params are stripped.
- URL/search params are source of truth; `SearchPropertyResult` is the card contract; pagination is cursor-based with 20 displayed + 1 lookahead; `locations_data` uses `{ v:1, items:[...] }`.
- Active Search RPC is `search_compact_properties_v5` (STABLE SECURITY DEFINER); cards render before secondary `get_property_counts`, which must never block/hide Search. No exact total count.
- `confirm-property-location` must authenticate before any server-side Google API call; do not restore unauthenticated smoke/test paths that trigger billable APIs.

## Contact Requests + n8n Security
- Edge Functions: `submit-contact-request`, `reveal-contact`, `resend-reveal`, `resend-contact-webhook`.
- `verify_jwt=false` is deliberate where manual JWT validation is designed; phone never returns in response bodies; `tenant_id` comes from JWT only.
- Contact-request state changes are server-controlled: Approve → `reveal-contact`; withdraw/decline use scoped server/RPC paths and only from `pending`. Do not restore direct client status mutation.
- n8n never stores Supabase `service_role`/secret keys. Privileged operations go through purpose-scoped Edge Functions using `N8N_WEBHOOK_SECRET`; n8n→Supabase DB access uses scoped SECURITY DEFINER RPCs + anon key where designed.
- Supabase→n8n contact webhooks send `N8N_WEBHOOK_SECRET`; n8n validates via credential-backed `headerAuth`. `RESEND_WEBHOOK_SECRET` verifies Resend/Svix webhooks.
- Third-party credentials belong in n8n credential store, never raw node params. Never log/export secrets, JWTs, phone/email/contact payloads.
- Reveal/resend retries require idempotency; `resend-reveal` rate limiting is fail-closed. Reveal uses fixed keys per contact_request+role; Resend Reveal uses `email_send_log` dispatch UUID; explicit user Resend actions need unique keys.
- Provider orchestration (Resend/WhatsApp/etc.) belongs in n8n; Supabase owns auth, business rules, state, trusted data access.
- Resend/Svix webhooks require valid signature + ±5-minute timestamp freshness; stale signed events must not be processed.

## Skills / Gotchas / Log
- Check `.claude/skills/` before work; use relevant React, Supabase/Postgres, security/auth, debugging, and frontend-design skills.
- Do not reintroduce custom PostHog capture events without an explicit analytics requirement. Do not put entry animations on LCP images.
- Root `/log.md` is canonical and append-only. Never prepend/reorder/rewrite history or recreate `.claude/log.md`.
- Tracked `.env` contains public client configuration only; never add server secrets or private credentials to it.
