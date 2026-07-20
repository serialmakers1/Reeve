# Reeve Commons — Locked Decisions

Every entry is atomic and greppable. IDs are sequential — do NOT reuse or skip. When superseding, mark the old entry with `superseded_by: D-YYY` and set the new one's `supersedes` field. All dates in ISO format (YYYY-MM-DD).

---

## D-001: Two-tier edit model
date: 2026-07-10
phase: 1
category: edit-flow
decision: Owner edits split into Tier 1 (locked forever for owner) and Tier 2 (owner-editable but requires admin review). Original Tier 3 collapsed into Tier 2 for consistency.
reasoning: Tier 1 fields (address, building_name, bhk, property_type) define property identity; changing them means it is a different property, not an edit. Everything else can be re-reviewed by admin. Collapsing Tier 3 removes an inconsistent "auto-approved" middle path that adds review overhead without safety value.
supersedes: none
files_affected: ListProperty.tsx, admin PropertyEdit.tsx, commons-status-flow.md tier assignment table

## D-002: Property lifecycle statuses
date: 2026-07-10
phase: 1
category: status
decision: Seven statuses power the Commons flow: draft, pending_review, changes_requested, listed, edit_pending_review, unlisted, archived.
reasoning: draft supports auto-save before submit. pending_review locks editing to prevent race with admin review. changes_requested reopens editing after admin feedback. listed is public. edit_pending_review keeps the property visible while admin reviews changes. unlisted hides the listing but preserves it for re-listing. archived is soft-delete visible only to admin.
supersedes: none
files_affected: property_status enum, properties table, propertyStatus.ts, MyProperties.tsx

## D-003: Latest pending edit supersedes previous
date: 2026-07-10
phase: 1
category: edit-flow
decision: When an owner submits a new edit while a prior edit is still pending review, the new one supersedes the old. Admin still sees the full revision history.
reasoning: Owners will often iterate on their edit before admin has time to review; queueing multiple pending edits creates a stale-review problem. Latest-wins avoids partial approvals. Preserving history lets admin catch abuse or rapid oscillation.
supersedes: none
files_affected: property_edit_requests table, admin listing-reviews UI

## D-004: Withdraw and Cancel listing are separate buttons
date: 2026-07-10
phase: 1
category: edit-flow
decision: Withdraw (from pending_review → draft) and Cancel listing (any → archived) are two distinct actions, each with its own confirmation modal.
reasoning: Merging them into one control confuses reversible (Withdraw) with irreversible (Cancel/archive). Withdraw is common (owner wants to keep working). Cancel is rare (owner is done with this property permanently, needs support to restore).
supersedes: none
files_affected: property management page, confirmation modals

## D-005: Photo add/delete triggers review
date: 2026-07-10
phase: 1
category: image
decision: Any photo add or delete on a listed property is a Tier 2 edit — funnels through changes_requested / edit_pending_review flow.
reasoning: Photos are the most fraud-adjacent field. Owners could swap listing photos post-approval to bait-and-switch tenants. Treating photos identically to other Tier 2 edits keeps the review surface simple.
supersedes: none
files_affected: ListProperty.tsx photo section, property_edit_requests

## D-006: Auto-save silent; explicit submit button
date: 2026-07-10
phase: 1
category: edit-flow
decision: The owner form auto-saves on every field change with no toast or spinner. A separate "Submit for review" button is the only path from draft to pending_review.
reasoning: Toasts on every keystroke are noise. Auto-save prevents work loss but is invisible. Explicit submit gives the owner one clear "I'm ready" moment and enables the consent checkbox gate.
supersedes: none
files_affected: ListProperty.tsx

## D-007: Fourteen status transitions locked
date: 2026-07-10
phase: 1
category: status
decision: The state machine has exactly 14 transitions. Full matrix lives in commons-status-flow.md.
reasoning: A finite locked set of transitions makes the DB trigger, the RLS policy, and the UI button visibility all directly derivable. Anything not in the list is invalid and should be rejected by the trigger.
supersedes: none
files_affected: DB trigger enforce_property_status_transitions, commons-status-flow.md

## D-008: edit_pending_review as a status on the properties row (Option A)
date: 2026-07-10
phase: 1
category: status
decision: The property row itself moves to status = edit_pending_review while its listed values remain live. Pending values are stored in property_edit_requests.
reasoning: Option A (status column carries the state) means the owner dashboard and admin queue can filter properties by a single column with no join. Option B (separate table row with duplicated status) would fragment source-of-truth. edit_pending_review always coexists with a row in property_edit_requests.
supersedes: none
files_affected: properties table, property_edit_requests table

## D-009: Pending edit values stored in property_edit_requests, copied on approval
date: 2026-07-10
phase: 1
category: schema
decision: Every edit submission writes a row to property_edit_requests with the proposed values in a JSONB payload. On approval, admin applies those values to the properties row and closes the request.
reasoning: Keeps the live property row untouched during review — no risk of admin edits colliding with pending values. Full audit trail without needing separate versioning. Rejection just closes the request without touching properties.
supersedes: none
files_affected: property_edit_requests table, admin listing-reviews UI

## D-010: Re-list from unlisted with no changes → straight to listed
date: 2026-07-10
phase: 1
category: status
decision: An owner re-listing a previously unlisted property without any edits transitions straight to listed. No admin review needed.
reasoning: The property was already reviewed once. If nothing has changed, forcing another review adds admin load with no safety benefit. This is the fast path for owners toggling availability.
supersedes: none
files_affected: DB trigger, unlist/re-list buttons

## D-011: Editing an unlisted property requires re-listing first
date: 2026-07-10
phase: 1
category: status
decision: Owner cannot edit an unlisted property directly. They must re-list first, then use the normal edit flow (which triggers changes_requested).
reasoning: unlisted is a "paused" state, not an editable one. Combining pause + edit creates ambiguity about whether the re-list needs review. Splitting the actions keeps the state machine tight.
supersedes: none
files_affected: property management page Actions section

## D-012: Archived properties invisible to owner
date: 2026-07-10
phase: 1
category: status
decision: Archived properties are hidden from the owner dashboard entirely (or shown in a separate Archived tab). Only admin can restore them.
reasoning: Cancel listing is intended to be "I'm done." Showing archived rows in the main dashboard clutters the working set. Admin-only restore prevents accidental un-cancel and forces the owner to explain if they want it back.
supersedes: none
files_affected: MyProperties.tsx, admin properties list

## D-013: Same properties table for PM and Commons
date: 2026-07-10
phase: 1
category: schema
decision: Commons uses the existing properties table. No parallel table, no listing_source column.
reasoning: A parallel table would double the query surface for search, favourites, and property detail. Commons and PM properties share every attribute except how they entered the system; the flow difference is captured by status transitions.
supersedes: none
files_affected: properties table

## D-014: Five new property_status enum values
date: 2026-07-10
phase: 1
category: schema
decision: Add pending_review, changes_requested, edit_pending_review, unlisted, archived to the property_status enum.
reasoning: The existing enum covers the PM lifecycle (inspection_proposed, inspected, etc.) but has no state for owner-submitted-pending-review or for the two-track edit flow. Adding rather than replacing preserves the PM path.
supersedes: none
files_affected: property_status enum migration, types.ts regeneration

## D-015: New properties columns — security_deposit_amount, building_notes
date: 2026-07-10
phase: 1
category: schema
decision: Add security_deposit_amount (numeric, nullable) alongside existing security_deposit_months. Add building_notes (text, nullable).
reasoning: Owners typically know the deposit in rupees, not months. Keeping months for backward compatibility with PM listings; owners can enter either or both. building_notes captures "about the building / neighborhood" as a distinct field from house rules.
supersedes: none
files_affected: properties table, ListProperty.tsx, admin PropertyEdit.tsx, PropertyDetail.tsx

## D-016: New profiles columns for public identity
date: 2026-07-10
phase: 1
category: schema
decision: Add display_name (text), bio (text, 200 char max enforced app-side), is_public (boolean, default true), profile_photo_url (text) to profiles.
reasoning: The users table holds auth identity; profiles holds public identity. Keeping them separate matches the existing pattern (profiles.visit_scheduling_blocked, etc.). is_public reserved for future hide toggle even though no UI yet.
supersedes: none
files_affected: profiles table, /me page, /u/:userId page

## D-017: New property_activity_log table
date: 2026-07-10
phase: 1
category: schema
decision: Introduce property_activity_log with columns id, property_id, actor_id, actor_role, action, payload (JSONB), is_public (boolean), created_at.
reasoning: Audit trail for every state change so owner, admin, and public each see the appropriate slice. actor_role captures whether the row was written by owner, admin, or system trigger. is_public flag drives the public timeline on the property detail page.
supersedes: none
files_affected: property_activity_log table, PropertyDetail public timeline

## D-018: New property_edit_requests table
date: 2026-07-10
phase: 1
category: schema
decision: Per build plan Step 1.3: property_edit_requests holds pending edit payloads with status (pending, approved, rejected, superseded), reviewer_id, reason, timestamps.
reasoning: See D-009. The row lives from submission until approval, rejection, or being superseded by a newer request.
supersedes: none
files_affected: property_edit_requests table, admin listing-reviews UI

## D-019: Deferred — rental_preferences table, lat/lng columns
date: 2026-07-10
phase: 1
category: forward-plan
decision: rental_preferences table and properties.latitude/longitude are NOT added in Phase 1.
reasoning: Rental preferences form is a Phase 2/3 build. Latitude/longitude require Google Places integration and billing setup. Both are noted in commons-forward-plan.md.
supersedes: none
files_affected: commons-forward-plan.md

## D-020: New RLS policy property_images_select_owner
date: 2026-07-10
phase: 1
category: schema
decision: Add a SELECT RLS policy on property_images that allows the property owner to read their own images regardless of property status.
reasoning: The existing property_images_select_public policy only allows SELECT for status = listed AND is_active = true. Owners uploading photos to a pending_review property currently cannot re-read them. This is a hard blocker for Phase 1 image UX.
supersedes: none
files_affected: property_images RLS

## D-021: upload-property-image gains ownership check
date: 2026-07-10
phase: 1
category: schema
decision: The upload-property-image Edge Function must verify that the caller is either an admin OR the property's owner_id before accepting an upload.
reasoning: The function currently accepts any valid JWT and any property_id UUID, so a logged-in user could upload photos to another owner's property. delete-property-image already does this check; upload should match.
supersedes: none
files_affected: supabase/functions/upload-property-image/index.ts

## D-022: DB trigger blocks owner UPDATE of status to listed
date: 2026-07-10
phase: 1
category: schema
decision: Add a BEFORE UPDATE trigger on properties that rejects any owner-initiated status change to listed EXCEPT the unlisted → listed re-list transition.
reasoning: The existing properties_update RLS has no column restriction, so an owner could set status = listed directly via API and skip admin review. The trigger enforces the state machine at the DB level, matching the pattern used for visits.
supersedes: none
files_affected: DB trigger enforce_property_status_transitions

## D-023: Cloudflare R2 stays for property photos
date: 2026-07-10
phase: 1
category: image
decision: Property photos continue to use the existing Cloudflare R2 pipeline (upload-property-image Edge Function, images.reeve.in CDN).
reasoning: Egress is free on R2, existing infra works, no migration cost. Supabase Storage will be used ONLY for the deferred profile photo upload bucket.
supersedes: none
files_affected: none (confirms existing infra)

## D-024: Client-side image compression via browser-image-compression
date: 2026-07-10
phase: 1
category: image
decision: Compress images in the browser before upload using the browser-image-compression npm package.
reasoning: Owners often upload 8-15 MB raw phone photos. Compressing to ~1 MB in-browser reduces upload time on Indian mobile networks and cuts R2 storage. Client-side avoids server-side image processing cost.
supersedes: none
files_affected: ListProperty.tsx, package.json

## D-025: Compression is silent
date: 2026-07-10
phase: 1
category: image
decision: Do not surface compression progress or messaging to the owner. Compression happens transparently between file selection and upload.
reasoning: Owners don't need to think about compression. Showing "compressing…" adds cognitive load without benefit. If compression fails, fall back to raw upload.
supersedes: none
files_affected: ListProperty.tsx

## D-026: Min 3, max 15 photos per listing
date: 2026-07-10
phase: 1
category: image
decision: Enforce a minimum of 3 photos and maximum of 15 photos on the owner form.
reasoning: 3 is the minimum to convey the property (typical: living room, bedroom, kitchen). 15 caps the upload size and avoids overwhelmed browse UX. Admin form has no limit (they may need more during PM).
supersedes: none
files_affected: ListProperty.tsx

## D-027: Accepted photo formats jpeg/png/webp/HEIC with heic2any conversion
date: 2026-07-10
phase: 1
category: image
decision: Accept jpeg, png, webp on the input. HEIC is auto-converted to jpeg in-browser via heic2any before upload.
reasoning: iPhone photos default to HEIC. R2 pipeline only accepts jpeg/png/webp (enforced by Edge Function). Client-side conversion avoids rejecting iPhone owners and keeps the server contract unchanged.
supersedes: none
files_affected: ListProperty.tsx, package.json

## D-028: Accepted formats shown up front + brief dimension guidance
date: 2026-07-10
phase: 1
category: image
decision: The photo section header lists accepted formats and shows one short line: "Landscape photos work best. Take from far enough that the whole room is visible."
reasoning: Sets expectations before file picker opens, reducing friction from unsupported formats and vertical-phone-shot rooms. One short line — not a photo guide.
supersedes: none
files_affected: ListProperty.tsx

## D-029: Vertical accordion stepper form
date: 2026-07-10
phase: 1
category: ux
decision: The owner listing form is a vertical accordion with all sections stacked. Only one section expands at a time.
reasoning: A multi-page wizard hides the total scope. A single flat form is overwhelming. Vertical accordion shows the full checklist (section titles + status) while focusing attention on one section at a time.
supersedes: none
files_affected: ListProperty.tsx

## D-030: Nine-section owner listing form
date: 2026-07-10
phase: 1
category: ux
decision: Nine sections in fixed order: Location, Property Basics, Rent & Deposit, Furnishing, Amenities, Utilities & Parking, Photos, House Rules & Neighborhood, Owner & Consent. See commons-ux.md for full field list per section.
reasoning: Groups by mental model, not DB column. Each section has a clear "why am I filling this?" answer. Nine matches the complexity ceiling of a listing without splitting closely related fields.
supersedes: none
files_affected: ListProperty.tsx, commons-ux.md

## D-031: Section header status icons + partial summary
date: 2026-07-10
phase: 1
category: ux
decision: Each collapsed section header shows a status icon (⚪ empty / 🟡 in progress / ✅ complete / 🔴 error after submit) plus a partial summary of filled values on the right.
reasoning: Icons let the owner see progress at a glance. Partial summary ("Koramangala, 2BHK") gives a preview of what they've entered without expanding. 🔴 appears only after a failed submit attempt so the owner isn't yelled at pre-emptively.
supersedes: none
files_affected: ListProperty.tsx

## D-032: Partial summary updates as fields fill; flicker accepted
date: 2026-07-10
phase: 1
category: ux
decision: The right-side partial summary re-renders on every field change, even if it causes brief visual flicker.
reasoning: Live updates make the accordion feel responsive. Debouncing to reduce flicker adds complexity and delays feedback. Flicker is acceptable at this fidelity.
supersedes: none
files_affected: ListProperty.tsx

## D-033: Submit always clickable; scrolls to first incomplete section
date: 2026-07-10
phase: 1
category: ux
decision: The Submit button is always clickable. On click, if required sections are incomplete, the page scrolls to the first incomplete section, expands it, and shows a toast listing missing sections.
reasoning: Disabled submit hides the reason it's disabled. Always-clickable + clear feedback teaches the owner what's missing. Scrolling anchors attention.
supersedes: none
files_affected: ListProperty.tsx

## D-034: "N of 5 required sections complete" progress text
date: 2026-07-10
phase: 1
category: ux
decision: Show a progress text near the Submit button: "N of 5 required sections complete."
reasoning: Section icons show per-section state but no aggregate. Text summary gives the owner an overall sense of remaining work. Only counts REQUIRED sections; optional ones don't affect the number.
supersedes: none
files_affected: ListProperty.tsx

## D-035: Preview as tenant button
date: 2026-07-10
phase: 1
category: ux
decision: The final form section has a "Preview as tenant" button that opens a modal rendering PropertyDetail in read-only mode with the current form values.
reasoning: Lets the owner see the listing as tenants will before submitting. Reusing PropertyDetail (read-only prop) means the preview always matches the real page — no drift.
supersedes: none
files_affected: ListProperty.tsx, PropertyDetail.tsx (add read-only prop)

## D-036: Legal ownership consent checkbox required
date: 2026-07-10
phase: 1
category: ux
decision: Submit is gated on a consent checkbox: "I confirm I am the legal owner or authorized representative of this property, and I have permission to list it."
reasoning: Legal cover for the platform. Keeps the owner accountable if a listing turns out to be fraudulent. Text is deliberate — covers both owners and their representatives.
supersedes: none
files_affected: ListProperty.tsx

## D-037: City open (any Indian city); India locked
date: 2026-07-10
phase: 1
category: ux
decision: The city field accepts any Indian city as free-text. Country is locked to India. State is a free-text field (no dropdown yet).
reasoning: MyPropertyNew currently locks city to Bangalore. Commons expands beyond Bangalore, so we open the input. State dropdown deferred to when we build a proper location-picker (Phase 2 with Google Places).
supersedes: none
files_affected: ListProperty.tsx

## D-038: Owner-friendly labels on owner form; admin keeps technical
date: 2026-07-10
phase: 1
category: ux
decision: Labels on the owner form are written for a non-technical owner ("Monthly rent", "Furnishing level"). The admin PropertyEdit form keeps its existing technical labels ("listed_rent", "furnishing").
reasoning: Owners get lost in DB-column-style labels. Admins prefer the technical names for grep/DB traceability. Two label maps in the code, one shared field set.
supersedes: none
files_affected: ListProperty.tsx, admin PropertyEdit.tsx

## D-039: Custom furnishing items with optional quantity
date: 2026-07-10
phase: 1
category: ux
decision: Owner can add custom furnishing items beyond the predefined list. Custom items stored in furnishing_detail JSONB with the same shape as standard items (item name + optional count).
reasoning: Predefined list can't cover every property (unusual items: pooja shelf, water heater with UV, etc.). Same shape means no schema surprise for downstream renderers.
supersedes: none
files_affected: ListProperty.tsx, PropertyDetail rendering of furnishing_detail

## D-040: Custom building amenities
date: 2026-07-10
phase: 1
category: ux
decision: Owner can add custom building amenities beyond the predefined list. Custom items append to amenities.building JSONB array.
reasoning: Same reasoning as D-039 — buildings vary. Free-text entry captures the long tail.
supersedes: none
files_affected: ListProperty.tsx, PropertyDetail rendering

## D-041: Separate House Rules and About the Building fields
date: 2026-07-10
phase: 1
category: ux
decision: Two separate textareas: "House Rules" (e.g., no smoking, no loud music after 10 PM) and "About the building / neighborhood" (e.g., near metro, quiet street, close to Forum Mall).
reasoning: House rules are strict expectations tenants must accept. Neighborhood description is marketing prose. Merging them buries either. building_notes DB column backs the second field.
supersedes: none
files_affected: ListProperty.tsx, properties.building_notes, PropertyDetail rendering

## D-042: Security deposit exact ₹ primary; monthly chip helpers
date: 2026-07-10
phase: 1
category: ux
decision: The primary security deposit input is a rupee amount. Below it, chip buttons for "1 month", "2 months", "3 months" auto-fill the rupee amount based on the entered listed_rent.
reasoning: Deposits in Bangalore are usually 3-10 months but often stated as an amount. Owners know the number they want (₹100,000). Chip helpers are shortcuts for the common patterns. Both DB columns (security_deposit_amount and security_deposit_months) get populated.
supersedes: none
files_affected: ListProperty.tsx, properties.security_deposit_amount

## D-043: Furniture count/quantity captured where applicable
date: 2026-07-10
phase: 1
category: ux
decision: For furnishing items where quantity matters (bed, wardrobe, AC, fan, geyser), the owner enters a count. Yes/no items (fridge, sofa, dining table) stay as a simple toggle.
reasoning: "Furnished" vs "unfurnished" alone is not enough — tenants want to know if there's an AC in every room or just the living room. Count is meaningful only for some items; forcing count on yes/no items adds noise.
supersedes: none
files_affected: ListProperty.tsx furnishing detail component

## D-044: New fields also appear in admin PropertyEdit
date: 2026-07-10
phase: 1
category: admin
decision: security_deposit_amount, building_notes, custom furnishing/amenities inputs are added to admin PropertyEdit with technical labels. The admin form stays a single-page technical layout — no restructure.
reasoning: Admin needs to edit every field an owner can edit. Restructuring the admin form to match the owner accordion would be a large refactor with no benefit for the admin workflow.
supersedes: none
files_affected: admin PropertyEdit.tsx

## D-045: New fields render on public property detail (deferred rendering)
date: 2026-07-10
phase: 1
category: ux
decision: security_deposit_amount, building_notes, and custom furnishing/amenities are captured in Phase 1 but their public rendering on PropertyDetail is a later phase.
reasoning: Phase 1 focuses on collecting the data. Redesigning PropertyDetail sections to accommodate them belongs with the public property page refresh (Phase 4 or so). Data captured now = no re-collect later.
supersedes: none
files_affected: commons-forward-plan.md

## D-046: Common profile system for all users
date: 2026-07-10
phase: 1
category: profile
decision: One profile system covers owners, tenants, and admins. No separate owner-profile / tenant-profile schema.
reasoning: A user can be both an owner and a tenant. Separate tables would force role duplication. Public identity is orthogonal to role.
supersedes: none
files_affected: profiles table, /me, /u/:userId

## D-047: Three profile-related pages
date: 2026-07-10
phase: 1
category: profile
decision: /profile stays the existing settings page (phone OTP, Google link) — untouched in Phase 1, labeled "Account settings" in the UI. /me is a new "My Profile" page for editing display_name/bio and viewing own stats. /u/:userId is a new public view for any user.
reasoning: Splits account plumbing (auth) from public identity (name, bio). Leaves the existing /profile intact to avoid regressing auth flows.
supersedes: none
files_affected: App.tsx routes, Profile.tsx (label change only), new /me and /u/:userId pages

## D-048: Header dropdown single "My Profile" link
date: 2026-07-10
phase: 1
category: profile
decision: The header user dropdown has a single "My Profile" link pointing to /me. Inside /me there is a subsidiary link labeled "Account settings" that goes to /profile.
reasoning: Two links at the top level ("My Profile" and "Account Settings") make users guess which one has what. One clean primary link. Account plumbing is a subsidiary concern.
supersedes: none
files_affected: Header.tsx, /me page

## D-049: Google photo auto-pull into profile_photo_url
date: 2026-07-10
phase: 1
category: profile
decision: On Google OAuth login, the user's Google avatar URL is captured into profiles.profile_photo_url. No user action needed.
reasoning: Free content. Owners with Google avatars get an instantly better public profile with zero friction. Owners without one see a placeholder.
supersedes: none
files_affected: handle_new_user / handle_user_updated triggers, profiles table

## D-050: Profile photo upload UI deferred
date: 2026-07-10
phase: 1
category: profile
decision: Manual profile photo upload is not built in Phase 1. When built later, it will use a new Supabase Storage bucket named profile-photos (not R2).
reasoning: Non-critical for launch — Google avatars cover most users. Supabase Storage chosen for profile photos because they're small, low-egress, and benefit from Supabase RLS integration. R2 stays for the higher-egress property photos.
supersedes: none
files_affected: commons-forward-plan.md

## D-051: is_public column exists but no UI toggle in Phase 1
date: 2026-07-10
phase: 1
category: profile
decision: profiles.is_public is added to the schema (default true) but no UI to toggle it exists in Phase 1.
reasoning: Reserves the shape for a future "hide my profile" toggle without needing another migration. Not needed for launch since all users are effectively public in the current flow.
supersedes: none
files_affected: profiles.is_public

## D-052: /u/:userId accessible to any logged-in user
date: 2026-07-10
phase: 1
category: profile
decision: Any logged-in user can view any other user's /u/:userId page. No restriction based on prior interaction.
reasoning: Public trust requires that anyone considering a request can view the counterpart's profile. Restricting to "after they contact you" creates a chicken-and-egg problem.
supersedes: none
files_affected: /u/:userId page

## D-053: Public profile content
date: 2026-07-10
phase: 1
category: profile
decision: Public profile shows: display_name, Google photo (or placeholder), bio, member-since date, listed properties (if any), and a placeholder section for future ratings.
reasoning: Minimum viable public identity. Ratings placeholder signals future direction without shipping incomplete UI.
supersedes: none
files_affected: /u/:userId page

## D-054: No role labels on public profile
date: 2026-07-10
phase: 1
category: profile
decision: The public profile does not display "Owner" / "Tenant" / "Admin" role labels.
reasoning: Users may hold multiple roles (owner + tenant). Displaying one is misleading. Context implies role: if you land on their profile from a listing, they're the owner of that listing.
supersedes: none
files_affected: /u/:userId page

## D-055: Verified badge subtle; only on profile pages
date: 2026-07-10
phase: 1
category: profile
decision: The verified badge (small checkmark) appears on /me and /u/:userId only, not on contact request UI. All users are already verified via phone OTP, so the badge is more informational than differentiating.
reasoning: Sprinkling the badge everywhere adds visual noise for no signal (everyone has it). Keeping it on profile pages only preserves the affordance for a future tier system without cluttering high-traffic surfaces.
supersedes: none
files_affected: /me, /u/:userId, contact request UI

## D-056: Property management URL /owner-dashboard/property/:id
date: 2026-07-10
phase: 1
category: ux
decision: The owner's per-property page lives at /owner-dashboard/property/:id.
reasoning: Distinct namespace from /my-properties/:id (existing MyPropertyDetail page — used for PM legacy). Once Commons is the default, the /owner-dashboard/ prefix reads more naturally than /my-properties/.
supersedes: none
files_affected: App.tsx routes

## D-057: Summary card top + tabbed content below
date: 2026-07-10
phase: 1
category: ux
decision: Property management page layout: summary card always visible at top (photo, title, status, rent), tabs below.
reasoning: Owner needs to know which property they're on regardless of which tab is active. Summary card is the anchor.
supersedes: none
files_affected: property management page

## D-058: Four tabs — Requests | Details | Photos | Activity
date: 2026-07-10
phase: 1
category: ux
decision: Four tabs on the property management page: Requests (default when count > 0), Details, Photos, Activity. Details is the default when zero requests.
reasoning: Requests is the highest-signal tab for owners with active listings. Details is the fallback for owners still setting up. Photos gets its own tab because photo management is heavy. Activity holds the audit log.
supersedes: none
files_affected: property management page

## D-059: Actions section at bottom of Details tab
date: 2026-07-10
phase: 1
category: ux
decision: Withdraw / Unlist / Re-list / Cancel Listing / Cancel Pending Edit buttons live at the bottom of the Details tab. No persistent footer.
reasoning: Actions are rare and destructive. Burying them in Details (not a floating footer) prevents fat-finger mishaps. Only relevant buttons render for the current status.
supersedes: none
files_affected: property management page

## D-060: Requests tab stats placeholder deferred
date: 2026-07-10
phase: 1
category: forward-plan
decision: The Requests tab will show a stats line ("12 requests · 3 approved · 2 declined · 7 pending") in a later phase. Phase 1 renders a placeholder or just the request list.
reasoning: Phase 3 owns the contact request build. Stats are a Phase 3+ polish item.
supersedes: none
files_affected: commons-forward-plan.md

## D-061: Top request strip hidden when zero requests
date: 2026-07-10
phase: 1
category: ux
decision: On the owner dashboard, the top strip showing aggregate contact request count is hidden entirely when there are zero requests.
reasoning: Empty state noise. New owners haven't received requests yet — showing "0 requests" adds a "nothing here" cue that lowers energy.
supersedes: none
files_affected: owner dashboard

## D-062: Per-property card badge for request count
date: 2026-07-10
phase: 1
category: ux
decision: Each property card on the dashboard shows a small badge with the number of contact requests for that property. Hidden if zero.
reasoning: Same rule as the top strip. Non-zero badges draw attention to properties that need action.
supersedes: none
files_affected: owner dashboard property card

## D-063: Contact request review — Option F expand-in-place
date: 2026-07-10
phase: 1
category: ux
decision: Clicking a request opens it in place (accordion-style expansion). Rental preferences show first; the tenant profile is an expandable accordion below with a "View full profile →" link to /u/:tenantId. Approve/decline buttons stay pinned at the bottom of the expanded card.
reasoning: Option F was picked over alternatives (modal, side drawer, new page) because it preserves the surrounding request list for comparison. Rental preferences are the actual decision inputs — profile is secondary but must be reachable.
supersedes: none
files_affected: Requests tab UI

## D-064: Re-request flag with previous decline info
date: 2026-07-10
phase: 1
category: ux
decision: If a tenant has previously been declined by the same owner for the same property, the request card shows "Requested again — previously declined [X days ago]."
reasoning: Owners need context. Silent re-requests risk owners approving what they previously declined without realizing.
supersedes: none
files_affected: Requests tab UI, contact_requests query

## D-065: Tenant re-request cooldown numbers deferred
date: 2026-07-10
phase: 1
category: forward-plan
decision: The specific cooldown period between tenant re-requests is not decided in Phase 1. Backend logs for re-request tracking are captured, but enforcement is Phase 3.
reasoning: Right cooldown depends on empirical data. Ship without the timer; collect data via the log; decide when Phase 3 build begins.
supersedes: none
files_affected: commons-forward-plan.md

## D-066: Owner dashboard hybrid layout
date: 2026-07-10
phase: 1
category: ux
decision: Owner dashboard: top task strip (contact requests aggregate — hidden if zero) plus property grid below.
reasoning: Top strip drives action-oriented owners. Grid drives portfolio-oriented owners. Both fit above the fold on desktop; mobile stacks naturally.
supersedes: none
files_affected: owner dashboard

## D-067: Prominent Add Property button top-right
date: 2026-07-10
phase: 1
category: ux
decision: The "Add Property" button sits top-right of the owner dashboard, visually prominent.
reasoning: This is the primary action for a new owner. Making it the top-right anchor matches convention (Gmail Compose, GitHub New Repo).
supersedes: none
files_affected: owner dashboard

## D-068: Property card navigates to management page
date: 2026-07-10
phase: 1
category: ux
decision: Clicking anywhere on a property card in the dashboard navigates to /owner-dashboard/property/:id.
reasoning: Full-card click zone matches touch-friendly patterns. No sub-actions on the card level — everything happens inside the management page.
supersedes: none
files_affected: owner dashboard card component

## D-069: Archived hidden by default; separate tab
date: 2026-07-10
phase: 1
category: ux
decision: Archived properties do not appear in the main property grid. A separate "Archived" section or tab shows them (view-only). Restore is admin-only.
reasoning: Ties back to D-012. Owner-visible archive is a nice-to-have for reference, but "restore" is intentionally friction-loaded.
supersedes: none
files_affected: owner dashboard

## D-070: Admin review queue URL /admin/listing-reviews
date: 2026-07-10
phase: 1
category: admin
decision: The admin review queue lives at /admin/listing-reviews.
reasoning: Clear name, singular purpose. Distinct from /admin/properties (browse all properties) and /admin/owners (pipeline).
supersedes: none
files_affected: App.tsx routes, AdminLayout.tsx nav

## D-071: Two tabs — New Listings and Edit Requests
date: 2026-07-10
phase: 1
category: admin
decision: The review queue has two tabs — "New Listings" (pending_review status) and "Edit Requests" (edit_pending_review status). Each tab shows a count badge.
reasoning: Reviewing a fresh listing and reviewing an edit are different workflows (all fields vs diff). Separating tabs cleanly separates workflow.
supersedes: none
files_affected: /admin/listing-reviews page

## D-072: Filter by city; sort by oldest first (default)
date: 2026-07-10
phase: 1
category: admin
decision: The review queue filters by city (not locality) and defaults to sorting oldest first. Newest and owner-name sorts available.
reasoning: Oldest-first prevents starvation of long-waiting owners. City filter matches admin regional focus. Locality is too granular for a queue triage view.
supersedes: none
files_affected: /admin/listing-reviews page

## D-073: Full version timeline per property visible to admin
date: 2026-07-10
phase: 1
category: admin
decision: Admin can see the full history of prior edit requests (approved, rejected, superseded) with reasons for each on a property's review page.
reasoning: Detects abuse patterns (rapid oscillation, resubmitting rejected content). Full context for edge cases.
supersedes: none
files_affected: /admin/listing-reviews detail page, property_edit_requests

## D-074: Admin edits bypass review
date: 2026-07-10
phase: 1
category: admin
decision: When admin edits a property through admin PropertyEdit, changes apply immediately with no review step.
reasoning: Admin is the reviewer. Recursively reviewing admin edits is a paradox.
supersedes: none
files_affected: admin PropertyEdit.tsx submit handler

## D-075: Admin PropertyEdit stays single-page technical
date: 2026-07-10
phase: 1
category: admin
decision: The admin PropertyEdit form structure is not changed. New fields are inserted into their existing sections; no restructure to match the owner accordion.
reasoning: Admins are trained on the current layout. Restructuring is high-cost, zero-benefit for them.
supersedes: none
files_affected: admin PropertyEdit.tsx

## D-076: property_activity_log payload — Option C curated summary
date: 2026-07-10
phase: 1
category: schema
decision: The payload JSONB uses Option C: { summary: "Rent reduced from ₹32,000 to ₹30,000", changed_field_keys: [...], edit_request_id: <uuid>, reason: null }.
reasoning: Option A (full diff) is verbose. Option B (bare summary) loses context. Option C balances readability with programmatic access (via changed_field_keys). Reason field left null for non-reject events; populated on rejection.
supersedes: none
files_affected: property_activity_log table

## D-077: One log event per admin edit approval
date: 2026-07-10
phase: 1
category: schema
decision: When an admin approves an edit request, ONE row is written to property_activity_log summarizing all changes, not one row per field.
reasoning: Owners think in "I edited the listing" not "I changed field X, Y, Z." One row per approval matches user mental model and reduces log noise.
supersedes: none
files_affected: property_activity_log

## D-078: No backfill of PM history at Phase 1 launch
date: 2026-07-10
phase: 1
category: schema
decision: property_activity_log starts empty. Existing PM-era transitions (draft → inspection_proposed → …) are NOT backfilled.
reasoning: Retroactively logging events risks incorrect actor attribution and misleading timestamps. The log begins on Phase 1 launch day.
supersedes: none
files_affected: property_activity_log

## D-079: Log visibility rules
date: 2026-07-10
phase: 1
category: schema
decision: Owner sees full log for their own properties. Admin sees all logs. Public sees only rows where is_public = true.
reasoning: Standard tiered visibility. Public tier is deliberately curated to avoid leaking admin actions or rejected edits.
supersedes: none
files_affected: property_activity_log RLS

## D-080: Public timeline on property detail page — always visible
date: 2026-07-10
phase: 1
category: ux
decision: The property detail page (/property/:id) always shows a public activity timeline, even if there's only one event ("Listed on July 12").
reasoning: Single-event timeline gives context ("this listing is fresh"). Hiding until N events adds arbitrary rules. Always-visible is simpler.
supersedes: none
files_affected: PropertyDetail.tsx

## D-081: Curated public events list
date: 2026-07-10
phase: 1
category: ux
decision: Public timeline events include: listed, price reduced, price increased, photos updated, availability date changed, unlisted-then-relisted.
reasoning: Signal-rich events that tenants care about. Excludes noise like description tweaks or internal admin actions.
supersedes: none
files_affected: PropertyDetail public timeline

## D-082: NOT public — description edits, house rules edits, admin actions, rejection reasons
date: 2026-07-10
phase: 1
category: ux
decision: Description edits, house rules edits, admin actions (approve/reject), rejection reasons, and minor tweaks stay is_public = false.
reasoning: Editing marketing copy is not tenant-relevant. Admin actions and rejection reasons are internal. Public timeline stays about facts a tenant should know.
supersedes: none
files_affected: property_activity_log seeding logic

## D-083: Confirmation modal copy locked
date: 2026-07-10
phase: 1
category: ux
decision: Copy for the 5 destructive/state-changing owner modals is locked. See commons-ux.md for exact text and button styles.
reasoning: Modal copy is high-friction to iterate on. Locking now prevents drift during build.
supersedes: none
files_affected: property management page modals

## D-084: Migration file structure — 7 files, timestamped, executed in strict sequence
date: 2026-07-10
phase: 1
category: schema
decision: 7 migration files in `supabase/migrations/`, each with a single logical purpose, executed in dependency order with per-file verification.
reasoning: Rollback safety — if file N fails, files 1..N-1 are already applied and additive. Reviewability — grep migration history by purpose. Postgres enum ADD VALUE requires COMMIT before use, forcing separation. Combined mega-migration risks partial-rollback complexity.
supersedes: none
files_affected: supabase/migrations/20260710120000_*.sql through 20260710120600_*.sql, types.ts

## D-085: display_name fallback chain
date: 2026-07-10
phase: 1
category: profile
decision: Shared utility `getUserDisplayName(user, profile)` returns first non-null of: profiles.display_name → users.full_name → users.email.split('@')[0] → "Anonymous". Handles missing profile row.
reasoning: Many existing users lack profiles rows even though the trigger creates one (older accounts pre-trigger). Defensive fallback prevents UI crashes. Utility centralized in `src/lib/user.ts` for consistent rendering everywhere.
supersedes: none
files_affected: src/lib/user.ts (created in Prompt 2), all pages rendering user names

## D-086: 10-prompt implementation sequence for Phase 1
date: 2026-07-10
phase: 1
category: forward-plan
decision: Phase 1 built via 10 sequential prompts — (1) migrations + Edge Function, (2) frontend primitives, (3) ListProperty create, (4) ListProperty edit, (5) /me + /u/:userId, (6) owner dashboard, (7) property management page, (8) admin review queue, (9) activity log rendering, (10) integration + smoke.
reasoning: Each prompt is independently buildable and testable. Later prompts depend on earlier; failure isolates. Header nav changes deferred to Phase 6 keep interim state stable.
supersedes: none
files_affected: commons-forward-plan.md sequence documentation

## D-087: Save button + auto-save behavior
date: 2026-07-10
phase: 1
category: edit-flow
decision: Draft row created on first click of manual Save button OR on first auto-save fire (whichever comes first). Save button becomes visible once minimum INSERT-valid fields (building_name, street_address, city, bhk, furnishing) are filled. Auto-save fires 500ms after last change, silent (no toast), only after draft row exists. Manual save is always available for reassurance.
reasoning: Prevents malformed drafts. Auto-save maintains data safety once row exists. Manual save provides owner control and confidence.
supersedes: none
files_affected: ListProperty.tsx (Prompt 3), useListingSave.ts (Prompt 2)

## D-088: Header nav changes deferred to Phase 6
date: 2026-07-10
phase: 1
category: ux
decision: Phase 1 does NOT change Header dropdown or mobile menu. "My Profile" continues pointing to `/profile` (existing settings). `/me` page reachable only by direct URL. BottomNav "Owner Dashboard" tab similarly untouched until owner-dashboard exists (Prompt 6, which will repoint it).
reasoning: Avoid 404 windows during interim states. Users find new features via existing paths (redirects). Phase 6 cutover releases nav changes atomically.
supersedes: D-048 (Header repoint moved from Phase 1 to Phase 6)
files_affected: Header.tsx (unchanged in Phase 1), BottomNav.tsx (updated in Prompt 6)

## D-089: MyPropertyNew.tsx retained; only redirect added
date: 2026-07-10
phase: 1
category: edit-flow
decision: `src/pages/MyPropertyNew.tsx` file NOT deleted in Phase 1. In App.tsx (Prompt 3), add redirect `/my-properties/new` → `/list`. Delete file only after Phase 6 stability confirmed.
reasoning: Ground rule — never delete existing code while a rollback path may be needed. File remains as safety net. Redirect handles user-facing URL correctness.
supersedes: none
files_affected: App.tsx (redirect in Prompt 3), MyPropertyNew.tsx (retained, unused)

## D-090: Photo edits during `listed` state go through review flow via payload
date: 2026-07-10
phase: 1
category: image
decision: When property is `listed`, photo add/delete/update/reorder are captured in `property_edit_requests.payload.photo_changes` alongside field changes. Upload lands in R2 but not in `property_images` table until admin approves. Draft/changes_requested states allow direct property_images writes (no edit request layer).
reasoning: Consistency with D-005 (all changes reviewed). Atomic approval — all changes applied together. R2 orphan risk mitigated by monthly cleanup safety net (D-096). Approach marked tentative — revisit after owner feedback (see commons-forward-plan.md).
supersedes: none
files_affected: property_edit_requests table schema, upload-property-image Edge Function (Prompt 4 addition), ListProperty.tsx (Prompt 4)

## D-091: `edit_pending_review` included in Search.tsx filter and public RLS
date: 2026-07-10
phase: 1
category: status
decision: Search.tsx WHERE clause updated from `.eq("status", "listed")` to `.in("status", ["listed", "edit_pending_review"])`. Listing stays visible with OLD field values during edit review. `properties_select` RLS policy widened to include both statuses.
reasoning: Live listing must remain visible. Otherwise tenants who bookmarked the property still see it via direct URL but new tenants can't discover it — inconsistent surface. RLS and Search must agree.
supersedes: none
files_affected: Search.tsx (Prompt 2), properties_select RLS (Prompt 1 migration 7)

## D-092: `changes_requested` banner acknowledgeable
date: 2026-07-10
phase: 1
category: ux
decision: When admin rejects a listing (`pending_review → changes_requested`) or rejects an edit (`edit_pending_review → listed` with rejection), owner sees dismissible banner at top of ListProperty (for changes_requested) or property management page (for edit rejection). Banner shows admin reason + "OK, got it" button. Acknowledgment stored in `owner_action_acknowledgments` table.
reasoning: Feedback visibility is critical for owner action. Cross-device consistency requires DB storage (not localStorage). Table also supports future acknowledgments beyond edits.
supersedes: none
files_affected: owner_action_acknowledgments table (Prompt 1 migration 6), ListProperty.tsx (Prompt 3), property management page (Prompt 7)

## D-093: Activity log strategy — log all transitions, mark curated events as public
date: 2026-07-10
phase: 1
category: schema
decision: Every property status transition creates a `property_activity_log` row (private by default). Curated event types (`listed` from pending_review or unlisted; `unlisted`) additionally set `is_public = true`. Public property detail page timeline reads only public entries. Edit approvals with field changes (price, photos, availability) become is_public via the approve_edit_request RPC when the change qualifies (deferred to Prompt 4).
reasoning: Complete owner history without exposing every trivial change publicly. Public timeline shows trust signals only.
supersedes: none
files_affected: property_activity_log table (Prompt 1 migration 4), property_activity_log_writer trigger (Prompt 1 migration 7), PropertyDetail.tsx (later prompt)

## D-094: Rejected edit keeps property `listed`
date: 2026-07-10
phase: 1
category: status
decision: When admin rejects an edit request (property in `edit_pending_review`), property returns to `listed` with is_active=true (live listing unchanged). Edit request row stores rejection reason. No `changes_requested` state used for edit rejections — that state is only for first-time listing rejections.
reasoning: Live listing must remain visible; owner shouldn't lose visibility because they attempted an edit. Rejection reason visible via banner + activity log.
supersedes: none
files_affected: reject_edit_request RPC (Prompt 4), enforce_property_owner_transitions trigger (Prompt 1 migration 7 — allows edit_pending_review → listed)

## D-095: Revision history — latest + timestamps + full diff on expand
date: 2026-07-10
phase: 1
category: admin
decision: Admin review UI shows latest edit request in full. Below: collapsible "Previous versions (N)" section with timestamps only; each timestamp click expands that version's full diff.
reasoning: Compact default view; drill-down available. Historical diffs already exist in payload, no additional storage.
supersedes: none
files_affected: admin review queue (Prompt 8)

## D-096: R2 orphan cleanup — monthly n8n safety net (Phase 1)
date: 2026-07-10
phase: 1
category: image
decision: Phase 1 relies on a monthly n8n workflow scanning R2 for URLs not referenced by `property_images.url` OR by any pending `property_edit_requests.payload.photo_changes.add`. Deletes files older than 7 days. Phase 2 adds immediate delete via RPC-triggered Edge Function for speed.
reasoning: Simpler for Phase 1. Low listing volume means orphans are acceptable for 30 days. Safety net protects against edge cases (Edge Function failure, race conditions).
supersedes: none
files_affected: n8n workflow (deferred), commons-forward-plan.md

## D-097: Photo change payload structure
date: 2026-07-10
phase: 1
category: image
decision: `property_edit_requests.payload.photo_changes = { add: [{ temp_id, url, section, caption, is_primary, is_floor_plan, sort_order }], delete: [image_id, ...], update: [{ id, is_primary?, is_floor_plan?, section?, caption?, sort_order? }] }`.
reasoning: Structured shape supports atomic RPC processing at approval time. temp_id enables reorder within the same edit before submission.
supersedes: none
files_affected: property_edit_requests table, approve_edit_request RPC (Prompt 4), ListProperty edit mode (Prompt 4)

## D-098: Photo config in shared file
date: 2026-07-10
phase: 1
category: image
decision: Photo constants live in `src/config/photo.ts` — compression params (maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true), upload limits (maxCount: 15, minCount: 3, maxSizeMBRaw: 15), accepted formats (jpeg, png, webp, heic, heif), section suggestions.
reasoning: Single source of truth for photo constants shared by upload UI, compression utility, validation, admin form. Editable without env changes. TypeScript-safe.
supersedes: none
files_affected: src/config/photo.ts (Prompt 2)

## D-099: ActivityLogPayload TypeScript discriminated union
date: 2026-07-10
phase: 1
category: schema
decision: `property_activity_log.payload` is free-form JSONB with TypeScript discriminated union type in `src/types/activity-log.ts`. Every RPC that writes uses a typed variant. Every reader narrows via switch on `action`. No DB-level CHECK constraints on payload shape. Every variant carries `summary: string` for uniform timeline rendering.
reasoning: Flexible schema evolution. Compile-time safety at write/read sites. RPCs and triggers are the only writers (service_role only). `summary` guarantees timeline always renders even if the union grows a case the UI doesn't know.
supersedes: none
files_affected: src/types/activity-log.ts (later prompt), all RPCs writing to activity log

## D-100: Session expiration handling — modal with form state preview
date: 2026-07-10
phase: 1
category: edit-flow
decision: On any save 401 response, `useListingSave` shows non-dismissible modal: "Session expired. Please log in again. Your work below will be preserved when you return." Modal displays current form state as readable text so owner can copy manually. No localStorage backup in Phase 1. Full recovery via localStorage deferred.
reasoning: Phase 1 minimum viable — prevents silent data loss. localStorage backup adds significant complexity for edge case. Explicit user action expected.
supersedes: none
files_affected: useListingSave.ts (Prompt 2), ListProperty.tsx (Prompt 3)

## D-101: Draft property hard limit — 20 per user
date: 2026-07-10
phase: 1
category: edit-flow
decision: A user can have at most 20 properties in `draft` status. Enforced at frontend (block Add Property button) and DB (trigger raises exception on INSERT if count >= 20).
reasoning: Prevents draft spam. Belt-and-suspenders: frontend for UX, DB for API bypass safety. Copy: "You have reached the 20-draft limit. Complete or discard some drafts before starting a new listing."
supersedes: none
files_affected: enforce_property_owner_transitions trigger (Prompt 1), Add Property button (Prompt 6)

## D-102: `key={propertyId}` remount pattern for ListProperty
date: 2026-07-10
phase: 1
category: edit-flow
decision: `<ListProperty key={propertyId} />` in App.tsx routing forces React to remount when propertyId changes. useListingSave refs reset naturally. Prevents cross-contamination when owner navigates between drafts.
reasoning: Simpler than manual flush logic. React lifecycle guarantees clean unmount/mount. Existing auto-save cleanup pattern (from useInspectionSave) fires before unmount.
supersedes: none
files_affected: App.tsx routing (Prompt 3), ListProperty.tsx (Prompt 3)

## D-103: Migration idempotency — DROP IF EXISTS, ADD VALUE IF NOT EXISTS
date: 2026-07-10
phase: 1
category: schema
decision: All ALTER TYPE ADD VALUE use `IF NOT EXISTS`. All CREATE POLICY preceded by `DROP POLICY IF EXISTS`. All CREATE TRIGGER preceded by `DROP TRIGGER IF EXISTS`. Every migration safely re-runnable.
reasoning: Partial failure recovery. Enables local development re-runs. Idempotency is a Supabase migration best practice.
supersedes: none
files_affected: all 7 Phase 1 migration files

## D-104: profiles column defaults
date: 2026-07-10
phase: 1
category: profile
decision: `display_name text NULL`, `bio text NULL`, `is_public boolean NOT NULL DEFAULT true`.
reasoning: display_name and bio are optional user content. is_public defaults true (all profiles public by default; toggle deferred per D-051).
supersedes: none
files_affected: 20260710120200_add_profile_columns_commons.sql

## D-105: No backfill of display_name for existing users
date: 2026-07-10
phase: 1
category: profile
decision: When display_name column is added, existing user rows have display_name = NULL. No UPDATE backfill from users.full_name.
reasoning: getUserDisplayName() fallback (D-085) handles NULL gracefully. Backfilling is a one-time operation with no long-term benefit. Users populate display_name naturally on first profile edit.
supersedes: none
files_affected: 20260710120200_add_profile_columns_commons.sql

## D-106: Activity log first entry on draft creation
date: 2026-07-10
phase: 1
category: schema
decision: `property_activity_log` gets a 'listing_started' event on properties INSERT when status='draft'. Private (is_public=false).
reasoning: Complete owner history. Timeline shows "You started this listing on July 12." Consistency with logging all transitions.
supersedes: none
files_affected: property_activity_log_writer trigger (Prompt 1 migration 7)

## D-107: Trigger ordering — BEFORE handles status, AFTER writes log
date: 2026-07-10
phase: 1
category: schema
decision: `enforce_property_owner_transitions` is BEFORE INSERT/UPDATE (validation gate). `handle_property_status_change` is BEFORE UPDATE (modifies NEW.is_active). `property_activity_log_writer` is AFTER INSERT/UPDATE (reads final NEW row, INSERTs log). Postgres fires BEFORE triggers alphabetically → 'enforce_' runs before 'handle_'.
reasoning: Validation must reject transitions before any column mutation happens. Log must observe the final post-mutation row. Naming enforces the correct order.
supersedes: none
files_affected: 20260710120600_add_commons_rls_and_triggers.sql

## D-108: Photo upload UI disabled until draft row exists
date: 2026-07-10
phase: 1
category: ux
decision: Section 7 (Photos) accordion shows disabled upload UI with message "Complete Rent & Deposit section first" until a properties draft row exists for this session. Once draft row exists, upload becomes enabled.
reasoning: Photos require a property_id to associate with. No draft row = no ID. Explicit message teaches owner the ordering.
supersedes: none
files_affected: ListProperty.tsx (Prompt 3)

## D-109: Server-side required-fields enforcement via trigger
date: 2026-07-10
phase: 1
category: schema
decision: BEFORE UPDATE trigger on properties rejects `status → pending_review` transition if required fields are NULL (locality, building_name, bhk, listed_rent, security_deposit_amount, furnishing, available_from) or if photo count < 3.
reasoning: Defense against frontend validation bugs and API bypass. Admin queue integrity — no incomplete submissions clog the queue.
supersedes: none
files_affected: enforce_property_owner_transitions trigger (Prompt 1 migration 7)

## D-110: Admin PropertyEdit status dropdown NOT updated with new statuses (Phase 1)
date: 2026-07-10
phase: 1
category: admin
decision: Admin PropertyEdit's status Select component keeps only current PM statuses. New Commons statuses (pending_review, changes_requested, edit_pending_review, unlisted, archived) NOT added to dropdown. Only settable via Commons flow or Supabase Studio.
reasoning: Prevents admin accidentally moving PM property into Commons flow. Commons statuses reserved for Commons-flow properties. Explicit separation.
supersedes: none
files_affected: admin PropertyEdit.tsx (unchanged in Phase 1)

## D-111: Admin direct edits on Commons properties bypass review, logged as admin_edit
date: 2026-07-10
phase: 1
category: admin
decision: When admin uses PropertyEdit on a Commons `listed` property, the UPDATE is applied directly (no edit request created). Trigger bypasses status transition validation via is_admin() check. Activity log records event with action='admin_edit' and actor_role='admin'.
reasoning: Admin is the reviewer — no self-review needed. Owner sees admin action in activity timeline for transparency.
supersedes: none
files_affected: enforce_property_owner_transitions trigger, property_activity_log_writer trigger

## D-112: "Preview as tenant" uses current form state
date: 2026-07-10
phase: 1
category: ux
decision: Preview modal renders PropertyDetail (read-only) using current in-memory form state, not last-saved draft. Owner sees exactly what they're about to submit.
reasoning: Owner may have typed changes since last auto-save. Preview must reflect committed intent.
supersedes: none
files_affected: ListProperty.tsx (Prompt 3)

## D-113: JSONB fields patched atomically as full rebuild
date: 2026-07-10
phase: 1
category: schema
decision: Fields backed by JSONB (`furnishing_detail`, `amenities`) are rebuilt from current form state and patched as a whole object on every change — no partial merge on the DB side.
reasoning: JSONB merge semantics differ across drivers and add operator surface. Sending the full array/object per change is a few extra bytes but produces predictable state and simplifies the auto-save hook (single patch payload per column).
supersedes: none
files_affected: ListProperty.tsx `buildFurnishingDetail`, `buildAmenitiesJson`

## D-114: `(supabase as any)` escape hatch for dynamic-shape queries
date: 2026-07-10
phase: 1
category: schema
decision: When a Supabase query builder call has a payload shape that doesn't fit the generated Update/Insert type — dynamic patch keys, JSONB columns treated as untyped, or view queries not in generated types — cast the client as `(supabase as any)` for that one call.
reasoning: The generated types.ts is strict enough that generic query builders often fail inference on legitimate patterns. `(supabase as any)` is the least-invasive local escape. Same convention as pre-Commons callback_requests usage (per CLAUDE.md). Do not wrap widely — cast only the one call site.
supersedes: none
files_affected: useListingSave.ts, ListProperty.tsx, OwnerDashboard.tsx, OwnerPropertyManagement.tsx, admin pages

## D-115: Photo prefetch — single `.in()` after list query
date: 2026-07-10
phase: 1
category: schema
decision: To display cover thumbnails alongside a list of properties, run the properties query, collect ids, then a single `property_images.select().in("property_id", ids).eq("is_primary", true)` follow-up. Build `photoMap: Record<propertyId, url>` in memory.
reasoning: Avoids N+1 (one query per row). Under moderate list sizes (< 500) the `.in()` clause is fast; the alternative (server-side join or view) adds schema surface for a page-specific need.
supersedes: none
files_affected: OwnerDashboard.tsx, ListingsGrid.tsx, ListingReviewQueue.tsx (Prompt 8)

## D-116: URL tab param uses `setSearchParams(replace: true)`
date: 2026-07-10
phase: 1
category: ux
decision: Pages with tab state persist the active tab in `?tab=` via `setSearchParams(next, { replace: true })`. Refresh preserves the tab; browser back doesn't accumulate a history entry per tab click.
reasoning: `push` semantics turn "click 4 tabs" into a 4-deep back stack and confuse users on back button. `replace` matches user mental model of tab switches as UI state, not navigation.
supersedes: none
files_affected: OwnerPropertyManagement.tsx, ListingReviewQueue.tsx

## D-117: ConfirmDialog blocks re-open during in-flight action
date: 2026-07-10
phase: 1
category: ux
decision: The reusable ConfirmDialog guards `onOpenChange` with `!busy && onOpenChange(v)` while the confirm handler is running. Dialog cannot be dismissed until action resolves.
reasoning: Prevents accidental double-submits (owner clicks the underlying page during in-flight RPC and re-triggers the action). Loading state on the confirm button reinforces the visual.
supersedes: none
files_affected: src/components/property-management/ConfirmDialog.tsx

## D-118: New listing rejection via direct UPDATE + manual activity log INSERT
date: 2026-07-10
phase: 1
category: admin
decision: Admin's "Request Changes" action on a `pending_review` property performs `UPDATE properties SET status = 'changes_requested'` then INSERT into `property_activity_log` with `action='listing_rejected'`, `payload={ reason, reason_text, admin_id }`. No dedicated RPC.
reasoning: Two-step non-atomic write is acceptable for a single admin action — worst case is a status change with no reason logged; admin can re-log manually. Avoids adding a migration/RPC for a low-frequency op. Approval path already uses trigger-generated log entries; rejection is the outlier.
supersedes: none
files_affected: ListingReviewDetail.tsx (Prompt 8)

## D-119: Admin queue rows use client-side filter/sort over a single fetch
date: 2026-07-10
phase: 1
category: admin
decision: The admin review queue fetches all pending rows in one query, then applies city filter and sort in-memory. No server-side WHERE per filter change.
reasoning: Queue size is expected to be < 200 rows even at scale. Client-side ops are instant; server round-trips per filter change would feel laggy. Rerun the full fetch only on tab change or manual refresh.
supersedes: none
files_affected: ListingReviewQueue.tsx

## D-120: property_images_select_public widened to edit_pending_review
date: 2026-07-10
phase: 1
category: schema
decision: The public SELECT policy on `property_images` now allows access when the parent property is in `listed` OR `edit_pending_review` (both AND `is_active=true`). Previously listed-only.
reasoning: Prompt 2 (D-091) widened Search.tsx and `properties_select` to include `edit_pending_review`, but the photos policy was missed. Tenants saw the listing card with an empty gallery on click. Additive fix — never narrows visibility.
supersedes: none
files_affected: supabase/migrations/20260710121000_fix_commons_gaps.sql, property_images RLS

## D-121: property_activity_log_writer trigger logs admin edits without status change
date: 2026-07-10
phase: 1
category: schema
decision: Extended `property_activity_log_writer` (AFTER UPDATE) trigger with a third branch: when `OLD.status = NEW.status` AND `is_admin()` AND any tracked Tier-2 column differs, insert an `admin_edit` log row with a `changed_field_keys` array. `is_public=false`. Preserves existing INSERT-of-draft and status-transition branches verbatim.
reasoning: D-111 promised owner visibility of admin actions via the activity log, but the original trigger only fired on status change. Admin editing a listed property's rent left no trace. Fix in the trigger keeps admin PropertyEdit unchanged (no callsite additions), and works transparently for any future admin write.
supersedes: none
files_affected: supabase/migrations/20260710121000_fix_commons_gaps.sql, property_activity_log_writer

## D-122: Path B submit blocked when payload has zero changes
date: 2026-07-10
phase: 1
category: edit-flow
decision: ListProperty's Path B submit path checks `editRequestPayload.field_changes` and `photo_changes.{add,delete,update}` before calling `submit_property_edit_request`. If all are empty, show a destructive toast "No changes to submit — make changes before submitting for review." and abort.
reasoning: Without the guard, an owner who clicks Submit without editing anything would create an empty edit request, transition their listing to `edit_pending_review`, and clog the admin queue. RPC also has a natural "no-op" behavior server-side but the transition still happens.
supersedes: none
files_affected: ListProperty.tsx submit()

## D-123: Preview mode computes effective photos in Path B
date: 2026-07-10
phase: 1
category: image
decision: The "Preview as tenant" modal in Path B mode computes the effective photo set: existing `images` minus those in `photo_changes.delete`, plus `photo_changes.add` entries mapped to the preview shape. Path A passes `images` directly since photos are already the live state.
reasoning: Preview must reflect the intent of the submission — including pending photo changes. Without the merge, owner sees stale photos in preview and can't verify their changes look right.
supersedes: none
files_affected: ListProperty.tsx previewData builder

## D-124: Admin-only property fields trigger — status removed from guard list (hotfix 2026-07-11)
date: 2026-07-11
phase: 1
category: schema
decision: `prevent_owner_updating_admin_fields()` function's guard list no longer includes `status`. Owners can now transition status through valid Commons flow. Status transitions validated by `enforce_property_owner_transitions_trigger` alphabetically before this trigger.
reasoning: Original PM-era trigger blocked all non-admin status changes. Commons requires owners to submit for review, unlist, re-list, cancel edits. `enforce_property_owner_transitions_trigger` provides layered validation.
supersedes: none
files_affected: prevent_owner_updating_admin_fields function, supabase/migrations/20260711120000_fix_admin_only_property_fields.sql (git-sync)

## D-125: Simplified name/identity model — display_name dropped, use users.full_name
date: 2026-07-12
phase: 1.5
category: profile
decision: `profiles.display_name` and `profiles.is_public` become dead columns. All UI renders `users.full_name` via `getUserDisplayName()`. `public_profiles` view exposes `user_id`, `full_name`, `profile_photo_url`, `bio` (widening).
reasoning: display_name added complexity without solving privacy; users typically share real names in Indian property context; simpler mental model. Bio remains public identity content.
supersedes: D-085 (display_name fallback chain)
files_affected: getUserDisplayName utility, public_profiles view, /me page, /u/:userId page, admin queue name lookup

## D-126: Public identity boundary — full_name public, email + phone always private
date: 2026-07-12
phase: 1.5
category: profile
decision: `public_profiles` view exposes only user_id, full_name, profile_photo_url, bio. Email and phone NEVER exposed via view. Admin queries `users` table directly via `is_admin()` RLS. Contact requests (Phase 3) exchange phone via email, not via profile lookup.
reasoning: Clear public/private boundary. No RLS drift. Phone stays private always. Email only visible to admin for support/investigation.
supersedes: F1 diagnostic Option C
files_affected: public_profiles view, admin listing review queue, admin PropertyEdit

## D-127: Data loss bug root causes — three concurrent issues
date: 2026-07-12
phase: 1.5
category: bug
decision: A3 data loss caused by (1) draft-load useEffect re-firing after `createDraft` mutates `?draft=` param and clobbering local state via `prefillFormFromRow`, (2) auto-save is fire-and-forget with no error toast, (3) available_from Date object should always be serialized as YYYY-MM-DD; defensive normalization added. Fixes applied in ListProperty.tsx + useListingSave.ts.
reasoning: Silent save failures + re-fetch race with just-typed state = data loss. Explicit error surface + latched initial-mount guard = predictable behavior.
supersedes: D-087 (save button behavior — refined with error surfacing)
files_affected: ListProperty.tsx, useListingSave.ts

## D-128: Field spec architecture (Option A) — single source of truth for property fields
date: 2026-07-12
phase: 1.5
category: architecture
decision: `src/config/property-fields.ts` becomes canonical spec for all property fields. Each field defines: key, owner label, admin label, public label, input type, options (with value+label), display formatter, audiences array (owner_form / admin_form / public_detail), editableBy array (owner / admin), section grouping, validation constraints. All three surfaces (ListProperty, admin PropertyEdit, PropertyDetail) refactor to consume spec.
reasoning: 3-way sync bug (I3 diagnostic) systemic — fields drift between surfaces. Rent/sale addition doubles field count and would worsen drift. Spec eliminates drift by design. Adding a field becomes single-file change.
supersedes: I3 diagnostic Option B rejected
files_affected: src/config/property-fields.ts (new), ListProperty.tsx, admin PropertyEdit.tsx, PropertyDetail.tsx

## D-129: audiences array visibility model
date: 2026-07-12
phase: 1.5
category: architecture
decision: Field spec uses `audiences: string[]` array with values from `['owner_form', 'admin_form', 'public_detail']`. Field appears on surface only if surface is in audiences. Empty array = hidden everywhere.
reasoning: Explicit array clearer than boolean flags. Easy to grep. Easy to add new surface (e.g., admin analytics view) without refactoring existing fields.
supersedes: none
files_affected: src/config/property-fields.ts

## D-130: Spec-driven validation — simple constraints in spec, complex in components
date: 2026-07-12
phase: 1.5
category: architecture
decision: Field spec includes `required`, `min`, `max`, `pattern`, `options`. Complex cross-field or custom validation stays in form components.
reasoning: 90% of validation is simple constraints. Spec-driven simple validation is DRY. Complex validation is form-specific.
supersedes: none
files_affected: property-fields.ts, ListProperty.tsx

## D-131: Rent/sale support — same properties table, listing_type discriminator
date: 2026-07-12
phase: 1.5
category: schema
decision: Properties table gains `listing_type` enum (`rent`, `sale`) with default `rent`. New sale-specific columns all nullable. Rental columns remain nullable. Single row can transition between rent/sale (values preserved).
reasoning: Property asset is same regardless of transaction type. Amenities/photos/address common. Same detail page, same admin queue, same search interface with type filter. No table duplication.
supersedes: I4 diagnostic recommendation
files_affected: properties table, listing_type enum, sale columns

## D-132: India-safe sale fields
date: 2026-07-12
phase: 1.5
category: schema
decision: Sale fields: `sale_price` (numeric, required for sale), `price_negotiable` (boolean), `possession_status` (enum: ready_to_move / under_construction / new_launch), `possession_date` (date, nullable), `rera_registration_number` (text, optional but nudged), `khata_type` (enum: A / B / not_applicable), `property_tax_paid_upto` (date, optional). `expected_price_per_sqft` is manual input, not auto-calculated.
reasoning: India market specificity. RERA for new construction, khata for Karnataka clarity, tax receipts for buyer trust. All except sale_price optional.
supersedes: none
files_affected: properties table, sale-related migrations

## D-133: India rental additions
date: 2026-07-12
phase: 1.5
category: schema
decision: New rental fields: `notice_period_months` (number, default 1), `annual_rent_increase_pct` (number, nullable). New location: `landmark` (text, optional). New amenity: water storage (enum: sump_only / overhead_only / both / none) — stored under building amenities.
reasoning: India-specific rental practice. Notice period is standard Indian rental term. Annual rent increase discloses to tenants upfront. Landmark helps navigation.
supersedes: none
files_affected: properties table

## D-134: Parking model — simple counts + notes
date: 2026-07-12
phase: 1.5
category: schema
decision: Add `parking_2w_count` (integer, default 0), `parking_4w_count` (integer, default 0), `parking_notes` (text, nullable). Existing `parking_2w` / `parking_4w` enum type stays.
reasoning: Owner asked for count; shared parking edge case goes into free-text notes. Simple integer, no complex model.
supersedes: none
files_affected: properties table

## D-135: Rent vs sale on public listing — "available from" and "possession from" are separate
date: 2026-07-12
phase: 1.5
category: ux
decision: `available_from` displays as "Available from" in rental section. New `possession_date` displays as "Possession from" in sale section. Two different DB fields, two different labels. No shared field renaming.
reasoning: Different semantic meaning; renaming causes confusion. Separate fields, separate labels, clean rendering.
supersedes: none
files_affected: PropertyDetail.tsx sale section, field spec

## D-136: Annual rent increase — public visibility
date: 2026-07-12
phase: 1.5
category: ux
decision: `annual_rent_increase_pct` displays on public property detail page. Tenants see it before contacting owner.
reasoning: Transparency. Tenants deserve to know 15% annual increase before applying. No owner opt-out.
supersedes: none
files_affected: PropertyDetail.tsx

## D-137: RERA and khata public visibility
date: 2026-07-12
phase: 1.5
category: ux
decision: `rera_registration_number` and `khata_type` display on public sale detail page. Both are public information.
reasoning: Signal to buyers. Khata type is publicly recorded info in Karnataka. RERA is federally mandated for new construction.
supersedes: none
files_affected: PropertyDetail.tsx sale section

## D-138: StatusGuidance component — always visible, not dismissible, soft timing
date: 2026-07-12
phase: 1.5
category: ux
decision: Property management page (Details tab) and ListProperty edit mode both render a `StatusGuidance` component. Not dismissible. Shows full explanation of current status, what happens next, soft timing where applicable ("Usually within 24-48 hours"). Data lives in STATUS_CONFIG[status].guidance in propertyStatus.ts.
reasoning: Owners benefit from re-reading. Prevents "Nothing is happening" support tickets. Soft timing signals expectation without commitment.
supersedes: H3 diagnostic recommendation
files_affected: new StatusGuidance component (Prompt 11), propertyStatus.ts

## D-139: Support email standardized
date: 2026-07-12
phase: 1.5
category: ux
decision: All owner-facing communication references `support@reeve.in`. No other support email variants.
reasoning: Single canonical support address. Owner memorizes one contact point.
supersedes: none
files_affected: StatusGuidance messages, error handlers

## D-140: Rejection persistence — permanent panel, no auto-dismiss
date: 2026-07-12
phase: 1.5
category: ux
decision: Admin rejection reasons displayed as permanent panel on property management page. Not dismissible. Removed only when property is resubmitted (status transitions away from `changes_requested` or `listed`).
reasoning: Owner needs constant reference to feedback while editing. Dismiss-then-hide loses context. Data always in DB; UI matches DB state.
supersedes: D-092 (banner acknowledgment) refined
files_affected: property management page, useOwnerActionAck hook (if any)

## D-141: Acknowledgments scoped to event_id, not property_id
date: 2026-07-12
phase: 1.5
category: schema
decision: `owner_action_acknowledgments.target_id` scopes to specific rejection event (activity_log_id or edit_request_id) instead of property_id. Each new rejection creates new ack row needed.
reasoning: H2 bug — second rejection banner didn't appear because old ack row satisfied query. Event-scoped acks eliminate this bug.
supersedes: D-092 refined
files_affected: owner_action_acknowledgments schema, migration

## D-142: Admin queue full property view + search + audit history
date: 2026-07-12
phase: 1.5
category: ux
decision: (G1) Admin properties page extended with status filter (all statuses including drafts, archived) and search by building name, owner name, owner email, owner phone. (G2) Admin listing review detail shows full property (photos, all fields, description). (G3) New "Decisions" tab in listing reviews for approved/rejected history.
reasoning: Admin quality-check requires seeing everything. Search for support cases. Audit history for accountability.
supersedes: G1/G2/G3 diagnostic recommendations
files_affected: admin properties page, admin listing review detail, admin listing review queue

## D-143: Search rent/sale toggle with URL query param
date: 2026-07-12
phase: 1.5
category: ux
decision: Search page has `[Rent] [Buy]` toggle at top. URL query param `?type=rent` or `?type=sale` persists selection. Session storage remembers last choice as fallback. Default: rent.
reasoning: Familiar UI pattern. Shareable URLs. Session storage removes friction across visits.
supersedes: none
files_affected: Search.tsx

## D-144: Section validation — optional-only sections stay unmarked until touched
date: 2026-07-12
phase: 1.5
category: ux
decision: Sections with no required fields show ⚪ (not started) icon by default. Only turn ✅ (complete) after user opens them or enters any data.
reasoning: A1 diagnostic — sections were showing complete on page load with no user action. Confusing.
supersedes: D-Q9 diagnostic Option D refined
files_affected: ListProperty.tsx section status logic

## D-145: Required section headers show red asterisk
date: 2026-07-12
phase: 1.5
category: ux
decision: Section headers for required sections show `*` suffix in red. Field labels for required fields already show `*` (verify these render correctly).
reasoning: A2 diagnostic — standard convention. Visual signal of what must be filled.
supersedes: none
files_affected: ListProperty.tsx section headers

## D-146: Available_from — allow past dates with immediate warning
date: 2026-07-12
phase: 1.5
category: ux
decision: `available_from` date picker allows past dates. Immediate inline warning when past date selected: "Available from is in the past — is this correct?" Future dates limited to 90 days ahead.
reasoning: Some legitimate cases (vacant unit); block-only is too restrictive; warning prompts owner to confirm.
supersedes: none
files_affected: ListProperty.tsx date picker

## D-147: EV charging in building amenities
date: 2026-07-12
phase: 1.5
category: ux
decision: Add "EV Charging" to BUILDING_AMENITIES constant.
reasoning: India EV adoption growing. Building amenity signal for buyers/renters.
supersedes: none
files_affected: src/config/property-form.ts constants

## D-148: Terms + Privacy checkboxes required in Final Checks
date: 2026-07-12
phase: 1.5
category: ux
decision: Section 9 (Final Checks) requires 3 checkboxes: (1) legal owner/rep consent (existing), (2) agree to Terms of Service (linked to /terms), (3) accept Privacy Policy (linked to /privacy). All 3 must be checked to enable Submit.
reasoning: Legal compliance. Explicit consent. Links help owners find the policies.
supersedes: none
files_affected: ListProperty.tsx Section 9

## D-149: Status labels everywhere — no raw status codes visible to users
date: 2026-07-12
phase: 1.5
category: ux
decision: All UI surfaces use `getStatusDisplay()` from `propertyStatus.ts`. No raw enum values ("pending_review") shown to owners, admins, or public. Public timeline reads structured payload fields, applies STATUS_CONFIG lookup client-side.
reasoning: E1/E2 diagnostic. Enum codes look like debug output.
supersedes: none
files_affected: OwnerDashboard, OwnerPropertyManagement, ListProperty, PublicTimeline, ActivityTimeline

## D-150: Text input focus ring — no clipping
date: 2026-07-12
phase: 1.5
category: ux
decision: Fix CSS overflow on shadcn form field wrappers to prevent focus ring left edge from being clipped.
reasoning: B1 diagnostic — visual bug.
supersedes: none
files_affected: form field wrappers CSS

## D-151: PublicProfile — no self-redirect
date: 2026-07-12
phase: 1.5
category: ux
decision: `/u/:userId` renders public view regardless of viewer identity. Removed the "if userId === current user's id → redirect to /me" logic.
reasoning: F2 diagnostic — self-redirect broke "View my public profile" preview feature. Simpler to always render.
supersedes: none
files_affected: PublicProfile.tsx

## D-152: Phase 1.5 prompt sequence (13 prompts)
date: 2026-07-12
phase: 1.5
category: forward-plan
decision: Phase 1.5 executes in 13 sequential prompts: 1-Emergency (data loss + admin name + commons update), 2-Spec (field spec architecture), 3-Refactor-Owner (ListProperty consumes spec), 4-Refactor-Admin (PropertyEdit consumes spec), 5-Refactor-Detail (PropertyDetail consumes spec), 6-QuickWins (A1, A2, B1, B2, B3, C1, E1, E2, F2, J1), 7-IndiaFields-Schema (parking + India rental), 8-IndiaFields-Wire, 9-RentSale-Schema, 10-RentSale-Wire (spec + surfaces + search filter), 11-Comms (H1, H2, H3, StatusGuidance), 12-Admin-1 (G1), 13-Admin-2+3 (G2 + G3).
reasoning: Sequential enables verification checkpoints. Foundation-first (spec) enables all field additions cleanly.
supersedes: none
files_affected: commons-forward-plan.md

## D-153: Pre-draft field buffering — patch() never drops edits
date: 2026-07-14
phase: 1.5
category: bug
decision: `useListingSave.patch()` buffers field changes even while propertyId is null (pre-draft); the buffer auto-flushes via effect once the draft row exists. All `if (propertyId)` guards on patch() call sites in ListProperty.tsx removed. createDraft's INSERT payload unchanged (threshold fields only) — the post-insert flush carries everything else.
reasoning: TRUE root cause of the recurring "required fields missing" submit failure (misdiagnosed twice as save-failure/poison-loop). Draft INSERT fires only after the Section-4 furnishing threshold; Section-3 fields (security_deposit_amount, available_from) are typed earlier while propertyId is null and were silently discarded by patch()'s early return — and createDraft's INSERT payload omits them. Fill-order dependent, which is why Phase 1 testing passed. Evidence: two production HARs showing draft POST without deposit/available_from and zero subsequent field PATCHes.
supersedes: D-127 (refined — the three original root causes were real but not the submit blocker)
files_affected: src/hooks/useListingSave.ts, src/pages/ListProperty.tsx, src/test/useListingSave.test.ts

## D-154: Save-failure defense stack (poisonedKeys + submit guard)
date: 2026-07-14
phase: 1.5
category: architecture
decision: useListingSave keeps a defense stack for genuine PATCH failures: (1) failed PostgREST snapshots are DROPPED not re-queued (breaks poison loop), (2) failed column names tracked in `poisonedKeys` until a later save with the same column succeeds, (3) every failure console.errors {payload, message, details, hint, code}, (4) failureTick re-fires the toast on identical messages, (5) ListProperty submit blocks when saveState is failed/session_expired, hasPendingChanges(), or poisonedKeys non-empty — toast names the exact columns via DB_COLUMN_TO_SECTION which also flips owning sections to errored.
reasoning: Auto-save failures must never be silent and must never let submit produce the opaque server trigger error. Auth/network failures still re-queue (safe to retry); only schema/enum/CHECK rejections drop.
supersedes: none
files_affected: src/hooks/useListingSave.ts, src/pages/ListProperty.tsx

## D-155: ListProperty scalars driven by PROPERTY_FIELDS via surface-agnostic SpecField
date: 2026-07-14
phase: 1.5
category: architecture
decision: `src/components/property/SpecField.tsx` renders scalar property fields (text/textarea/number/select/switch) driven by `PROPERTY_FIELDS` (D-128). Surface-agnostic: takes a `surface` prop ('owner_form' | 'admin_form' | 'public_detail'), pulls the surface label via `getFieldLabel`, and honors `readOnly` by rendering `formatFieldValue`. Caller owns state, transforms, and side effects — SpecField never imports form hooks or updateField. ListProperty Sections 1, 2, 3, 6, 8 wire scalar fields through it (Prompt 3). JSONB fields (furnishing_detail, amenities), Section 4/5/7, compound inputs (deposit chips, Popover+Calendar date picker, dynamic-placeholder title), Country hardcode, and consent checkbox stay bespoke. Path A/B routing, D-153 buffering, D-154 defense stack all untouched. Overrides prop is small: `helperOverride`, `placeholderOverride` (no labelOverride — spec is canonical). Every helperOverride call site is annotated `// TODO(spec): fold into PROPERTY_FIELDS.<key>.helper in Prompt 6 bundle` so future spec gaps are grep-able. Prompts 4 (admin) and 5 (public detail) must reuse SpecField; do not fork.
reasoning: One spec, three surfaces is the point of D-128/129/130. Wiring the surface prop and readOnly branch now — even though Prompt 3 barely uses them — avoids retrofitting the component in Prompts 4/5. Compound and dynamic-placeholder inputs are correctly bespoke; spec-driving them adds indirection with no reuse benefit.
supersedes: none
files_affected: src/components/property/SpecField.tsx, src/pages/ListProperty.tsx

## D-156: <SpecField> per-surface rendering via audiences + editableBy; admin PropertyEdit scalars refactored
date: 2026-07-14
phase: 1.5
category: architecture
decision: `<SpecField>` renders per-surface using `audiences` (visibility) and `editableBy` (edit permission) from the spec entry. Tier-1 fields render editable when the surface's actor is in `editableBy`; owner surface passes readOnly explicitly for owner-locked-post-listing cases. Admin surface renders every field with `audiences` containing 'admin_form'; new admin-only entries added in Prompt 4 are `legal_owner_name` and `security_deposit_months`. Prompt 4 wires admin PropertyEdit Sections 1, 2, Furnishing scalar, parking, rules (building_rules + building_notes), Description via <SpecField surface="admin_form">. Bespoke stays: publish toggle (Live/Hidden badge treatment), gas_type ("none" sentinel), pet_policy (free-text vs spec's enum — spec-driven select would drop legacy values), available_from Popover+Calendar, Section 7 owner-preferences pill buttons, Section 8 owner-profile TriStateQuestions (not scalar), auto_accept_enabled (derived from ownerWantsControl inverse), Photos. New admin surfaces: state, building_notes, flat_number_revealed, security_deposit_amount all render + save via direct-write payload. Read-only Metadata section added: listed_at, created_at, board_status (edit deferred until spec has curated options). Status remains a display-only badge (no dropdown ever existed — D-110 non-issue here). Direct-write bypass (D-111) untouched. D-124 admin-only-fields trigger cleared automatically via `is_admin()` on admin session.
reasoning: One spec, three surfaces (D-128) requires surface-agnostic rendering. Every spec-vs-form mismatch resolved conservatively: preserve current admin UX unless spec-driven change is a strict superset (e.g., adding surfaced fields). Data-loss-risky changes (pet_policy free-text → enum) deferred with TODO(spec) tags rather than forced through here.
supersedes: none
files_affected: src/pages/admin/PropertyEdit.tsx, src/config/property-fields.ts (added legal_owner_name + security_deposit_months)

## D-157: <SpecField surface="public_detail"> renders readOnly scalar rows; audiences is the single knob
date: 2026-07-14
phase: 1.5
category: architecture
decision: `<SpecField surface="public_detail">` renders the details-grid row DOM (`flex items-start gap-2.5 rounded-lg border border-border bg-card p-3` shell + Lucide icon + label + `formatFieldValue` value) matching PropertyDetail's pre-refactor markup exactly. Icons resolved from `spec.displayIcon` string via `PUBLIC_ICON_REGISTRY` in SpecField (home, maximize, building, layers, droplets, wind, compass, calendar-days, armchair, car, bike, key-round, paw-print — 13 icons registered). Public visibility governed by `audiences` in PROPERTY_FIELDS; grid membership + order by exported `PUBLIC_DETAILS_GRID_KEYS` array. Sensitive fields excluded from `public_detail`: `flat_number` (D-091), `flat_number_revealed`, `board_status`, `auto_accept_enabled`, `owner_*_preference`, `legal_owner_name`, `is_active`, `listed_at`, `created_at`. To add/remove a scalar from the public grid: edit the spec entry's `audiences` + toggle its key in `PUBLIC_DETAILS_GRID_KEYS`. No JSX changes to PropertyDetail. Row visibility guards (`parking_* !== "none"`, truthy vs `!= null`) stay in PropertyDetail — spec governs membership/order/label/icon/formatting, not per-row null semantics.
reasoning: All three surfaces (owner/admin/public) now consume PROPERTY_FIELDS. Icon registry lives in SpecField so spec entries stay import-free. Explicit ordered array (PUBLIC_DETAILS_GRID_KEYS) preserves current page order — differs from implicit spec-section order because the pre-refactor page interleaved fields across sections (bathrooms/balconies between basics and building; parking_4w before parking_2w). Order reconciliation deferred to Prompt 6 QuickWins bundle.
supersedes: none (extends D-155, D-156)
files_affected: src/components/property/SpecField.tsx (public_detail branch + icon registry), src/pages/PropertyDetail.tsx (scalar row loop), src/config/property-fields.ts (displayIcon on 13 fields, main_door_lock_type added, building_age_years formatter updated to "~N yrs", PUBLIC_DETAILS_GRID_KEYS export)

## D-158: Prompt 6 quick wins bundle
date: 2026-07-14
phase: 1.5
category: ux
decision: Phase 1.5 Prompt 6 landed 8 fixes (E1 no-op — owner surfaces already routed through getStatusDisplay in Prompts 3–5). E2: PublicTimeline reads `payload.from_status`/`to_status` and renders "Draft → Under review" via `getStatusDisplay(...).label`, falling back to `payload.summary` then action-hardcoded string. A1 (D-144): optional-only sections 5/6/8 stay ⚪ until user opens them (tracked in `openedSections` set, seeded with 1 on mount) OR any field becomes truthy. A2: red asterisks via `<span className="text-destructive">*</span>` on the 5 required section headers (1/2/3/7/9) via new `SectionShell.required` prop; `<SpecField surface="owner_form">` adds a red span when `field.requiredOwner` — admin/public branches unchanged; label prop widened to `React.ReactNode` on both `Shell` and `FormField`. B3 (D-146): `available_from` picker now `disabled` for dates > today + 90 days and shows `text-amber-600` warning "Available from is in the past — is this correct?" whenever selected date is before today. J1 (D-148): Section 9 now has 2 checkboxes — legal-owner consent (existing) + Terms/Privacy consent (new `form.terms_privacy_consent` — links open in new tab). Both must be checked to enable Submit; `isSectionTouched(9)` uses OR (either), `isSectionComplete(9)` uses AND (both). F2 (D-151): removed the `/u/:userId → /me` self-redirect useEffect from `PublicProfile.tsx`; PostHog `commons_profile_viewed` now emits with `self: user.id === userId`. B1: AccordionContent gets `px-1` inside `SectionShell` so focus rings on inputs don't clip at the left edge of Radix's overflow-hidden animation container. B2: `EV Charging` (value `ev_charging`) appended to `BUILDING_AMENITIES` in `property-form.ts`. Discrepancy note: prompt title mentioned "3-checkbox pattern" but the Fix instruction specified only 2 (existing + Terms/Privacy) — implemented 2 per Fix text.
reasoning: Each fix is small and independent; bundling saves context churn. E1 checked live and required no changes — owner surfaces were already routed correctly by Prompt 3/5's SpecField work.
supersedes: none (extends D-144, D-146, D-148, D-151)
files_affected: src/pages/ListProperty.tsx, src/pages/PublicProfile.tsx, src/components/property-detail/PublicTimeline.tsx, src/components/property/SpecField.tsx, src/config/property-form.ts

## D-159: India fields wired end-to-end via spec + <SpecField>
date: 2026-07-14
phase: 1.5
category: architecture
decision: 7 columns from Prompt 7 (`landmark`, `notice_period_months`, `annual_rent_increase_pct`, `water_storage`, `parking_2w_count`, `parking_4w_count`, `parking_notes`) now render via `PROPERTY_FIELDS` + `<SpecField>` across all three surfaces. `parking_2w_count` / `parking_4w_count` have `audiences: ['owner_form','admin_form']` only — public renders a compound `"{enum} · {count} slots"` row via a bespoke formatter in PropertyDetail (both enum and count needed on one row, which SpecField can't emit natively since it maps one field per row). `landmark` renders spec-driven on owner/admin forms and as a bespoke `"Near {landmark}"` subtitle inside PropertyDetail's Location block (not in the details grid). `water_storage`, `notice_period_months`, `annual_rent_increase_pct`, `parking_notes` render in the details grid via `PUBLIC_DETAILS_GRID_KEYS`; parking_2w/4w keys removed from that array (replaced by the compound rows). `annual_rent_increase_pct` public formatter: `${v}% annually`; always public per D-136. `notice_period_months` has no `visibleWhen` in Prompt 8 — Prompt 10 adds `visibleWhen: (v) => v.listing_type === 'rent'` when listing_type ships (TODO tag in spec entry). SpecField unchanged — did not need to grow visibleWhen support for this prompt.
reasoning: Same spec/audiences/editableBy pattern established by D-155/156/157. New bespoke sites limited to two concrete design constraints (compound parking display, subtitle-position landmark); every other field routes through the spec.
supersedes: none (extends D-155, D-156, D-157)
files_affected: src/config/property-fields.ts, src/pages/ListProperty.tsx, src/pages/admin/PropertyEdit.tsx, src/pages/PropertyDetail.tsx, src/test/property-fields.test.ts

## D-160: enforce_property_owner_transitions trigger blocks sale submissions until Prompt 10 branches it
date: 2026-07-14
phase: 1.5
category: schema
decision: The `enforce_property_owner_transitions` trigger's `pending_review` submit gate hardcodes 7 rent-only required fields (`locality`, `building_name`, `bhk`, `listed_rent`, `security_deposit_amount`, `furnishing`, `available_from`) via `IS NULL` checks in `supabase/migrations/20260710120600_add_commons_rls_and_triggers.sql:229-247`. Sale listings will fail this gate on submit because `listed_rent`, `security_deposit_amount`, `furnishing`, and `available_from` are rent-only concepts. Prompt 10 MUST update this trigger to branch on `NEW.listing_type`: for `'sale'`, required fields become `locality`, `building_name`, `bhk`, `sale_price`, `possession_status` (plus `possession_date` when `possession_status = 'under_construction'`). Status flow is otherwise identical for rent and sale (same enum values, same 14 transitions). Also review the `unlisted` edit-lock block (same file, L253-269): it currently references rent-only fields (`listed_rent`, `security_deposit_*`, `available_from`) — Prompt 10 must add a matching sale-field branch (`sale_price`, `possession_status`, `possession_date`, `rera_registration_number`, `khata_type`, `property_tax_paid_upto`) or the block becomes a no-op for sale listings.
reasoning: Trigger was written pre-D-131 (single-table rent+sale model). Branching on listing_type is the minimal, backward-compatible fix. Alternative — dropping the trigger and delegating to spec-driven validation — would leak client-side gating into the DB, so keep the trigger and branch it.
supersedes: none
files_affected: supabase/migrations/20260710120600_add_commons_rls_and_triggers.sql (Prompt 10 target — new migration or MCP DDL)

## D-161: Rent/sale wired on owner form (Prompt 10a); SpecField honors visibleWhen
date: 2026-07-14
phase: 1.5
category: architecture
decision: `<SpecField>` now honors `visibleWhen(formValues)` — callers pass `formValues` prop; SpecField returns null when the predicate is false. Fail-safe: undefined `formValues` + defined `visibleWhen` renders the field (with a one-shot DEV console.warn). 9 new spec entries: `listing_type` (Tier-1 locked, required, options rent/sale — placed at top of PROPERTY_FIELDS) + 8 sale fields (`sale_price` required, `possession_status` required, `possession_date` with `visibleWhen: (v) => v.possession_status === 'under_construction'`, `price_negotiable` switch, `expected_price_per_sqft` number, `rera_registration_number` text, `khata_type` select A/B/N/A, `property_tax_paid_upto` date). Activated on 2 existing entries: `notice_period_months` and `annual_rent_increase_pct` gain `visibleWhen: (v) => v.listing_type !== 'sale'` — TODO(P10) tags removed. On the owner form: `listing_type` renders as a top-of-form `<SpecField>` above the accordion, `readOnly` when entryStatus ≠ create/draft/changes_requested (Tier-1 lock). Section 3 slot is dual-mode: title/body/completion criteria switch on `form.listing_type` — Sale body renders sale_price + expected_price/sqft + price_negotiable + possession_status + conditional Popover-Calendar for possession_date (bespoke, mirrors SpecField's spec-level visibleWhen since compound Popover isn't spec-emittable) + rera + khata + Popover-Calendar for property_tax_paid_upto (bespoke, spec input='date' but no compound picker in SpecField). Rent body preserved byte-identically. `DB_COLUMN_TO_SECTION` maps all 9 new fields to section 3. `mapFieldToDb` extended for 8 non-date fields; the 2 date fields (possession_date, property_tax_paid_upto) use explicit `dbPatch` from the Calendar handler. Trigger already branched per D-160 via MCP — do NOT modify. Admin form + public detail + search filter + card badges deferred to Prompt 10b.
reasoning: `visibleWhen` wire is a small change unlocked by every field with a conditional visibility contract (D-146 gas_type had it declared but SpecField ignored it). Sale-section-in-Section-3-slot preserves accordion structure and doesn't need a new SectionNum. Tier-1 lock done at the caller (readOnly prop) rather than deriving from spec.tier — matches how existing Tier-1 fields work; a global mechanism can land later without spec migration.
supersedes: D-159 (Prompt 8 TODO(P10) tags now activated)
files_affected: src/config/property-fields.ts, src/components/property/SpecField.tsx, src/pages/ListProperty.tsx, src/test/property-fields.test.ts

## D-162: Rent/sale wire complete (Prompt 10b) — admin + public + search + card badges
date: 2026-07-14
phase: 1.5
category: architecture
decision: Admin `PropertyEdit` mirrors owner form's dual-mode: `listing_type` `<SpecField>` above Listing Details (admin can flip any time — no Tier-1 lock, D-111 bypass covers it); rent-only fields wrapped in `{listingType !== 'sale' && ...}`, sale-only block gated on `=== 'sale'` with 8 spec-driven fields + bespoke Popover-Calendar for possession_date (conditional on under_construction) and property_tax_paid_upto. Hydration + save payload extended for all 9 rent/sale columns. Public `PropertyDetail` prominent price block is now a ternary on `property.listing_type`: rent renders the pre-refactor Rent & Fees Card; sale renders a mirror-weight Sale Price Card (`₹{sale_price}` bold + `Negotiable` chip when true + `Expected ₹{expected_price_per_sqft}/sqft` secondary). `PUBLIC_DETAILS_GRID_KEYS` extended with 5 sale-side rows (`possession_status`, `possession_date`, `rera_registration_number`, `khata_type`, `property_tax_paid_upto`); `sale_price`, `price_negotiable`, `expected_price_per_sqft` stay bespoke in the prominent price block, deliberately excluded from grid. Grid `<SpecField>` calls now pass `formValues={propertyRow}` so spec-declared `visibleWhen` predicates (possession_date hidden unless under_construction) evaluate. Search page: `[For Rent] [For Sale]` toggle (URL `?type=` > sessionStorage `search_listing_type` > default `rent`) + `.eq('listing_type', listingType)` filter + rent-only budget filter skipped when `listingType === 'sale'` (prevents `.gte('listed_rent', ...)` from excluding sale rows). SELECT extended to fetch `listing_type, sale_price, possession_status`. Owner dashboard `PropertyCard`: muted "For Rent"/"For Sale" chip next to title, sits alongside status badge without competing. Admin queue `QueueRow`: same chip in the badges row (first, before rent/timestamp badges). Both queue SELECTs extended with `listing_type`. Fail-safe pattern (D-161 continuation): all rendering predicates use `!== 'sale'` semantics so legacy rows with null listing_type render as rent. Admin PropertyEdit gained a runtime-shape-preserving `data as unknown as PropertyData` cast to sidestep Supabase's SelectQueryError inference cascade (surgical, no runtime effect — cleaned up 55 pre-existing baseline errors as a side benefit).
reasoning: Dual-mode ternary on `listing_type` per surface keeps the diff small and preserves rent path byte-identical. `PUBLIC_DETAILS_GRID_KEYS` extension is the same single-knob pattern from D-157. Chip UX on cards: muted so status stays primary; consistent visual weight across owner-dashboard and admin-queue.
supersedes: none (extends D-160, D-161)
files_affected: src/config/property-fields.ts (PUBLIC_DETAILS_GRID_KEYS only), src/pages/admin/PropertyEdit.tsx, src/pages/PropertyDetail.tsx, src/pages/Search.tsx, src/pages/OwnerDashboard.tsx, src/components/owner-dashboard/PropertyCard.tsx, src/pages/admin/ListingReviewQueue.tsx, src/test/property-fields.test.ts

## D-163: Communications shipped (H1/H2/H3, Prompt 11)
date: 2026-07-14
phase: 1.5
category: architecture
decision: New RPC `reject_property_listing(p_property_id uuid, p_reason text, p_reason_text text DEFAULT NULL) RETURNS void` (admin-only, applied via MCP) transitions `pending_review → changes_requested` and writes a `listing_rejected` entry to `property_activity_log` atomically. Mirrors `reject_edit_request`. The `property_activity_log_writer` trigger now skips its automatic log write when `NEW.status = 'changes_requested'` — the RPC owns that entry (no double-log). `owner_action_acknowledgments` gained `activity_log_id uuid FK → property_activity_log(id) ON DELETE CASCADE`; the old unique constraint on `(user_id, target_type, target_id)` was replaced with unique index `(user_id, target_type, target_id, activity_log_id) NULLS NOT DISTINCT` — enables per-rejection ack tracking (D-141). New shared components `src/components/property-management/RejectionPanel.tsx` (H1/H2) and `src/components/property-management/StatusGuidance.tsx` (H3) replace the inline ack banner logic previously in ListProperty and OwnerPropertyManagement. RejectionPanel fetches the latest `listing_rejected|edit_rejected` log row for a property, checks acks scoped to that specific `activity_log_id`, renders an amber panel with reason + reason_text + `mailto:support@reeve.in` link, and upserts a scoped ack on "Got it" via `.upsert(..., { onConflict: "user_id,target_type,target_id,activity_log_id" })`. StatusGuidance renders `STATUS_CONFIG[status].guidance` (populated in Phase 1.5 Prompt 1 per D-138) inside a muted neutral card. Placements: RejectionPanel + StatusGuidance both mount on OwnerPropertyManagement Details tab (above field sections) and on ListProperty in edit mode (above the accordion). Admin `ListingReviewDetail.requestChangesOnNewListing` swapped from the two-step D-118 UPDATE+INSERT to the RPC. Support email verified `support@reeve.in` throughout (D-139) — no hygiene fixes needed.
reasoning: Consolidating rejection UI into one component eliminates two divergent inline implementations (one in ListProperty, one in OwnerPropertyManagement) and fixes D-141 in a single place. Scoping acks by `activity_log_id` with `NULLS NOT DISTINCT` matches the "second rejection reappears" semantic exactly; NULLS NOT DISTINCT means retries on the same log entry stay idempotent. Trigger skip-on-changes_requested prevents the RPC + trigger from both writing a log row.
supersedes: D-140 (banner semantic clarified: panel visibility = "latest log > latest ack for that log"; not just "status = changes_requested"); D-141 (implementation landed)
files_affected: src/components/property-management/RejectionPanel.tsx (new), src/components/property-management/StatusGuidance.tsx (new), src/pages/OwnerPropertyManagement.tsx, src/pages/ListProperty.tsx, src/pages/admin/ListingReviewDetail.tsx, src/integrations/supabase/types.ts (regen), src/test/rejection-panel.test.tsx (new)

## D-164: Admin /admin/properties gained filter, search, owner column, delete-draft, restore-archived (Prompt 12)
date: 2026-07-14
phase: 1.5
category: architecture
decision: Extended `src/pages/admin/Properties.tsx` with (1) status filter Select — 8 Commons options + "Legacy PM" grouping (`inspection_proposed|inspection_accepted|inspection_scheduled|inspected|agreement_pending|occupied|off_market|expiring|turnover|inactive`), (2) case-insensitive substring search over `building_name`, `owner.full_name`, `owner.email`, `owner.phone` (client-side after 300ms debounce; server-side filter deferred until dataset warrants it), (3) URL param persistence (`?status=`, `?q=`) written on change via `setSearchParams({ replace: true })`, (4) `Owner` column reads from existing `owner:users!properties_owner_id_fkey(...)` join — extended to also fetch `email` and `phone` for the search index; visible cell shows only `full_name` (fallback "—") per D-091 privacy. Two new row actions gated by status: `Delete draft` (destructive, visible when status='draft') → shadcn AlertDialog → `supabase.rpc('admin_delete_draft_property', {...})` — RPC pre-checks for referencing applications/visits and surfaces Postgres RAISE messages via toast; CASCADE handles `property_images` / `property_activity_log` / `property_edit_requests` / `property_inspections` / `favourites` / `inspection_callbacks`. `Restore` (secondary, visible when status='archived') → AlertDialog → direct `.update({ status: 'unlisted' })` — admin bypasses `enforce_property_owner_transitions`, `property_activity_log_writer` records the transition. Search logic extracted as pure `filterPropertiesBySearch()` exported from the module for test coverage. Existing edit-navigation preserved: the row's outer `<div role="button">` navigates to `/admin/properties/:id`; action buttons `stopPropagation()` so their clicks don't bubble. Server-side status filter (`.eq` or `.in`) keeps the fetched result set narrow; search runs on top of that in-memory.
reasoning: Client-side search is honest about admin dataset size (<10k rows for the foreseeable future); switching to server-side ILIKE across the `users` join is complex and not warranted yet. `filterPropertiesBySearch` as a pure export gives us testable coverage without Radix/jsdom scaffolding. Row-as-div-with-role="button" pattern sidesteps nested-button DOM violations while preserving keyboard nav.
supersedes: none
files_affected: src/pages/admin/Properties.tsx, src/integrations/supabase/types.ts (regen — picks up admin_delete_draft_property + all prior pending regens from Prompts 7/9/11), src/test/admin-properties.test.ts (new)

## D-165: Phase 1.5 final — G2 full property view + G3 Decisions audit tab (Prompt 13)
date: 2026-07-14
phase: 1.5
category: architecture
decision: **G2** — `src/pages/admin/ListingReviewDetail.tsx` property snapshot expanded from ~12 fields to the full spec surface: `PropertyRow` interface extended with `flat_number` + all 7 Prompt-8 India columns + all 9 Prompt-10 rent/sale columns; snapshot section now renders an admin-only amber `Flat number` line at top (D-091 held via `audiences: ['admin_form']` — spec never adds `public_detail` for that field), a listing-type chip (Prompt 10b parity), a listing-type-conditional pricing block (Rent & Deposit for rent + legacy null; Sale Details for sale, with `possession_date` conditional on `possession_status='under_construction'`), a Building & Society block covering parking enum+count compound + water_storage + parking_notes, and the existing title/description/pet_policy/rules/notes sections. The pre-Prompt-13 3-column diff view was replaced with `<EditRequestDiff label proposedValue liveValue />` — new `src/components/property-management/EditRequestDiff.tsx` renders the proposed value with a `Currently live:` subtitle matching the D-093 curated-events copy (same visual pattern the owner sees in `OwnerPropertyManagement.FieldRow`). Approve/Reject actions preserved (Prompt-11 RPCs unchanged).

**G3** — New third tab "Decisions" on `/admin/listing-reviews` (`TabsList` now `grid-cols-3`, `TabValue` widened to `"new" | "edit" | "decisions"`, URL param `?tab=decisions` supported). New component `src/components/admin/DecisionsTab.tsx` fires TWO separate queries and merges client-side: `property_activity_log` filtered on `action IN ('listing_approved','listing_rejected')` + `property_edit_requests` filtered on `status IN ('approved','rejected','withdrawn','superseded')`. **Never UNION** — edit decisions live only in `property_edit_requests`; the trigger's writer path was already suppressed for edit-approved/rejected in earlier prompts, but the spec calls out NEVER pulling edit_* actions from `property_activity_log` here to future-proof against trigger-writer changes. Bulk photo prefetch keyed by `property_id` (single query, same pattern as other admin surfaces). Row click routes to `/owner-dashboard/property/:id` (no separate admin decision-detail page). Filters (all URL-persistent, all combinable): decision-type multi-select via checkboxes (defaults to All; auto-restore to All when user clears everything), From/To date range (`type="date"` inputs, filters effective timestamp), single-select Admin actor dropdown built from distinct actors in the fetched set, single-select City dropdown same. Effective timestamp: `reviewed_at ?? created_at` (withdrawn/superseded rows are frequently null on reviewed_at). Legacy-data resilience: null `payload.reason` on pre-Prompt-11 `listing_rejected` rows → reason cell shows "—" (no crash); null `reviewed_by` on withdrawn/superseded → actor cell shows "Owner" for withdrawn, "—" for superseded; rows where the `properties` join returned null (property hard-deleted via Prompt 12 RPC) are filtered out client-side. `mergeDecisionRows` exported as pure fn for test coverage. Per-row subtitle `Currently: {getStatusDisplay(row.property.status).label}` so admins see historical decision vs present state (a listing approved months ago might now be archived — the subtitle answers "what happened next?").
reasoning: G2's incremental enhancement of the existing summary section (vs swap for PropertyPreview modal) preserves the admin-review workflow byte-identical for approve/reject actions while landing all India + rent/sale visibility. Diff extraction into `EditRequestDiff` unifies the "Currently live:" pattern across surfaces without touching `OwnerPropertyManagement.FieldRow` (which has extra knobs — `pending` toggle, empty-render suppression — not needed on the admin side). G3's two-query-never-UNION shape is the spec's explicit anti-pattern; documenting it in the decision so future work doesn't consolidate to a UNION as an "optimization." Client-side filter + sort is honest about admin dataset size and matches the D-164 admin-properties pattern.
supersedes: none (extends D-091, D-093, D-140/141, D-155–164)
files_affected: src/components/property-management/EditRequestDiff.tsx (new), src/components/admin/DecisionsTab.tsx (new), src/pages/admin/ListingReviewDetail.tsx, src/pages/admin/ListingReviewQueue.tsx (3rd tab), src/test/decisions-tab.test.ts (new)

## D-166: Phase 1.5 addendum — move-in charges + brokerage wired end-to-end
date: 2026-07-14
phase: 1.5
category: architecture
decision: Four new nullable columns on `properties` (applied via MCP before this prompt): `move_in_charges_amount numeric CHECK >= 0`, `rent_brokerage_type text CHECK IN ('none','fixed','months')`, `rent_brokerage_amount numeric CHECK >= 0` (semantically overloaded — rupees when type='fixed', month-count when type='months', ignored when 'none'/null), `sale_brokerage_pct numeric CHECK 0–10`. All optional; all 20 existing rows have NULL. Four spec entries added to `src/config/property-fields.ts` with `visibleWhen` gates: rent-side use `!== 'sale'` (fail-safe pattern per D-161); `rent_brokerage_amount` uses a compound predicate reading both `listing_type` and `rent_brokerage_type` (SpecField's Prompt-10a signature already handles arbitrary predicates); `sale_brokerage_pct` uses strict `=== 'sale'` (safe because sale is opt-in — no legacy null-listing_type rows are sale). `rent_brokerage_amount` label is static `'Brokerage amount'` in spec (used by admin surface); the owner form renders this input BESPOKE with a dynamic label that flips between `'Amount (₹)'` and `'Number of months'` based on the sibling `rent_brokerage_type` — SpecField's label mechanism doesn't support dynamic values (D-155 rejected `labelOverride`), and the semantic overload is enough of a special case that bespoke is cleaner than extending the primitive. Owner form Section 3 gains a `"One-time charges"` sub-heading (`col-span-2 mt-2 pt-2 border-t`) above move-in + brokerage to prevent a wall-of-inputs feel (rent mode now hits 10 fields). Public rendering is BESPOKE inside the existing Rent & Fees Card (move-in row + brokerage row) and Sale Price Card (brokerage row) — NOT added to `PUBLIC_DETAILS_GRID_KEYS`. Same rationale as `sale_price`/`price_negotiable`/`expected_price_per_sqft` per D-162: cost/transaction fields belong in the prominent price block, not the facts grid. Public brokerage formatter follows the compound-parking pattern (D-159 bespoke): `₹{amount}` for fixed, `{amount} month(s) rent` for months (respects singular/plural), `As applicable` when type is set but amount is null (defensive — shouldn't happen normally). Admin PropertyEdit surface gets all 4 fields via `<SpecField surface="admin_form">` in analogous positions with static labels (admin knows what "amount" means in context). D-153/154 buffering, D-160 trigger (unchanged — none of the 4 are required for submit), D-111 admin bypass, D-091 flat_number invariant all preserved.
reasoning: Two-column split (matching security_deposit_amount + security_deposit_months) was considered but adds an axis to the schema without a matching UX benefit — the type toggle is a single mental control. Semantic-overload trade-off documented; the wire prompt calls out that Phase 2+ filtering (e.g., "properties with < 1-month brokerage") would need extraction. `visibleWhen` compound predicate landed with zero SpecField changes — validation of D-161's architectural bet. Bespoke owner amount input keeps the primitive focused; extending SpecField with a dynamic-label knob would leak per-field logic into the shared component. Bespoke public rendering in the price Card matches Prompt-10b's D-162 boundary — grid is for scannable facts, cards are for transaction context.
supersedes: none (extends D-131, D-136, D-153/154, D-155–165)
files_affected: src/config/property-fields.ts, src/pages/ListProperty.tsx, src/pages/admin/PropertyEdit.tsx, src/pages/PropertyDetail.tsx, src/integrations/supabase/types.ts (regen), src/test/property-fields.test.ts

## D-167: Sync Prompt 1 — public deposit fix, cover auto-select, audience corrections
date: 2026-07-14
phase: 1.5
category: bug
decision: Public deposit display on `PropertyDetail.tsx` now prefers the owner-entered `security_deposit_amount` when set; falls back to `security_deposit_months × listed_rent` when amount is null and months is set; falls back to `2 × listed_rent` when both are null (preserves prior implicit default). Rendering: `"₹{amount} ({months} months)"` when both set (months as context), `"₹{amount}"` when amount only, `"₹{computed}"` in fallback branches (silent — no "(computed)" annotation). Extracted as exported pure `formatDeposit(amount, months, rent)` helper on `PropertyDetail.tsx` for test coverage. Two render sites updated: the main rent Card row (line 1088) and the sidebar aside inside `{COMMONS_HIDE && ...}` (line 1356) — kept in sync even though the sidebar is currently gated off. Prior stale const `depositAmount = listed_rent * security_deposit_months` replaced with `depositDisplay = formatDeposit(...)` (bugfix: prior const produced NaN on legacy rows where `security_deposit_months` was null despite the type saying NOT NULL).

Cover image auto-select: new helper `src/lib/property-images.ts:ensurePrimaryPhoto(propertyId, uploadedImageId)` reads existing primaries, no-ops if any exist, else `UPDATE property_images SET is_primary = true WHERE id = uploadedImageId`. Called after successful upload in both `ListProperty.tsx` (both Path A and Path B — helper no-ops on edit_pending_review properties that already have a primary) and admin `PropertyEdit.tsx`. Client-side `prevHadPrimary` snapshot mirrors the DB flip into local state so the "Cover" badge appears immediately. Race trade-off: two concurrent uploads on a zero-primary property could both self-promote; benign — owner manually resolves via "★ Cover".

Audience corrections in `src/config/property-fields.ts`:
- `security_deposit_months` audiences widened from `['admin_form']` to `['owner_form', 'admin_form', 'public_detail']`; `editableBy` widened to `['owner', 'admin']`; added `ownerSection: 'rent_deposit'` to satisfy `validateSpec`. Matches actual usage (chips indirectly reference; public deposit fallback reads).
- `state` + `pincode` audiences narrowed from `[…, 'public_detail']` to `['owner_form', 'admin_form']`. `// TODO(P2)` tag added on each — re-add `public_detail` if a search filter or address-line render lands.

Public `property_type` render at `PropertyDetail.tsx:955` now maps through `PROPERTY_TYPE_OPTIONS.find(o => o.value === property.property_type)?.label ?? property.property_type` for the display label ("Apartment" instead of "apartment"). Fallback to raw value is defensive against enum drift.

Data migration (applied via MCP before this prompt): 2 legacy `pet_policy` free-text rows mapped to canonical enum — `"No Pets Allowed"` → `not_allowed`, `"Pets Allowed"` → `all_welcome`.
reasoning: All 5 fixes were surface bugs — small edits, all client-side, no schema. Extracting `formatDeposit` and `ensurePrimaryPhoto` as testable/reusable primitives keeps future date-picker consolidation (Prompt 2) and other sync work simpler.
supersedes: none (extends D-131 deposit semantics, D-091/158 audience contract)
files_affected: src/pages/PropertyDetail.tsx, src/pages/ListProperty.tsx, src/pages/admin/PropertyEdit.tsx, src/config/property-fields.ts, src/lib/property-images.ts (new), src/test/format-deposit.test.ts (new), src/test/property-fields.test.ts

## D-168: Sync Prompt 2 — SpecField input='date' branch + 6 bespoke blocks removed
date: 2026-07-14
phase: 1.5
category: refactor
decision: `<SpecField>` gained an `input: 'date'` branch that renders shadcn `<Popover>` + `<Calendar>` with per-field options driven by spec metadata. New spec field `datePickerOptions?: { warnOnPast?: string; maxDaysFromNow?: number }` on `PropertyFieldSpec`. Empty `datePickerOptions: {}` marks a field as date-picker with no special constraints; presence of the key is the discriminator (no separate flag). Value contract: accepts `Date | ISO string | null | undefined` via internal `coerceDate()` normalizer; emits ISO `yyyy-MM-dd` string (or null) on selection. Since owner + admin callers hold `Date` in local state, callsites cast `value={x as unknown}` and `onChange={((iso) => …) as (v: unknown) => void}` to satisfy the generic `T` — accepted trade-off vs. widening the SpecField props to decouple value in/out types (more surface for one field type).

Read-only branch (public_detail + owner/admin Tier-1-locked): for date fields, formats via `format(new Date(value), "dd MMM yyyy")` regardless of `field.display` — public rows show `15 Jul 2026`, not the raw ISO. Empty/null falls through to `formatFieldValue`'s em-dash to keep row structure consistent with sibling grid cells.

All 3 date fields spec-driven: `available_from` (owner + admin) with `warnOnPast: "Available from is in the past — is this correct?"` + `maxDaysFromNow: 90` (D-146 preserved verbatim); `possession_date` with empty options (visibleWhen `possession_status === 'under_construction'` unchanged); `property_tax_paid_upto` with empty options. 6 bespoke Popover+Calendar blocks removed — 3 on owner (`ListProperty.tsx`), 3 on admin (`admin/PropertyEdit.tsx`). Unused imports swept: `Popover*`, `Calendar`, `CalendarIcon` removed from both files (still used elsewhere via SpecField).

Deliberate behavior addition on admin: `available_from` now shows the amber past-date warning + enforces the 90-day future cap. Previously admin had neither. Justification: the spec is the single source of truth; if the rule applies to the field, it applies everywhere the field renders. Admins can still pick past dates (warning, not block).

Amber warning threshold: `isPastDate` compares picked date < today at midnight; today itself is not flagged.
reasoning: 6 near-duplicate blocks was the largest remaining spec-fragmentation site. Consolidating via `datePickerOptions` keeps the pattern in the same shape as future compound inputs (e.g., number-with-suffix) — add a spec key, add a switch branch, replace callsites. Admin/owner parity on the warning is a free win from the refactor.
supersedes: (extends D-155/156/157 spec-driven surface contract; consolidates D-146 into datePickerOptions)
files_affected: src/components/property/SpecField.tsx, src/config/property-fields.ts, src/pages/ListProperty.tsx, src/pages/admin/PropertyEdit.tsx, src/test/property-fields.test.ts

## D-169: Sync Prompt 3 — brokerage column split, gas_type None option, pet_policy admin migrated
date: 2026-07-14
phase: 1.5
category: schema+refactor
decision: `rent_brokerage_amount` (semantically overloaded — rupees when `rent_brokerage_type='fixed'`, month count when `='months'`) dropped from `properties` and replaced with two typed columns via MCP:
- `rent_brokerage_fixed_amount numeric` — rupees, populated when type=fixed
- `rent_brokerage_months numeric` — month count, populated when type=months

Zero rows had data in the old column at cutover — no backfill needed. Matches the `security_deposit_amount` + `security_deposit_months` precedent (D-131). Spec entry replaced with two entries; each carries a fail-safe `visibleWhen` (`listing_type !== 'sale'` per D-161 + strict type match). Owner form + admin form each render both `<SpecField>` entries; only the one matching the current `rent_brokerage_type` renders (spec `visibleWhen` gates). No bespoke dynamic-label input remains on owner form.

Public detail: dropped the old "As applicable" fallback (dead code — was only reachable when type was set but amount was null; now impossible via the split — each column is only meaningful for one type). Renders "Brokerage ₹{n}" when type=fixed + fixed_amount set; "Brokerage {n} month(s) rent" when type=months + months set; hides otherwise.

`gas_type`: spec option list extended with `{value:'none', label:'None'}` at the head. Caller-side transform on both surfaces: `value = form.gas_type || 'none'` for display; `onChange` writes NULL when value is 'none' (owner routes via `updateField('gas_type', '', { gas_type: null })` — mapFieldToDb also maps "" → null; admin routes via existing handleSave payload `gas_type === 'none' ? null : gasType`). DB CHECK unchanged (allows `pipeline | cylinder | NULL`). No new enum value at the DB layer. Bespoke admin gas_type select (with hardcoded 'Not specified' sentinel) replaced with `<SpecField>` — the spec's 'None' label now supersedes the old sentinel copy.

`pet_policy`: admin was bespoke free-text `<Input>` with `TODO(spec)` marker — legacy free-text values blocked migration. Sync P1 MCP step normalized 2 non-canonical values ("No Pets Allowed" → not_allowed, "Pets Allowed" → all_welcome). All 20 rows now match the 4 canonical enum options, so admin swapped to `<SpecField>` select. Owner form was already spec-driven — no change.

Types.ts regenerated via MCP; old `rent_brokerage_amount` gone from Row/Insert/Update. `grep rent_brokerage_amount src/` returns only the two spec comments/test assertions confirming removal.

Not touched: D-091 flat_number boundary, D-111 admin direct-write, D-153/154 defense stack, D-160 trigger, D-168 date branch, `PUBLIC_DETAILS_GRID_KEYS` (brokerage stays bespoke in rent Card), migrations (schema applied via MCP), RLS, RPCs, JSONB editors, dates.
reasoning: Overloaded single column meant every reader had to branch on type to know the unit — bug-prone and impossible to add validation to (min/max means different things per type). Split matches the deposit precedent (D-131) and lets each column carry its own semantic. Gas 'None' option removes the "why do I have to pick when I said gas isn't included?" edge — matches admin's existing sentinel pattern. Pet_policy admin migration was gated on the data cleanup (P1), now unblocked.
supersedes: (retires the overloaded `rent_brokerage_amount` semantics from D-166; keeps other D-166 columns intact)
files_affected: src/integrations/supabase/types.ts, src/config/property-fields.ts, src/pages/ListProperty.tsx, src/pages/admin/PropertyEdit.tsx, src/pages/PropertyDetail.tsx, src/test/property-fields.test.ts

## D-170: Sync Prompt 4 — shared JSONB editors + owner state canonicalization
date: 2026-07-14
phase: 1.5
category: refactor
decision: Two shared editors extracted at `src/components/property/`:
- `<FurnishingEditor value={FurnishingDetailItem[]} onChange>` — owns canonical/custom toggle, per-item count/size/rooms inputs, custom item add/edit/delete
- `<AmenitiesEditor value={string[]} onChange>` — canonical BUILDING_AMENITIES checkbox grid + custom items (non-canonical strings in same flat array) as editable list

Both surfaces (owner ListProperty + admin PropertyEdit) consume the same components. No `surface` prop — the components are truly shared with no branching. Owner wires via `onChange → setForm + patch()` (D-153 buffer path); admin wires via `onChange → setState → handleSave`. Custom furnishing items (`custom: true`) and non-canonical amenity strings are editable on both surfaces — admin previously had NO custom-items UI at all; that gap is closed.

**Owner state migrated to JSONB shape** (breaking change to `FormState`):
- Removed: `furnishing_items: string[]`, `furnishing_counts: Record<string, number>`, `furnishing_sizes: Record<string, string>`, `furnishing_rooms: Record<string, string>`, `custom_furnishing: CustomItem[]`, `custom_amenities: string[]`.
- Added: `furnishing_detail: FurnishingDetailItem[]` (JSONB shape stored directly).
- Retained (semantic change): `building_amenities: string[]` — now a flat array mixing canonical + custom (component splits for display).
- `CustomItem` interface deleted — customs live inside `furnishing_detail` with `custom: true`.
- `buildFurnishingDetail(f)` helper deleted (identity now); `buildAmenitiesJson(building, furnishingDetail)` moved to `@/types/property` and shared with admin.
- `prefillFormFromRow`: hydrates `furnishing_detail` and `building_amenities` directly from the row (no decomposition).
- `PropertyPreview` payload continues to send split `building_amenities` + `custom_amenities` (preview owns its own shape — split via `BUILDING_AMENITIES.some(...)` predicate at the call site).
- Section 4 + 5 summaries / touch checks read new keys.

**Admin state changes**: `FURNISHING_ITEMS`, `BUILDING_AMENITIES`, `FURNISHING_ITEM_OPTIONS` local const copies deleted — imported from `@/config/property-form` (owner's canonical). Local `FurnishingDetailItem` interface deleted — imported from `@/types/property`. `handleSave` amenities JSONB now derived via `buildAmenitiesJson(buildingAmenities, furnishingDetail)` — the `furnishingItems` state var is now dead (kept for the moment; scheduled for removal in a follow-up cleanup).

**Shared type module**: new `src/types/property.ts` — `FurnishingDetailItem`, `AmenitiesJson`, `buildAmenitiesJson` helper. `@/config/property-form` re-exports `FurnishingDetailItem` for backward-compat with existing importers.

**Constants unified**: `FURNISHING_ITEM_OPTIONS` renamed `hasSize → hasSizeText` (matches admin's naming, avoids the confusing "hasSize" that in owner meant text-input). Both editors branch on `"hasSizeText" in opt && opt.hasSizeText` and `"hasRooms" in opt && opt.hasRooms`. The owner list was more complete than admin's — canonical.

**Visual parity**: shared components use owner's per-item card layout (`rounded border p-2 transition-colors` + `border-primary bg-accent/30` when checked). Admin previously had a similar layout with slightly different padding (`p-3`); the extraction normalizes to owner's. Admin now gains per-item size/rooms text inputs on the same bed/mattress/AC entries that already had them in the admin-specific list.
reasoning: Two divergent implementations of the same JSONB editors was the largest remaining duplication after Prompts 2-3. Extracting them removed the last "owner form and admin form each have their own state shape" mismatch — future JSONB additions land in one place. The bigger refactor (JSONB-canonical vs. keeping the split-state adapter) preserves admin's richer size/rooms metadata and gives admin the custom-items UI that owners have been using since Phase 1.
supersedes: (retires owner's decomposed furnishing/amenities state)
files_affected: src/components/property/FurnishingEditor.tsx (new), src/components/property/AmenitiesEditor.tsx (new), src/types/property.ts (new), src/config/property-form.ts, src/pages/ListProperty.tsx, src/pages/admin/PropertyEdit.tsx, src/test/jsonb-editors.test.tsx (new)

## D-171: Sync Prompt 5 (final) — bridge cleanup, dead state, security_deposit_months owner input, CLAUDE.md trim
date: 2026-07-14
phase: 1.5
category: refactor+cleanup
decision: Closes the 5-prompt parity-audit sync series. Five targeted fixes + memory consolidation:

**1. `security_deposit_months` owner-form input.** Spec entry has `audiences: ['owner_form', 'admin_form', 'public_detail']` since D-167, but no owner input existed. Added `<SpecField>` directly below the security_deposit_amount chips in Section 3. FormState + INITIAL_STATE + prefillFormFromRow + mapFieldToDb all extended with `security_deposit_months` key. `DB_COLUMN_TO_SECTION` already had the mapping. Chips (1/2/3 months) now write BOTH `security_deposit_amount` (rent × N) AND `security_deposit_months` (N) — inline setForm + patch, no updateField (since the chips write two fields at once, updateField's single-key API doesn't fit). Manual entry in either field overrides.

**2. `maintenance_included` FormState rename.** Local key was `maintenance_included`; DB column is `maintenance_included_in_rent`. Bridge existed at the switch call site: `updateField('maintenance_included', v, { maintenance_included_in_rent: v })`. Cleaned by renaming the FormState key to match the DB column throughout — FormState, INITIAL_STATE, prefillFormFromRow, section-touched check, and the Switch call site. Bridge second-arg dropped: `updateField('maintenance_included_in_rent', v)` writes directly. Added `case "maintenance_included_in_rent": return { maintenance_included_in_rent: !!value }` to mapFieldToDb (was missing — the field was always writing via dbPatch second-arg before). Preview payload key is intentionally `maintenance_included` (preview's own shape, not FormState) — annotated with a comment.

**3. Dead `furnishingItems` state removed.** D-170 orphaned this state var when admin's amenities save switched to `buildAmenitiesJson(buildingAmenities, furnishingDetail)`. Deleted both the `useState` declaration and the hydration call (`setFurnishingItems(...)`). Also dropped the `amenities.furnishing_items` array-of-strings hydration path from the load useEffect — that key is now derived on save from `furnishingDetail`. `grep furnishingItems src/pages/admin/PropertyEdit.tsx` → zero results.

**4. CLAUDE.md trimmed.** From 438 lines to ~275. Removed: verbose per-prompt narratives now captured in `commons-decisions.md`; duplicate rules (auth section was repeating the same "never call getSession" rule in 3 forms); Phase 1 per-prompt implementation logs. Preserved (load-bearing): the entire "DO NOT" list; typecheck baseline + command; SSG route classification; auth infrastructure invariants (noOpLock, deferred callback, safety timeout, phone verify flow); RLS patterns; visit RPC contract; NewApplication guard order; SpecField rules including the `!== 'sale'` fail-safe; save pipeline (D-153/154); shared JSONB editors (D-170); Payments idempotency contract; Skills reference. Every D-XXX reference remaining still points at a real decision that CC would need. Full history in `commons-decisions.md` D-001–D-171.

**5. Commons memory consolidation.** `commons-schema.md` §24 already had the brokerage split annotation from D-169 — added §25 with sync-series summary (D-167–D-171). `commons-forward-plan.md` gained Phase 2 entries: `state`/`pincode` as public search filters (TODO(P2) tags in spec) + landmark note on Google Places entry (landmark already spec-plumbed). Added a "Sync notes (Phase 1.5 addendum)" section at the end pointing at commons-decisions.md as source of truth.

Tests: no new tests (all changes are stateful rename + spec-driven input); regression suite unchanged at 82 passing. `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta). `grep maintenance_included[^_] src/pages/ListProperty.tsx` returns only the preview-payload comment (intentional). `grep furnishingItems src/pages/admin/PropertyEdit.tsx` returns only the D-171 comment (intentional).

**Phase 1.5 + Sync series complete.** No further sync prompts planned.
reasoning: Small technical debt items compound; better to close them alongside memory consolidation than let them drift. The bridge and dead state are exactly the kind of "one-off ephemera" that stops being ephemera once someone else has to read past it. `security_deposit_months` owner input closes a latent bug — chips wrote amount but not months, so public detail's D-167 annotation logic ("₹70,000 (2 months)") only fired for rows the admin edited.
supersedes: (closes D-167–D-170 sync series)
files_affected: src/pages/ListProperty.tsx, src/pages/admin/PropertyEdit.tsx, CLAUDE.md, commons-schema.md, commons-forward-plan.md, commons-decisions.md, log.md

---

## Phase 2 Decisions (D-172–D-177)

**D-172 — `rental_preferences` table created (Phase 2 Prompt 1)**
New table, one row per user (UNIQUE on user_id). Fields: preferred_city,
preferred_localities (text[]), move_in_by (date), number_of_occupants (int,
default 1, 1–20), age (int, 16–100), gender (text CHECK), marital_status
(text CHECK, includes 'live_in'), occupation (text CHECK) + occupation_other,
diet_preference (text CHECK), has_pets (bool), pet_types (text[]),
expected_stay_duration (text CHECK, 6 values), is_foreign_citizen (bool).
RLS: SELECT/INSERT/UPDATE own row. No DELETE. updated_at trigger.
Applied via MCP (not CC migration file).

**D-173 — `public_profiles` view fixed (Phase 2 Prompt 1)**
Added `display_name` (from profiles) and `is_public` (from profiles) to the view.
Was a live bug — PublicProfile.tsx selected both columns; view only exposed 4.
View now exposes: user_id, full_name (from users), profile_photo_url, bio,
display_name, is_public (last 3 from profiles). Applied via MCP.

**D-174 — Contact request snapshot rule (Phase 3 gate)**
When tenant submits a contact request (Phase 3), freeze a JSON snapshot of their
`rental_preferences` row at that moment into `contact_requests.tenant_profile_snapshot`.
Owner always sees this frozen snapshot — not live preferences. Future edits to
preferences never affect existing requests. Each new request re-snapshots.

**D-175 — Tenant dashboard card order**
Contact Requests (top) → Saved Properties → Rental Preferences.
Reason: Contact Requests is the primary return-visit action once the platform
has real usage. Preferences is set-and-forget. Favourites is passive browsing.

**D-176 — `isFullyVerified` added to `useAuth`**
`isFullyVerified: !!(user?.phone_verified && user?.email_verified)` added to
useAuth return object. Phase 2+ code uses this. Three existing call sites
(PropertyDetail, NewApplication, Eligibility) not refactored — left as-is.

**D-177 — Preferences form UX decisions**
Single scrolling page (not wizard). Route: `/tenant-dashboard/preferences`.
Upsert on submit button (not auto-save). Mandatory (UI-only, not DB NOT NULL):
age, gender, number_of_occupants, occupation, expected_stay_duration.
Sticky footer with "X of 5 required fields complete" + Save button.
Section-level explainers explaining why this data is collected.
Design source: copy component patterns from `/eligibility` page.
move_in_by: no past dates, max 90 days ahead.
Localities: plain text input for now (Google Places deferred — D-forward-plan).

---

## Phase 3 — Contact Requests

**D-P3-000 — State of world at Phase 3 kickoff**
date: 2026-07-17
phase: 3
category: baseline
- TypeScript baseline drift accepted: 360 (Phase 1.5 close) → 364 at Phase 3 start. Phase 3 must hold at the post-regen count (see log).
- `supabase/migrations/` folder was out of sync at kickoff — several Phase 1.5 + Phase 2 changes had been applied via MCP with no local file. Phase 3 accepts this and creates its four migrations manually as documentation-only mirrors of the MCP-applied SQL.
- `supabase/config.toml` audit deferred: `upload-property-image` / `delete-property-image` are missing entries and default to `verify_jwt=true`. Phase 3 does not touch this; Phase 3 Edge Functions will add their own `verify_jwt=false` entries when landed.
reasoning: Recording these as decisions (not risks) so future prompts do not re-litigate the drift or attempt config cleanup as part of Phase 3.

**D-P3-001 — Mutual reveal on approve**
date: 2026-07-17
phase: 3
category: reveal
Both parties receive the other party's phone via email only when the owner approves a request. No in-app reveal, no SMS, no WhatsApp in Phase 3. Approval is the single symmetric trigger — a tenant does not see anything until the owner clicks approve, and the owner sees the tenant's phone in the same moment the tenant sees theirs.
reasoning: Symmetric mutual reveal removes the "owner peeks, then ghosts" failure mode and matches the DPDP consent shape. Email-only reveal keeps the audit trail centralised in `email_send_log` — one deliverability surface to monitor.

**D-P3-002 — Fully-identified pre-approval snapshot**
date: 2026-07-17
phase: 3
category: snapshot
`contact_requests.tenant_profile_snapshot` (JSONB, frozen at INSERT) contains: display_name, full_name, profile_photo_url, bio, member_since, and every column of the tenant's `rental_preferences` row. Phone and email are NOT snapshotted — they are only revealed post-approve via the email flow (D-P3-001, D-P3-003).
reasoning: Owner needs enough identity + preferences signal to make an informed accept/decline call. Freezing at submit means the owner always evaluates the tenant against the state the tenant asserted at that moment — later preference edits do not retroactively change what the owner reviewed.

**D-P3-003 — Email-only reveal via Edge Function + Resend + audit log**
date: 2026-07-17
phase: 3
category: delivery
Approve flow calls an Edge Function that sends two emails via Resend (one to tenant with owner's phone, one to owner with tenant's phone). Every send + Resend webhook event (delivered / bounced / complained / failed) is logged to `email_send_log`. Resend button available to both parties for retry: rate-limited 1/hour and 5/day per contact_request.
reasoning: Resend is already the platform's transactional email vendor (n8n workflows). Webhook-fed `email_send_log` gives admin a single place to diagnose non-delivery. The 1/hr + 5/day cap prevents accidental spam loops if the delivery pipeline is silently broken.

**D-P3-004 — No pending-request expiry**
date: 2026-07-17
phase: 3
category: lifecycle
A pending contact_request has no automatic TTL. It stays pending until owner approves, owner declines, tenant withdraws, or property is archived (auto_cancel). Tenant-initiated withdraw is the sole closure mechanism from the tenant side.
reasoning: An owner sitting on a request for two weeks is a UX signal about that owner, not a system fault to auto-resolve. Auto-expiring pending requests would hide the response-rate signal (D-P3-009) and let unresponsive owners escape accountability. Revisit if the pending-pile grows unmanageable in prod.

**D-P3-005 — Property archive auto-cancels; other statuses keep requests alive**
date: 2026-07-17
phase: 3
category: lifecycle
The `trg_auto_cancel_requests_on_archive` trigger on `properties` fires only on transition INTO `archived`. It sets all `pending` requests for that property to `auto_cancelled` and logs an in-app event. NO email is sent for auto-cancel. Transitions into `unlisted`, `changes_requested`, or `edit_pending_review` do NOT trigger auto-cancel — pending requests remain and the tenant surface shows contextual UI ("owner is updating this listing").
reasoning: Archive is a semantic teardown; the property is gone. Unlisted / changes_requested / edit_pending_review are transient owner states — the tenant's interest is still valid when the listing comes back. auto_cancel is a "free retry" (does not burn a per-property attempt — D-P3-006).

**D-P3-006 — Rate limits, attempts, and cooldown semantics**
date: 2026-07-17
phase: 3
category: rate-limits
- Global daily cap: 10 requests / calendar day IST per tenant. Enforced in `check_contact_request_limits()`. UI shows a live counter with a spam-prevention tooltip.
- Per-property attempt cap: 3 attempts max. `attempt_number` is auto-set by the trigger.
- Attempt-burn rule: ONLY `declined` (owner declined) counts against the 3-cap. `withdrawn` and `auto_cancelled` are free retries and do not increment the declined_count.
- Cooldown: flat 24h after each decline (not PM's escalating 2d/7d ladder).
- 3/3 declined → the Request Contact button is hidden on PropertyDetail for that tenant/property pair.
reasoning: PM's escalating cooldown made sense for full applications (higher owner cost per review). Contact requests are lightweight — a flat 24h prevents pestering without punishing legitimate re-engagement. Only owner-decline burning an attempt aligns tenant cost with tenant-visible fault: withdraw and auto-cancel are not the tenant's fault.

**D-P3-007 — Required templated decline reason**
date: 2026-07-17
phase: 3
category: comms
Owner MUST pick one of 5 templated decline reasons (enum `contact_request_decline_reason`): preferences_dont_fit, property_currently_unavailable, prefer_to_wait, not_the_right_fit, property_no_longer_available. No free-text field. Tenant sees the templated reason in their dashboard log entry.
reasoning: Free-text creates moderation surface and legal exposure (discriminatory language). Templated reasons give tenants closure signal without opening a comms channel. The 5 chosen options cover the observed real-world decline distribution from the PM applications data.

**D-P3-008 — Notification cadence**
date: 2026-07-17
phase: 3
category: notifications
- Owner: 9AM IST daily digest via n8n workflow — ONLY if the owner has new pending requests received in the past 24h. No digest sent when the pile is empty.
- Owner + tenant: instant email on approve (mutual reveal — D-P3-001).
- Decline, withdraw, archive-auto-cancel: NO email. In-app dashboard log entries only.
reasoning: Instant per-request email would train owners to ignore the inbox. A single morning digest respects the owner's attention. Silent decline / withdraw / auto_cancel avoids emotional emails and matches how the tenant dashboard log already carries these signals.

**D-P3-009 — Owner response rate — two metrics**
date: 2026-07-17
phase: 3
category: transparency
The `get_owner_response_rate(p_owner_id uuid)` function returns two metrics: all-time and last-7-day. "Responded" = approved OR declined. `pending`, `withdrawn`, `auto_cancelled` are excluded from the denominator (they represent no owner action). Owners with `< 5` all-time contact requests display "New owner · verified" instead of a percentage. Metrics render per-property on PropertyDetail (using property's owner) and aggregate on `/u/:ownerId`.
reasoning: All-time reflects long-term behaviour; 7-day catches recent responsiveness so a good owner is not punished by ancient bad numbers (and vice versa). Excluding withdrawn / auto_cancelled from the denominator is critical: those are not owner faults and would unfairly deflate the rate. Sub-5 threshold prevents "1/1 = 100%" and "0/1 = 0%" from misleading tenants.

**D-P3-010 — Consent capture at submit**
date: 2026-07-17
phase: 3
category: dpdp-compliance
Two consent checkboxes at the submit step. Checkbox 1: platform terms. Checkbox 2: dynamically names the owner + property + purpose ("I consent to sharing my profile with {owner display_name} for the purpose of contact for {property building_name}"). Both must be checked. On INSERT, `consent_checked_at` = now() and `consent_terms_version = 1` are stored on the row.
reasoning: DPDP requires specific, informed, current consent for personal-data sharing. Static generic checkbox does not meet "informed" for a per-owner personal-data disclosure. Storing timestamp + terms version means future consent-terms updates can be audited per-row without ambiguity about which version the tenant agreed to.

**D-P3-011 — PublicProfile owner stats block**
date: 2026-07-17
phase: 3
category: transparency
Owner response-rate block on `/u/:userId` renders below bio, above the Listings + Ratings sections. Renders in one of three states:
- **Condition A** (`< 5` handled requests): compact "New owner · Verified" line — no percentages.
- **Condition B** (`>= 5` handled): "Responds to X% of requests · N handled all-time"; if `last_7d_handled > 0`, second line "This week: Y% · M handled".
- **Condition C** (no active listings AND `handled === 0`): block returns null. Pure-tenant profiles show nothing.
Data source: `get_owner_response_rate(p_owner_id)` RPC (public grant — anon + authenticated). "Materially an owner" is defined as either having at least one property with `status IN ('listed','edit_pending_review') AND is_active = true`, OR having any request history. Copy must say "Responds to X% of requests" — never "X% approval rate". Response rate deliberately includes declined + approved (an owner who declines fast is responsive; only pending / withdrawn / auto_cancelled don't count).
reasoning: Prevents the "0/0" and "1/1" pathologies from misleading tenants, matches the transparency framing of D-P3-009, and avoids surfacing an empty stats strip on tenant-only profiles (which don't have any owner-side signal to display).

**D-P3-012 — n8n → Supabase reads use scoped RPC + anon key**
date: 2026-07-17
phase: 3
category: security
n8n Contact Daily Digest workflow reads Supabase via `get_pending_requests_for_digest()` — a `SECURITY DEFINER` RPC with a fixed return shape — called with the anon key, NOT the service_role key. Service_role never lands in n8n or on the Hetzner box. Every future n8n → Supabase read follows the same pattern: author a scoped SECURITY DEFINER RPC, grant EXECUTE to `anon`, call from n8n with the anon key.
reasoning: Blast radius. Storing service_role in n8n gives every n8n workflow the same god-mode access; a single compromised credential (Hetzner root-shell, misconfigured backup, sniffed export) leaks the entire DB. A scoped RPC exposes exactly the columns the workflow needs and nothing else. SECURITY DEFINER keeps RLS out of the way for the specific query without opening the table.

**D-P3-013 — Migration 20260717000006 documents the digest RPC**
date: 2026-07-17
phase: 3
category: docs
`supabase/migrations/20260717000006_phase3_pending_digest_rpc.sql` is a documentation-only mirror of the `get_pending_requests_for_digest()` function + anon/authenticated grant applied via MCP on 2026-07-17. Header comment marks it not to be re-run against production. The Prompt 8 audit checklist expected migration 5 at `20260717000005_...sql`; the actual file landed at `20260717151137_phase3_rate_limit_functions.sql` — real file present under a different timestamp. Documented here so a future dev checking against the audit doesn't file a phantom "missing migration" ticket.
reasoning: Keep the local migration folder converging so `supabase db reset` in dev environments reproduces production shape. Filename-drift noted so it doesn't get "corrected" by a well-meaning refactor.

**D-P3-014 — Privilege escalation guard on `public.users`**
date: 2026-07-18
phase: 3
category: security
`prevent_user_privilege_escalation` BEFORE UPDATE trigger on `public.users` raises exception when `role`, `email_verified`, `phone_verified`, `auth_provider`, or `is_active` change under `current_user IN ('authenticated','anon')` AND NOT `is_admin()`. `IS DISTINCT FROM` gates each column so no-op writes with identical values pass silently. `search_path = public` pinned on the function. Admin, `service_role`, `postgres`, `supabase_auth_admin` all bypass — trigger only fires when `current_user` is one of the two end-user roles.
reasoning: Before this trigger, `users_update_own` RLS allowed any authenticated user to `.update({role:'super_admin'})` on their own row — `is_admin()` reads `public.users.role`, so self-elevation was one client call away. Column-level REVOKE alone doesn't cover `email_verified`/`phone_verified` because legitimate flows (guard trigger for identity-linked users) need those writable via the definer path. `IS DISTINCT FROM` lets the two legacy Profile.tsx client writes (removed in D-P3-019 but retained as belt-and-braces during rollout) no-op instead of erroring.

**D-P3-015 — Auth trigger danger zone**
date: 2026-07-18
phase: 3
category: architecture
Never add or modify triggers that run inside GoTrue's auth transaction (i.e. on `auth.users`) as a way to sync `public.*` state. Two production outages proved the risk: (1) `prevent_user_privilege_escalation` v1 gated on JWT claims role (`anon`) instead of `current_user` — MCP tests as `postgres` didn't surface it, real Google logins broke; (2) same trigger missing `search_path = public` — `supabase_auth_admin`'s default search_path can't resolve `public.*` symbols. Future `public.users` sync logic goes in post-login RPCs called by the frontend (pattern: `touch_last_login()` — D-P3-017), not in auth-side triggers. `current_user` changes under `SECURITY DEFINER`; JWT claims role does not — always gate on `current_user`.
reasoning: GoTrue's auth transaction runs as `supabase_auth_admin`, a role with narrow default search_path and different privileges than admin MCP sessions. Anything that fails inside that transaction breaks signup and login for every user simultaneously. MCP-based tests are a false-positive layer — they run as `postgres` and pass while the same code fails at real-login time. Frontend-triggered RPCs are self-contained: they can be rolled back with a single deploy, and their failure only affects the calling client.

**D-P3-016 — `public.users.phone` is not authoritative; use `get_phone_fallback`**
date: 2026-07-18
phase: 3
category: data-source
`auth.users.phone` (where `phone_confirmed_at IS NOT NULL`) is the authoritative source for every phone-confirmed user. `public.users.phone` may be null for Google-first users who later linked phone as their second provider — `handle_user_updated` Block 1 reads `NEW.phone` which can be null at that trigger-firing moment. Any feature reading a user's phone MUST call `public.get_phone_fallback(p_user_id uuid) RETURNS text` (SECURITY DEFINER, `search_path = public, auth`, granted to `service_role` ONLY) when `public.users.phone` is null. The RPC reads `auth.users.phone` first, then `auth.identities.identity_data->>'phone'` as secondary fallback. Extends D-P3-012: n8n never queries `auth.*` directly — always via a scoped SECURITY DEFINER RPC.
reasoning: The Google-first → phone-linked pattern is common. Fixing this via another auth-side trigger sits in the danger zone (D-P3-015). A service-role-only RPC at the read path is safer: it isolates the fallback to the exact features that need it (`reveal-contact` v5, `resend-reveal` v5), keeps `auth.*` off the anon/authenticated grant surface, and can be extended without redeploying auth triggers.

**D-P3-017 — Email is reliable post-Google-link; no email fallback needed**
date: 2026-07-18
phase: 3
category: data-source
`handle_user_updated` Block 2 (email_confirmed_at NULL→non-null path) now sources email and full_name from `auth.identities.identity_data` for the Google identity, and the `ON CONFLICT DO UPDATE` clause uses `COALESCE(EXCLUDED.email, public.users.email)` so an existing good email is never overwritten with NULL. Combined with the D-P3-019 Profile.tsx read-only-name change, `public.users.email` and `public.users.full_name` are reliable for every verified user. Edge Functions and n8n workflows read `email` directly from `public.users`; no `get_email_fallback` RPC exists or is planned.
reasoning: The original Block 2 wrote `email = NEW.email` unconditionally, and `NEW.email` is NULL after `linkIdentity('google')` (Supabase quirk: the email lives only in `identities[].identity_data`). This clobbered every phone-first user's `public.users.email` at Google link time, which is what surfaced as the Daksh case. Sourcing from `identity_data` + COALESCE-preserve fixes it at the trigger — no downstream fallback needed.

**D-P3-018 — `isNewUser` derived from timestamps, not user_metadata**
date: 2026-07-18
phase: 3
category: analytics
Login.tsx `isNewUser = |last_sign_in_at − created_at| < 2000ms`. The old check `!data.user?.user_metadata?.full_name` was wrong for phone OTP: Supabase never populates `user_metadata.full_name` for phone-OTP verifies, so every returning phone-OTP login fired `signup_completed` instead of `login_completed` — corrupted PostHog owner-acquisition funnel `da7QttU9` for the entire pre-fix window. Also wired `touch_last_login()` RPC (SECURITY DEFINER, granted to `authenticated`) called once per genuine `SIGNED_IN` event in `useAuth` — never on `INITIAL_SESSION`, `TOKEN_REFRESHED`, or cached-session reload.
reasoning: `created_at ≈ last_sign_in_at` is Supabase's own first-sign-in signal — the auth verify step sets `last_sign_in_at` to `now()`, and for a genuinely new user `created_at` was set in the same 1–2s window. Any margin under 2000ms is safe; over ~5s risks false negatives for slow verifies. `touch_last_login` uses an RPC not a direct `.update()` because D-P3-014's guard blocks direct writes to `public.users` from `authenticated`.

**D-P3-019 — Profile Name read-only; no client writes to `full_name`**
date: 2026-07-18
phase: 3
category: ux
`/profile` Name section is read-only. Displays `useAuth().user.full_name` (populated by `handle_user_updated` Block 2 from `auth.identities.identity_data` on Google link). Empty state hints "Link your Google account below to set your name." No input, no Save button, no local editable state. Two legacy client `.update()` calls on `public.users` removed: the Google-link email/name write inside `onAuthStateChange`, and the phone/phone_verified write after `verify-phone-otp` succeeds. Both fields are now trigger-owned. `refreshUser()` retained as the only sync surface. `googleTokenRef` capture, raw `fetch()` to `verify-phone-otp`, `sessionStorage['reeve-link-returnTo']`, and `linkIdentity` flow all preserved.
reasoning: A single authoritative writer for `full_name` (the trigger) prevents the class of race where a background `USER_UPDATED` event overwrites a name the user just typed. The D-P3-014 guard's `IS DISTINCT FROM` clause meant the redundant client writes were silently no-oping instead of erroring, so their removal is invisible to users. Removing them also makes the trigger the load-bearing path, which surfaces trigger bugs immediately instead of masking them behind client compensation.

## D-P4-001 — Pseudonym system
Every user is assigned a permanent system-generated pseudonym on signup (format: adjective_noun_6digits). Used in comments only. Never shown on public profile. Never editable. One per person for life. Stored in public.users.pseudonym (UNIQUE). Generated by generate_pseudonym() SECURITY DEFINER function with 10-retry uniqueness loop. Trigger trg_assign_pseudonym fires BEFORE INSERT on public.users.

## D-P4-002 — Real name source
full_name is pulled from Google OAuth only. No manual input or edit option for users. Stored in public.users.full_name. Used in transactional flows (applications, contact reveals, ratings). Never used in comments.

## D-P4-003 — Display Name removed from UI
profiles.display_name column retained in DB (other code may reference it) but the edit input has been removed from /me. No user-facing way to set or change display_name going forward.

## D-P4-004 — Pseudonym visibility rule
Pseudonym shown on /me page only (read-only, with explanation copy). Never appears on /u/:userId public profile page. Public profile shows full_name only. Comments show pseudonym only (via get_property_comments RPC — user_id never returned).

## D-P4-005 — RPC-only comment reads (anonymity guarantee)
property_comments, comment_likes, comment_reports have NO public SELECT RLS policy. All reads go through SECURITY DEFINER RPCs that control exactly which fields are returned. user_id is never returned to the client from any comment RPC — only pseudonym, is_mine (bool), liked_by_me (bool). This is the technical guarantee of commenter anonymity. Direct PostgREST queries against these tables return 0 rows for all roles including authenticated. Do not add SELECT policies to these tables.

## D-P4-006 — Comment soft-delete model
Comments are never hard-deleted by users. is_deleted=true with hidden_reason set: 'user_deleted' (user action), 'auto_hidden_reports' (3 distinct reporters trigger), 'admin_hidden' (admin action). Deleted comment text is masked server-side in the RPC — the literal string '[deleted]' is returned, never the real text. Username (pseudonym) remains visible. ON DELETE CASCADE exists only from properties→comments and users→comments, not on parent_comment_id (prevents reply wipeout).

## D-P4-007 — Comment auto-hide trigger
trg_auto_hide_on_reports fires AFTER INSERT on comment_reports. When distinct reporter count for a comment reaches 3, sets is_deleted=true, hidden_reason='auto_hidden_reports'. Guard: only fires when is_deleted=false (idempotent). No external job or notification needed — pure DB-level moderation safety net.

## D-P4-008 — property_views dedup model
Two partial unique indexes handle NULL correctly:
UNIQUE (property_id, user_id, viewed_date) WHERE user_id IS NOT NULL
UNIQUE (property_id, visitor_id, viewed_date) WHERE visitor_id IS NOT NULL
One row per (user OR visitor, property, day). INSERT ON CONFLICT DO NOTHING in track_property_view RPC. 30-second cooldown also in RPC. Owner excluded from own property views. Raw rows: owner+admin SELECT only. Public count via get_property_public_stats RPC.

## D-P4-009 — comment_blocklist
83 words seeded: caste slurs (7), communal slurs (6), racial slurs (8), gender/sexuality slurs (7), English abuse (8), Hindi abuse (33), South Indian abuse (8), abbreviations (3), violence terms (3). Blocklist checked at post_comment RPC time via tokenized JOIN. No public SELECT on this table. Add words directly via Supabase dashboard — no migration needed (words are data, not schema). Remind Daksh to review list periodically as language evolves.

## D-P4-010 — like_count denormalization
property_comments.like_count is a denormalized integer maintained by trg_update_like_count (AFTER INSERT OR DELETE on comment_likes). Uses GREATEST(like_count-1, 0) on DELETE to prevent negative counts. Postgres serialises row-level updates so concurrent likes stay correct. Never recompute from COUNT(*) on comment_likes in production queries.

## D-P4-011 — post_comment RPC: filter architecture
Content filtering runs entirely server-side in post_comment (SECURITY DEFINER). Client cannot bypass filters. Filter order: auth → verification → property status gate → English-only → emoji → URL → email → phone → blocklist (tokenized JOIN) → pattern spam → rate limit → depth compute → INSERT. All errors raised as RAISE EXCEPTION 'ERROR_CODE' — frontend matches on error.message string. Blocklist check uses regexp_split_to_table + JOIN against comment_blocklist (one indexed join, not per-word regex — scales with blocklist size).

## D-P4-012 — post_comment RPC: English filter implementation
NON_ENGLISH filter allows: ASCII (codepoints 0-127), Latin Extended (128-591), ₹ (8377), curly quotes (8216-8223), em/en dashes (8208-8213). Rejects Devanagari, Kannada, CJK, emoji. Implemented via per-character ASCII() codepoint check in plpgsql — Unicode escape syntax (\uXXXX) is not supported in Postgres regex strings, so character class approach was used instead.

## D-P4-013 — get_property_comments: anonymity contract
RPC never returns user_id. Returns: pseudonym (always), real_name (owner on own listing only), is_owner bool, badges text[], is_mine bool (computed from auth.uid() server-side), liked_by_me bool. Deleted comments return literal '[deleted]' text — real text never leaves the server regardless of is_deleted reason. No path exists from comment output to /u/:userId. STABLE volatility (reads only). Keyset pagination via p_cursor timestamptz (created_at < cursor), never OFFSET.

## D-P4-014 — track_property_view: dedup and silent behaviour
RPC is VOLATILE (writes). Returns void on all paths — no error states surfaced to client. Owner exclusion: skips if auth.uid() = property owner_id. 30-second cooldown: skips if same (user_id or visitor_id) + property inserted within last 30 seconds (handles React StrictMode double-mount and F5 refresh). Daily dedup: INSERT ON CONFLICT DO NOTHING on partial unique indexes. Visitor ID supplied by client from localStorage key 'reeve_visitor_id' (crypto.randomUUID(), generated client-side).

## D-P4-015 — get_property_counts: batched pattern for search
get_property_counts(uuid[]) takes all visible property IDs on a page and returns view_count + comment_count for all of them in one RPC call. Never call get_property_public_stats per card — always use the batched version for list/search pages. Display thresholds: view_count shown only when >= 10; comment_count shown only when >= 1 (avoids "0 views" social proof reversal at launch).

## D-P4-016 — interaction_ratings: double-blind timing model
No scheduler. Window open/close states are derived from stored timestamps at read time. window_opens_at = approved_at + 3 days (stored at trigger insert). window_closes_at = window_opens_at + 10 days (stored at trigger insert — not GENERATED ALWAYS, which requires immutable expressions). Published = (both submitted) OR (now() > window_closes_at). Solo publish allowed at expiry. Publish-gate enforced in submit_rating + get_user_rating_summary RPCs, not in RLS. Only contact_requests approved after Phase 4C deploys get rating rows — no retroactive rows.

## D-P4-017 — interaction_ratings: RLS model
SELECT: owner_id OR tenant_id OR is_admin(). No public SELECT. INSERT: no policy = blocked for all roles; rows created exclusively by trg_create_rating_on_approval (SECURITY DEFINER) on contact_requests AFTER UPDATE. UPDATE: two policies — owner can update o_* before o_submitted_at is set; tenant can update t_* before t_submitted_at is set. Once submitted, locked permanently. Admin can update anything.

## D-P4-018 — interaction_ratings: structured label ratings
No stars. Three structured questions per side (same for owner and tenant):
  Q1: communication ('yes'|'partially'|'no')
  Q2: visit ('yes'|'rescheduled'|'didnt_happen'|'not_reached')
  Q3: deal_again ('yes'|'maybe'|'no') — mandatory, cannot submit without
Optional short review text (max 500 chars) filtered by same suite as post_comment (English only, no URLs/emails/phones, no emojis, blocklist). Aggregate display: "92% would deal again · 12 ratings" (% of 'yes' on q3_deal_again). Minimum 3 ratings before showing aggregate — below 3 returns status 'new' → UI shows "New on Reeve".

## D-P4-019 — trg_create_rating_on_approval
Fires AFTER UPDATE on contact_requests when status transitions to 'approved' (OLD.status != 'approved' guard prevents duplicate rows). ON CONFLICT DO NOTHING provides additional idempotency. Falls back to now() if approved_at is null (shouldn't happen but defensive).

## D-P4-020 — submit_rating RPC: flow and locking
SECURITY DEFINER, authenticated only. Flow: auth → participant check → window_opens_at check (WINDOW_NOT_OPEN:N.N days) → window_closes_at check (WINDOW_CLOSED) → submitted_at null check (ALREADY_SUBMITTED) → Q3 mandatory check → answer value validation → review text filter suite (same as post_comment) → UPDATE appropriate side (o_* for owner, t_* for tenant) → return {success, other_submitted}. Once submitted_at is set the RLS UPDATE policy blocks further updates — submission is permanent. other_submitted drives the nudge UI ("X has already rated — submit yours to publish both").

## D-P4-021 — get_user_rating_summary: publish rule and minimum shield
Publish condition applied in WHERE: (t_submitted_at IS NOT NULL AND o_submitted_at IS NOT NULL) OR now() > window_closes_at. Solo-published ratings count — non-participation does not shield from rating. Minimum 3 published ratings required before showing aggregate on either side; below 3 returns {status:'new'} → UI shows "New on Reeve". Returns as_owner block (tenant-written ratings of the owner) and as_tenant block (owner-written ratings of the tenant). deal_again_pct is rounded integer (0-100). Review texts returned in array with created_at — no author identity in output.

## D-P4-022 — get_pending_ratings_for_me: pending window logic
Returns rows where: caller is participant AND now() >= window_opens_at AND now() <= window_closes_at AND caller's submitted_at IS NULL. Ordered by window_closes_at ASC (most urgent first). Returns i_am ('owner'|'tenant') so UI knows which side to render. Returns other_submitted boolean for nudge display. Returns counterparty's full_name (real name — transactional context, identity appropriate). No pseudonym used in ratings context.

## D-P4-023 — Phase 4 anonymity audit: confirmed clean
Audit confirmed post-Phase-4 build:
- property_comments: no SELECT RLS policy (PostgREST blocked)
- comment_likes: no SELECT RLS policy (PostgREST blocked)
- get_property_comments returns no user_id field (confirmed from RPC definition: columns are comment_id, parent_comment_id, depth, pseudonym, is_owner, real_name, badges, text, hidden_reason, like_count, liked_by_me, is_mine, created_at)
- Deleted comment text: RPC returns '[deleted]' via CASE expression; real text never leaves server
- No /u/:id link for non-owner commenters in CommentItem
- Pseudonym absent from PublicProfile.tsx and ListingsGrid.tsx
- display_name edit UI absent from Me.tsx

## D-P4-024 — ListingsGrid status filter decision
ListingsGrid on PublicProfile uses .in(["listed","edit_pending_review"]) not strict .eq("listed"). Rationale: edit_pending_review properties are publicly visible (is_active=true) and shown in search results and RequestContactPanel ELIGIBLE_STATUSES. Narrowing to strict 'listed' would desync PublicProfile from the rest of the platform. This matches the established convention. If status semantics change, update here.
