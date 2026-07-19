# Reeve Commons — UX Specs

Layouts, section structure, empty states, and copy. Companion to commons-decisions.md.

---

## 1. Owner listing form — 9 sections

Vertical accordion. Only one section expands at a time. Section headers show a status icon (⚪ empty / 🟡 in progress / ✅ complete / 🔴 error after failed submit) plus a partial summary preview on the right. Progress text near the Submit button: "N of 5 required sections complete."

Sections in fixed order:

### Section 1 — Location (required)
Purpose: Where is the property?
| Owner-friendly label | Technical column | Type |
|---|---|---|
| Country | (hardcoded India) | locked |
| State | `state` | text |
| City | `city` | text (open, not Bangalore-locked) |
| Locality / area | `locality` | text |
| Street address | `street_address` | text |
| Pincode | `pincode` | text |
| Building name | `building_name` | text |

Partial summary: `{locality}, {city}` when both present.

### Section 2 — Property basics (required)
Purpose: What kind of home is it?
| Owner label | Column | Type |
|---|---|---|
| BHK configuration | `bhk` | select enum |
| Property type | `property_type` | select |
| Floor number | `floor_number` | number |
| Total floors | `total_floors` | number |
| Carpet area (sq ft) | `square_footage` | number |
| Bathrooms | `bathrooms` | number |
| Balconies | `balconies` | number |
| Building age (years) | `building_age_years` | number |
| Facing direction | `facing` | select (8 directions) |

Partial summary: `{bhk} · {square_footage} sq ft`.

### Section 3 — Rent & deposit (required)
Purpose: What's the price?
| Owner label | Column | Type |
|---|---|---|
| Monthly rent | `listed_rent` | number (₹) |
| Society maintenance (approx) | `society_maintenance_approx` | number (₹) |
| Maintenance included in rent | `maintenance_included_in_rent` | switch |
| Security deposit (₹) | `security_deposit_amount` | number, primary input |
| Deposit chip helpers | derived: 1/2/3 months of listed_rent | click-to-fill for `security_deposit_amount` AND `security_deposit_months` |
| Available from | `available_from` | date picker |

Partial summary: `₹{listed_rent}/mo`.

### Section 4 — Furnishing (required)
Purpose: What comes with the home?
| Owner label | Column | Type |
|---|---|---|
| Furnishing level | `furnishing` | select enum |
| Furnishing details | `furnishing_detail` (JSONB) | list of items with optional count/size/rooms |
| Custom item | (adds to `furnishing_detail`) | free text + optional count |

Standard items: bed, mattress, AC, wardrobe, geyser, fridge, washing machine, TV, sofa, dining table, microwave, modular kitchen, water purifier, curtain rods, stove, chimney, fan, exhaust fan.

Partial summary: `{furnishing}` label.

### Section 5 — Amenities (optional)
Purpose: What does the building offer?
| Owner label | Column | Type |
|---|---|---|
| Building amenities | `amenities.building` (JSONB array) | checkbox grid |
| Custom amenity | (appends to `amenities.building`) | free text |

Standard amenities: lift, 24hr security, power backup, gym, swimming pool, clubhouse, visitor parking, CCTV, children's play area, intercom, park, maintenance staff, gated access, garden, sports facility, community hall, 24hr water supply.

### Section 6 — Utilities & parking (required)
Purpose: What's included in the deal?
| Owner label | Column | Type |
|---|---|---|
| Water included in rent | `utility_water_included` | switch |
| Gas included | `utility_gas_included` | switch |
| Gas type | `gas_type` | select (pipeline / cylinder / none) |
| Electricity included | `utility_electricity_included` | switch |
| Two-wheeler parking | `parking_2w` | select |
| Four-wheeler parking | `parking_4w` | select |

### Section 7 — Photos (required)
Purpose: Show the home.
- Min 3, max 15 photos.
- Accepted: JPEG, PNG, WebP, HEIC (HEIC auto-converted client-side via heic2any).
- Client-side compression via browser-image-compression before upload. Silent — no messaging.
- Header line: `Landscape photos work best. Take from far enough that the whole room is visible.`
- Sections: Living Room, Bedrooms, Kitchen, Bathrooms, Balcony, Building Exterior, Common Areas, Floor Plan. Custom sections allowed.
- One photo can be marked cover. One can be marked floor plan.

Partial summary: `{count} photos`.

### Section 8 — House rules & neighborhood (optional)
Purpose: What tenants should know.
| Owner label | Column | Type |
|---|---|---|
| House rules | `building_rules` | textarea |
| About the building / neighborhood | `building_notes` | textarea |
| Pet policy | `pet_policy` | text |

### Section 9 — Owner & consent (required)
Purpose: Verify identity, agree to terms.
| Owner label | Column | Type |
|---|---|---|
| Property legal owner name | `legal_owner_name` | text |
| Preview as tenant | (button) | opens modal with PropertyDetail read-only |
| Consent checkbox | (form state, not persisted directly) | required to enable Submit |

Consent copy: `I confirm I am the legal owner or authorized representative of this property, and I have permission to list it.`

---

## 2. Owner dashboard layout

URL: `/owner-dashboard` (or existing `/my-properties` — final URL confirmed at build time).

**Layout:** hybrid.
- **Top strip** — aggregate contact request count with a CTA. Hidden entirely when there are zero requests.
- **Property grid** — one card per property. Each card shows cover photo, building name + locality, status badge, rent, and a request count badge (hidden if zero).
- **Add Property button** — top-right, visually prominent. Routes to `/list`.
- **Archived section** — collapsed / separate tab, view-only.

Card click zone is the entire card, navigating to `/owner-dashboard/property/:id`.

---

## 3. Property management page

URL: `/owner-dashboard/property/:id`.

**Layout:** summary card top + tabs below.
- **Summary card** — cover photo, building name + locality, status badge, monthly rent, quick metadata.
- **Tabs** (in order): `Requests` | `Details` | `Photos` | `Activity`.
  - `Requests` is the default when count > 0. Otherwise `Details` is default.
  - Tab labels show a count badge when relevant.

### Requests tab
- Empty state copy: `No requests yet — get your property listed to start receiving interest.`
- Request list. Clicking a request expands it in place (Option F):
  - **Rental preferences** displayed first (from tenant's `rental_preferences` when built).
  - **Tenant profile** as an expandable accordion below with a link `View full profile →` to `/u/:tenantId`.
  - **Approve / Decline** buttons pinned at bottom of the expanded card.
- Re-request flag: if declined before, show `Requested again — previously declined [X days ago]`.
- Stats placeholder for later: `12 requests · 3 approved · 2 declined · 7 pending`.

### Details tab
Read-only view of every field on the property. At the bottom, an **Actions** section shows the buttons relevant to the current status (Withdraw / Unlist / Re-list / Cancel Listing / Cancel Pending Edit / Edit). See commons-status-flow.md button visibility matrix.

### Photos tab
Grid of current photos with cover / floor plan markers. Edit photos here triggers an edit request (Tier 2 review).

### Activity tab
Chronological list of `property_activity_log` entries visible to owner. Minimum state shows at least the initial `Listed on {date}` entry — no full-empty state.

---

## 4. Public profile page (`/u/:userId`)

Accessible by any logged-in user.

**Content:**
- Cover / hero: display_name, Google photo (or initial-based placeholder), subtle verified checkmark.
- Bio (200 chars max).
- Member since date.
- Listed properties by this user (public listings only).
- Placeholder section for future ratings & reviews.

**Layout:** single column, centered, ~640 px max width on desktop.

**Not shown:** role labels ("Owner" / "Tenant"), phone number, email, private profile fields.

---

## 5. My Profile page (`/me`)

Owner's editable view of their own public identity.

**Content:**
- Display name (editable).
- Bio (editable, 200-char counter).
- Google photo preview (auto-pulled from OAuth).
- Verified checkmark.
- Subsidiary link: `Account settings →` pointing to `/profile` (the existing settings page with OTP, Google link, etc.).
- Stats: property count, requests received (later phase).

**Header nav:** The user dropdown shows one `My Profile` link → `/me`. There is no top-level `Account settings` link.

---

## 6. Preview mode

Preview button lives in Section 9 of the owner form.

- Opens a modal rendering `PropertyDetail` in read-only mode with current form values.
- `PropertyDetail` accepts a `previewData` / `readOnly` prop; when set, it skips DB fetching and uses passed values.
- CTAs inside the preview (Contact / Favourite) are visually present but disabled.

---

## 7. Confirmation modal copy (locked)

All destructive or state-changing owner actions require a confirmation modal.

| Action | Title | Body | Confirm button | Confirm style |
|---|---|---|---|---|
| Withdraw | `Withdraw your submission?` | `Your listing will go back to draft. You can edit and resubmit anytime.` | `Withdraw` | neutral |
| Cancel listing | `Cancel this listing?` | `It will be archived and hidden from your dashboard. Contact support to restore it.` | `Cancel Listing` | destructive (red) |
| Unlist | `Unlist this property?` | `It won't be visible to tenants until you re-list it.` | `Unlist` | destructive (red) |
| Re-list | `Re-list this property?` | `It will be visible to tenants immediately.` | `Re-list` | primary |
| Cancel pending edit | `Cancel your pending edit?` | `Your live listing will stay as it is now.` | `Cancel Edit` | neutral |

Each modal has a `Cancel` button (dismisses without action).

---

## 8. Empty states

| Surface | Empty state |
|---|---|
| Owner dashboard top strip | Hidden entirely — no empty state message |
| Property grid, no properties | `No properties yet. Add your first to get started.` + Add Property CTA |
| Property grid, archived tab | `No archived properties.` |
| Requests tab | `No requests yet — get your property listed to start receiving interest.` |
| Activity tab | Never fully empty (always at least the `Listed on {date}` event) |
| Admin review queue, no pending | `Nothing awaiting review right now.` |

---

## 9. Photo upload UX

- Accepted formats shown up front: `JPEG, PNG, WebP, HEIC`.
- Dimension guidance: one short sentence — `Landscape photos work best. Take from far enough that the whole room is visible.`
- Min 3 / max 15 photos.
- Compression happens client-side, silently. No spinner labeled "compressing".
- HEIC files convert transparently to JPEG before upload. Owner never sees the conversion.
- On failed compression, fall back to raw upload.
- Photos organized by section (Living Room, Bedrooms, etc.); custom sections allowed.
- One photo marked as cover; one marked as floor plan.
- Removing or adding photos on a listed property triggers an edit request (Tier 2 review).

---

## 10. Phase 1.5 additions

### StatusGuidance component (D-138)

Rendered on the property management page (Details tab) and on ListProperty edit mode. Not dismissible. Data source: `STATUS_CONFIG[status].guidance` in `src/lib/propertyStatus.ts` (added in Prompt 1). Full component built in Prompt 11.

Per-status content locked in Prompt 1:

| Status | Heading | Body |
|---|---|---|
| `draft` | Draft — continue where you left off | You've started a listing. Continue filling the sections above. We auto-save your progress as you type. When all required sections are complete, click 'Submit for review'. |
| `pending_review` | Your listing is under review | Our team checks all listings within 24-48 hours for accuracy and quality. You'll get an email once your listing is approved. You can withdraw or cancel your submission anytime before then. For questions, contact support@reeve.in. |
| `changes_requested` | Admin requested changes | We've reviewed your listing and requested some changes. Review the admin's feedback shown below, update the sections, and click 'Submit for review' again. For questions, contact support@reeve.in. |
| `listed` | Your listing is live | Tenants can now find your property and request contact with you. Any edits you make will go through admin review before applying to your live listing — the live version won't change until your edits are approved. For questions, contact support@reeve.in. |
| `edit_pending_review` | Your edit is under review | Your live listing continues to show current values to tenants. Once approved, the changes go live. You can cancel or modify this edit anytime. For questions, contact support@reeve.in. |
| `unlisted` | Your listing is not visible | Click 'Re-list' to make it live again — if no changes have been made, it goes live immediately. To edit before re-listing, re-list first, then edit. For questions, contact support@reeve.in. |
| `archived` | This listing is archived | This listing has been archived and is not visible anywhere. To restore, contact support@reeve.in. |

### Final Checks 3-checkbox pattern (D-148)

Section 9 requires 3 checkboxes; Submit is disabled until all three are checked:

1. `I confirm I am the legal owner or authorized representative of this property, and I have permission to list it.` (existing consent — D-036)
2. `I agree to the [Terms of Service](/terms).`
3. `I accept the [Privacy Policy](/privacy).`

### Search rent/sale toggle (D-143)

Search page has `[Rent] [Buy]` toggle at the top. URL query param `?type=rent` or `?type=sale` persists selection. Session storage remembers last choice as fallback. Default: `rent`.

### Section validation logic (D-144)

Optional-only sections (Section 5 Amenities, Section 6 Rules) render ⚪ (not started) by default. They only turn ✅ once the user opens them OR enters any data. Required sections continue to show their icon derived from field completion.

### `available_from` date picker rules (D-146)

- Past dates allowed. On selection, show an inline warning: `Available from is in the past — is this correct?`
- Future dates limited to 90 days ahead of today.

---

## 11. `/profile` — Account settings (D-P3-019)

The account-settings page (distinct from `/me`, which is the public-identity editor). Four sections in order: Full Name, Phone Number, Google Account, Emergency Contact.

**Full Name (read-only).** Displays `useAuth().user.full_name`. No input, no Save button, no editable state. When empty, shows the hint "Link your Google account below to set your name." Populated exclusively by `handle_user_updated` Block 2 from `auth.identities.identity_data` when the user links Google (D-P3-017). Phone-OTP-only users see the empty-state hint until they link Google.

**Phone Number.** Verify flow unchanged from Phase 3 Prompt 1. `googleTokenRef` capture before `signInWithOtp`, raw `fetch()` to `verify-phone-otp`, `refreshUser()` after 200. No client `.update()` on `public.users.phone` — the trigger owns it.

**Google Account.** Link flow unchanged. `sessionStorage['reeve-link-returnTo']` used because Supabase strips query params from `linkIdentity.redirectTo`. No client `.update()` on `public.users.email` or `full_name` — the trigger owns them (D-P3-017).

**Emergency Contact.** Writes to `public.profiles.emergency_contact_*`. Unchanged.

**Post-Google-link nav priority:** `sessionStorage['reeve-link-returnTo']` (2s toast delay) → `localStorage['pendingReturnTo']` (30-min TTL) → `/profile`.
