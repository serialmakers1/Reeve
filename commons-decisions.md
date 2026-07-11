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
