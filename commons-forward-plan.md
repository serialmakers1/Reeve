# Reeve Commons — Forward Plan (Deferred Items)

Everything captured during Phase 1 planning that is NOT built in Phase 1. Grouped by phase. Each entry notes what's already decided so we don't re-litigate.

---

## Phase 2 candidates

### Google Places autocomplete for address
- Decision: Chosen over MapMyIndia and manual entry.
- Blocker: Requires Google Cloud billing setup.
- Files affected: Section 1 of ListProperty form; introduces new address components (sublocality, formatted_address).
- Related: enables `latitude` / `longitude` capture.
- Note (Sync P5): `landmark` field added in Phase 1.5 Prompt 8 (`audiences: ['owner_form', 'admin_form', 'public_detail']`) — when Google Places wires in, the landmark input is already plumbed; only the address-autocomplete flow needs to be added.

### `state` and `pincode` as public search filters
- Decision: Columns exist and are populated on all properties. `TODO(P2)` tags in `src/config/property-fields.ts` on the spec entries.
- Blocker: Search page has no address-level filter UI yet.
- When wired: re-add `public_detail` to both fields' `audiences` in the spec, and add rendering to the address line on `PropertyDetail.tsx`. Owner form + admin form entries already render these fields.
- Related to Google Places above — once canonical, state can become a dropdown too.

### `properties.latitude` and `properties.longitude`
- Decision: Populate only after Google Places is wired.
- Reasoning: Manual lat/lng entry is error-prone. No point adding the columns until we have an accurate source.
- Consumers: distance-to-search-anchor, map view on property detail (also deferred).

### ✅ Rental preferences form + `rental_preferences` table (RESOLVED — Phase 2 Prompt 1)
Table created (D-172). Form at /tenant-dashboard/preferences built in Phase 2 Prompt 4.

### Non-blocking replacement for `/eligibility`
- Decision: Replace the current blocking form.
- Related to: Dashboard.tsx Rental Preferences tile re-add (see Phase 0 rollback notes in commons.md).

---

## Phase 3 candidates

### Contact request build
- URL, table (`contact_requests`), and RLS all designed during Phase 3.
- UX pattern locked: Option F expand-in-place (see commons-decisions.md D-063 and commons-ux.md §3).

### Contact requests build (confirmed Phase 3)
- `contact_requests` table + RLS (Phase 3 Prompt 1)
- Request Contact button on PropertyDetail (Phase 3 Prompt 2)
- Owner request review on property management page (Phase 3 Prompt 3)
- Phone/contact reveal via Edge Function + email (Phase 3 Prompt 4)
- Snapshot rule: D-174 — freeze rental_preferences into tenant_profile_snapshot on submit
- Verification gate on contact button reuses `<VerificationGate />` from Phase 2
- No cooldown logic in Phase 3 — log re-request flag for empirical data first

### Tenant re-request cooldown
- Decision: Cooldown period NOT yet decided — needs empirical data from early requests.
- Backend logging of re-request flag is captured earlier so we have data by the time we design the cooldown.

### Re-request cooldown timer visible to tenant
- Decision: Timer shown to tenant only after backend data reveals the right cooldown period.

### Contact request rate limits, expiry, freshness decay
- Decision: Deferred to post-launch per build plan.
- Related: request TTL, hide-when-old, automatic archiving.

### Backend logging for re-request flag tracking
- Decision: Log every re-request attempt to power future cooldown and analytics.

---

## Later phases (Phase 4-6 or Post-launch)

### Profile photo upload UI
- Decision: Use Supabase Storage bucket `profile-photos` (not R2 — see D-050).
- Reason: profile photos are small and low-egress; R2's egress-free advantage doesn't apply.
- Phase 1 populates `profile_photo_url` from Google OAuth only.

### Ratings & reviews on public profiles
- Decision: Placeholder section already exists on `/u/:userId` from Phase 1.
- Scope: tenant rates owner post-tenancy and vice versa.

### Public property detail rendering of new Phase 1 fields
- Decision: `security_deposit_amount`, `building_notes`, custom furnishing items, custom amenities all captured in Phase 1 but their public rendering on `PropertyDetail` is deferred.
- Reason: PropertyDetail redesign is a Phase 4-ish body of work.

### "About the owner" mini-profile block on public property detail
- Decision: Sits inside PropertyDetail with a link to `/u/:ownerId`.
- Reason: Follows public profile page ship.

### Public timeline on property detail page
- Decision: Always visible from Phase 1 launch; events curated (see commons-decisions.md D-081).
- Scope in Phase 1: renders `property_activity_log` rows where `is_public = true`.
- Later polish: richer event iconography, richer copy templates.

### Contact request stats on property management page
- Decision: Placeholder line `12 requests · 3 approved · 2 declined · 7 pending` — designed during planning but built later.
- Location: Requests tab of property management page.

### Admin badge counts on sidebar
- Decision: Pending listing review count as a badge on `Listing Reviews` nav item.
- Nice-to-have; not blocking for Phase 1 launch of the review queue.

### Header nav `/list` CTA
- Decision: Not linked from Header/Footer until Phase 6 cutover.
- Route created in Phase 1 (App.tsx) but reachable only via direct URL or `Add Property` button on dashboard.

### `is_public` hide-profile UI toggle
- Decision: Column exists from Phase 1 (default true). No UI in Phase 1.
- Reason: Reserved shape for future preference.

### Drag-to-reorder for property photos
- Decision: Not in Phase 1 (admin form doesn't have it either).
- Library candidate when built: dnd-kit.
- `sort_order` column exists on `property_images` already.

### PropertyDetail location map view
- Decision: Depends on Google Places / lat-lng being populated.

### Location dropdown for city / state
- Decision: Current Phase 1 uses free-text. Once we have canonical list from Google Places, replace with dropdown.

### PM-history backfill into `property_activity_log`
- Decision: NOT planned. Log starts empty at Phase 1 launch.
- Reason: Backfilled events risk incorrect actor attribution.

### Tier system on verified badge
- Decision: Current checkmark is binary (all users verified). Future tier (e.g., ID-verified) could differentiate.
- Placement: profile pages only (Phase 1); could extend if tiers emerge.

---

## REMIND LATER (surfaced during Prompt 1)

Items flagged during the Prompt 1 planning round. Each has a target phase and enough context to pick up cold.

### Header dropdown "My Profile" → `/me` (Phase 6 cutover)
- Phase 1 keeps `Header.tsx` unchanged. `My Profile` continues pointing to `/profile` (settings).
- `/me` reachable only by direct URL until Phase 6.
- Repoint two lines in Header.tsx (desktop dropdown + mobile menu).
- Supersedes D-048.

### BottomNav "Owner Dashboard" tab repoint (Prompt 6 — inside Phase 1)
- Currently points to `/my-properties`.
- When `/owner-dashboard` is built in Prompt 6, either repoint the tab OR add a redirect `/my-properties` → `/owner-dashboard`.
- Chosen approach (redirect) confirmed in D-089-adjacent decisions.

### MyPropertyNew.tsx deletion (post-Phase 6 stability)
- Retained in Phase 1 as rollback safety (D-089).
- Delete only after Phase 6 has been stable for one release cycle.
- Just remove the file + its lazy import in App.tsx (redirect stays).

### R2 immediate-delete Edge Function on rejection/superseding (Phase 2 optimization)
- Phase 1 relies on the monthly n8n orphan cleanup (D-096).
- Phase 2 upgrade: RPC-triggered Edge Function deletes R2 objects for rejected/superseded photo_changes.add entries immediately.
- Benefit: faster reclaim; sub-24h vs 7-day cleanup window.

### Full session-recovery via localStorage on `/list` (later phase)
- Phase 1 shows a session-expiration modal with plain-text form state (D-100).
- Later: transparent localStorage backup + auto-restore on re-login.
- Non-trivial to build; not required for launch.

### Owner viewing their own archived property URL — Option B message (Phase 2 confirmation)
- Behavior when owner navigates to `/owner-dashboard/property/:id` for an archived property is undecided.
- Option A: show archived read-only view; Option B: redirect with toast "This property is archived. Contact support to restore."
- Recommend B; confirm with real usage.

### Photo edits go through review vs direct — revisit (post-launch, based on owner feedback)
- D-090 mandates all photo edits on `listed` properties go through the edit_request flow.
- May feel heavyweight for simple photo swaps.
- Revisit after 30 days of production usage.

### Photo reorder as trivial vs review-required — revisit (post-launch)
- Currently bundled with all photo edits (D-005, D-090).
- Reorder is arguably lower-risk than add/delete and could be allowed direct.
- Revisit if reorder frequency is significant.

### Ownership transfer mechanism for admin (Phase 3+ or as needed)
- No current path for admin to reassign `properties.owner_id`.
- Needed for: owner leaves platform, property sold, incorrect account attribution.
- Not urgent — handle manually via Supabase Studio until frequency justifies a UI.

### Legacy PM property status handling on `/owner-dashboard` (Prompt 6 details)
- `/owner-dashboard` grid must handle a user who has BOTH Commons properties and legacy PM properties (in `inspection_*`, `agreement_pending`, etc.).
- Decision: show both, distinguish visually. PM cards route to the existing `/my-properties/:id` page.
- Commons cards route to `/owner-dashboard/property/:id`.

### Photo reordering as an owner action — deferred entirely
- Ordering is captured in `sort_order`, but no drag-to-reorder UI ships in Phase 1.
- Existing admin form doesn't have it either; parity preserved.
- Deferred to Phase 4 or so.

### Admin review queue realtime updates (post-Phase 1)
- Queue currently refetches on tab change and after each admin action.
- Adding Supabase Realtime subscriptions on `properties` (status=pending_review) and `property_edit_requests` (status=pending) would auto-refresh the queue when owners submit or supersede.
- Not built now — the ~seconds staleness during manual review is acceptable.

### Cross-user `users.full_name` visibility (Prompt 5 deferred)
- `users_select_own` is restrictive. `/u/:userId` and admin review queue rely on `public_profiles` view for cross-user display names.
- If admin needs richer cross-user data (phone, verification badges) on the queue, add a purpose-built RPC rather than widening the `users_select_own` policy.

### ✅ Session storage restore prompt on /list/:id mount (RESOLVED in Prompt 9)
### ✅ Modify-edit auto-transition redundancy (RESOLVED in Prompt 9 — auto-transition removed)
### ✅ Public timeline curated events on property detail page (RESOLVED in Prompt 9)
### ✅ Owner archived property URL message (RESOLVED in Prompt 9)

### Baseline typecheck error count capture
- Before applying Phase 1 migrations, capture `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"`.
- Store the number in the log entry for Prompt 1 execution.
- After types.ts regeneration, confirm within ±5.

## Explicit non-goals for Phase 1

- No PM-to-Commons migration path (existing PM properties stay in PM statuses).
- No cross-role UI (users don't see "owner mode" / "tenant mode" toggle).
- No notifications system (email/SMS/push) for status changes — polling / re-visit only.
- No pricing recommendations or market data on the listing form.
- No mobile app work.
- No i18n / multi-language.

---

## Locked decisions that affect the future

These decisions were made during Phase 1 planning but their effect extends into later phases. They should be preserved unless explicitly superseded.

- Commons and PM share the `properties` table (D-013). PM properties are identified by their status values (`inspection_*`, `occupied`, `off_market`, etc.). Any future feature querying "Commons listings" filters by the 7 Commons statuses.
- All new Phase 1 fields also appear in admin PropertyEdit (D-044). Any future admin form redesign must preserve them.
- The public activity timeline's curated event set (D-081, D-082) is the authoritative list. Adding new event types requires an explicit is_public decision each time.
- Profile system is unified across roles (D-046). Any future role-specific profile fields should extend `profiles`, not create new tables.

---

## Phase 1.5 additions — deferred items (surfaced 2026-07-12)

- Google Maps + Places API integration for location fields (nearest metro, distance, landmark autocomplete).
- Path-based search URLs (`/search/rent`, `/search/sale`) — SEO improvement.
- EMI calculator on public sale detail page.
- Comparable properties analytics view (owner-facing on sale listings).
- Internationalization (English / Hindi / Kannada label variants in field spec).
- Broker/agent registration and listing model.
- PG (paying guest) listing type.
- Commercial properties (beyond residential).
- Loan pre-approval details.
- Society NOC verification workflow.
- Nearby school/hospital data.
- Rental preferences form + table (Phase 2/3).
- Contact requests (Phase 3).
- Ratings & reviews (post-launch).
- Profile photo upload UI (later).
- Photo reorder (post-Phase 1).
- R2 immediate-delete on rejection/superseding (Phase 2).

## Phase 1.5 prompt sequence (D-152)

1. Emergency (data loss + admin name + commons memory update) — THIS prompt.
2. Field spec architecture (`src/config/property-fields.ts`).
3. Refactor ListProperty to consume spec.
4. Refactor admin PropertyEdit to consume spec.
5. Refactor PropertyDetail to consume spec.
6. Quick wins (A1, A2, B1, B2, B3, C1, E1, E2, F2, J1).
7. India fields — schema (parking counts + India rental fields).
8. India fields — wire into surfaces.
9. Rent/sale — schema (listing_type enum + sale columns).
10. Rent/sale — wire (spec + surfaces + search filter).
11. Comms (H1, H2, H3, StatusGuidance component).
12. Admin quality checks — G1 (queue full property view + search).
13. Admin quality checks — G2 + G3 (detail full property + Decisions tab).

---

## Sync notes (Phase 1.5 addendum, 2026-07-14)

- CLAUDE.md trimmed to ~275 lines in Sync Prompt 5; full history in `commons-decisions.md` D-001–D-171.
- Sync series (P1–P5, D-167–D-171) closed the parity audit — no outstanding cleanup items from Phase 1.5 itself. Future scope goes above under Phase 2+.

---

## Phase 4+ deferred items surfaced during Phase 3 Prompt 1

### Admin Requests UI (Phase 4)
List view of all contact_requests with filters (status, owner, tenant, date), detail drawer showing full snapshot + email_send_log timeline. Phase 3 exposes admin RLS read but no UI.

### WhatsApp deep-link reveal option (Phase 4+)
On approve, offer `wa.me/91...` deep links alongside the email reveal. Phase 3 stays email-only (D-P3-001) — WhatsApp added only after we have delivery metrics to justify the extra surface.

### Daily nudge email for owners with long-pending pile (Phase 4)
Separate n8n workflow: if an owner has requests pending > 3 days, send a gentle nudge. Phase 3 does the daily digest only (D-P3-008); the nudge is a distinct cadence.

### Consent audit trail — full DPDP compliance (Phase 4)
Phase 3 stores `consent_checked_at` + `consent_terms_version` on every row (D-P3-010). Phase 4 adds: terms-version history table, per-row re-consent flow if terms version changes, admin export of consent trail per user. Columns already exist — this is UI + policy work.

### Mass-approve fraud monitoring (later)
Detect owners approving unusually high volumes (potential lead-scraping abuse). Listing review at publish time already gates the primary spam vector, so monitoring is lower priority. Metric candidates: approvals/day per owner, decline-then-approve-from-different-tenant patterns.

### Response-rate window revisit — rolling 90d instead of all-time (revisit at 90-day production mark)
D-P3-009 ships with all-time + last-7d. If all-time proves too stale (owner improves but old bad numbers drag them down), swap to rolling 90d. Revisit once we have 90 days of production request data.

### Property list on owner public profile /u/:ownerId (Phase 4)
Currently /u/:ownerId shows profile only. Phase 4 adds a "properties by this owner" section — useful once response-rate metrics (D-P3-009) draw tenants to owner profiles.

### `contact_request_status` rate-limit config revisit (30-day check)
The 10/day IST cap in D-P3-006 is a guess. Revisit after 30 days of production data — if legitimate tenants hit the cap, raise it; if spam patterns emerge below the cap, lower it or add secondary signals.

### OwnerRateBlock lift-out from RequestContactPanel — if "About the owner" block ships on PropertyDetail
Phase 3 Prompt 3 embedded the owner response-rate strip inside `RequestContactPanel.tsx` as a `<OwnerRateBlock>` sub-component because PropertyDetail has no dedicated owner section today (D-091-adjacent privacy). When a Phase 4+ "About the owner" mini-profile block is added to PropertyDetail (see commons-forward-plan §"About the owner mini-profile block"), lift `OwnerRateBlock` out to `src/components/property-detail/OwnerRateBlock.tsx` and reuse the same data source — `get_owner_response_rate` RPC. No RPC or migration change required. RequestContactPanel keeps calling it too so the pending-panel context still surfaces the metric.

### `ownerDisplayName` currently passed as `null` from PropertyDetail to RequestContactPanel
Prompt 3 wires `<RequestContactPanel ownerDisplayName={null} ... />` because PropertyDetail's property fetch does not select the owner's `display_name` today. Consent-checkbox 2 copy falls back to literal "the owner" as a result. Follow-up: extend the property SELECT chain in `src/pages/PropertyDetail.tsx` to include a `public_profiles(display_name)` join (or an extra fetch keyed on `owner_id`) so the consent line reads "…with {display_name}, owner of {building_name}." Small, self-contained change — out of scope for Prompt 3, worth doing when the owner mini-profile block above is built (both use the same data).

## Phase 4+ items surfaced during Phase 3 auth-hardening session (2026-07-18/19)

### Block 1 (`handle_user_updated` phone-confirm path) — sync `public.users.phone` from auth
For Google-first users who link phone as their second provider, `NEW.phone` inside Block 1 can be null at trigger-firing time — the number lands on `auth.users` later in the same GoTrue transaction. **Do not fix this with another auth-side trigger** — that class of change caused two outages this session (D-P3-015). Correct approach: a `sync_contact_fields()` RPC (or an extension of `touch_last_login()`) called from the frontend post-login that pulls `phone` from `auth.users` via SECURITY DEFINER and writes to `public.users`. Prerequisite for enabling WhatsApp/AiSensy n8n nodes (which read `public.users.phone` directly) — the current `get_phone_fallback` chain (D-P3-016) covers reveal/resend reads but n8n nodes read the column directly.

### Privilege escalation guard — PostgREST end-to-end test
D-P3-014's guard has been tested only via MCP as `postgres`, which bypasses the trigger. Confirm via browser console as a normal signed-in user: `await supabase.from('users').update({ role: 'super_admin' }).eq('id', <own uid>)` must return `42501 / Not authorized to modify privileged user columns`. Repeat for `email_verified`, `phone_verified`, `auth_provider`, `is_active`.

### Google OAuth `last_login_at` verification
Unverified whether Supabase fires `SIGNED_IN` (vs only `INITIAL_SESSION`) after a Google OAuth redirect back to the app. `useAuth` calls `touch_last_login()` only inside the `SIGNED_IN` branch (D-P3-018). Test: fresh Google login → check `public.users.last_login_at` immediately. If Google-return only fires `INITIAL_SESSION`, extend the wiring to detect that specific bootstrap case.

### `resend-contact-webhook` `verify_jwt` confirmation
Confirm `verify_jwt = false` still set in `supabase/functions/resend-contact-webhook/config.toml` after CLI deploys — Supabase resets this to `true` on some deploy paths. If reset, incoming Resend webhook signatures fail JWT validation before reaching the Svix-signature check.

### WhatsApp / AiSensy enablement prerequisites
Before removing the `false is true` IF gates on the WhatsApp branches in the Contact Reveal / Contact Resend Reveal n8n workflows: (a) AiSensy DLT template approval complete; (b) Block 1 phone sync fix landed (above) — n8n nodes read `public.users.phone` directly and don't call `get_phone_fallback`; (c) end-to-end reveal test with WhatsApp receipts for both phone-first and Google-first tenants.

## Phase 7 — Deferred from Phase 4

### From Phase 3 (cleanup)
- End-to-end reveal test with fresh test accounts (post-Phase-3 fixes)
- PostgREST privilege escalation guard verification (browser console test)
- Google OAuth last_login_at fires on INITIAL_SESSION vs SIGNED_IN check
- resend-contact-webhook verify_jwt = false config.toml verification
- Admin Requests UI — list/filter all contact_requests
- sync_contact_fields RPC — out-of-transaction phone sync (pre-WhatsApp)
- Rate limit / response-rate window review (needs 30 days real data)

### From Phase 4B (comments)
- Thread collapse for threads with > 5 replies
- Comment like toggle-spam rate limiting (currently idempotent, low risk)
- Owner reply n8n email nudge ("someone asked a question on your listing")
- property_views retention rollup: rows > 90 days → aggregate counter → delete raws (monthly n8n job, same slot as R2 cleanup)
- OwnerRateBlock shared hook (currently duplicated in RequestContactPanel and PublicProfile — low risk, just fragile)
- Week-wise stats breakdown on PropertyDetail

### From Phase 4C (ratings)
- Rating submission notification emails (n8n, Resend)
- Owner public response to ratings (one reply per review — Airbnb pattern)
- Ratings breakdown per property on /me (owner sees per-property stats)

### From Phase 4 general
- Pseudonym word bank review (Daksh to review before any regeneration or expansion of the word bank)
- R2 orphaned image cleanup (already scheduled — monthly n8n job)

## Later Phases — Feature extensions

### Comments
- "Verified Tenant Visited" badge on comments — when commenter has a completed reveal/visit for that property, badge shows "Visited this property". Requires joining contact_requests to get_property_comments RPC. badges[] array in RPC response is already schema-ready for this.
- Comment counts on search cards (already batched via get_property_counts — just add the display threshold check and render)

### Ratings
- Double-blind rating response (owner/tenant can respond to a review, one reply each — Airbnb model)
- Pseudonym reputation signals (top contributor style) — permanent pseudonyms mean reputation builds naturally across listings

### Public profile
- Tenant public profile visibility control (currently all profiles are public — consider making tenant profiles owner-dashboard-only for privacy, or opt-in public)

### Infrastructure
- WhatsApp/AiSensy n8n nodes — blocked on DLT approval + Block 1 phone sync (sync_contact_fields RPC above)
- sync_contact_fields RPC must be built before WhatsApp nodes go live
