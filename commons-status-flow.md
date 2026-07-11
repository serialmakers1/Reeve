# Reeve Commons — Property Status State Machine

Seven statuses. Fourteen transitions. Two field tiers. Every button on every screen derives from this file.

---

## 1. Status matrix

| Status | Owner label | Tenant visibility | Admin label | Editable by owner? |
|---|---|---|---|---|
| `draft` | Setup started | Hidden | Draft | Yes — auto-save every field |
| `pending_review` | Under review | Hidden | Pending review | No (Withdraw only) |
| `changes_requested` | Changes requested | Hidden | Changes requested | Yes — must resubmit |
| `listed` | Live | Visible in search | Listed | Yes — via edit request flow |
| `edit_pending_review` | Live · edit under review | Visible in search (live values) | Edit under review | Yes — can update pending edit or cancel it |
| `unlisted` | Unlisted | Hidden | Unlisted | No — must re-list first |
| `archived` | (hidden from dashboard) | Hidden | Archived | No — admin restore only |

Tenant visibility rule remains: `status = 'listed' AND is_active = true` for public SELECT via RLS. `edit_pending_review` also has `is_active = true` so listings stay live during review; pending values live in `property_edit_requests`.

---

## 2. Transition matrix (14 transitions)

| # | From | To | Trigger | Actor | Confirmation modal? |
|---|---|---|---|---|---|
| 1 | (none) | `draft` | INSERT with default status | owner | — |
| 2 | `draft` | `pending_review` | Owner clicks Submit for Review | owner | no |
| 3 | `pending_review` | `draft` | Owner clicks Withdraw | owner | Withdraw |
| 4 | `pending_review` | `changes_requested` | Admin requests changes | admin | admin dialog |
| 5 | `pending_review` | `listed` | Admin approves | admin | admin dialog |
| 6 | `changes_requested` | `pending_review` | Owner resubmits after edits | owner | no |
| 7 | `listed` | `edit_pending_review` | Owner submits an edit | owner | no |
| 8 | `edit_pending_review` | `listed` | Owner cancels pending edit OR admin approves/rejects | owner or admin | Cancel Pending Edit (if owner) |
| 9 | `edit_pending_review` | `changes_requested` | Admin requests changes on the edit | admin | admin dialog |
| 10 | `listed` | `unlisted` | Owner clicks Unlist | owner | Unlist |
| 11 | `unlisted` | `listed` | Owner clicks Re-list (no changes) | owner | Re-list |
| 12 | any active (`draft`, `pending_review`, `changes_requested`, `listed`, `edit_pending_review`, `unlisted`) | `archived` | Owner clicks Cancel Listing | owner | Cancel Listing |
| 13 | `archived` | prior status | Admin restores | admin | admin dialog |
| 14 | any | any (PM path) | Admin manual override (existing PM flow) | admin | — |

Notes:
- Transition 8 handles three sub-cases (owner-cancel, admin-approve, admin-reject); all land back at `listed`. On approve, pending values are applied to `properties` and the edit request row is closed. On reject, no changes are applied.
- Transition 11 is fast-path when no edits are pending. If owner wants to edit an unlisted property, they must first re-list (transition 11) then edit as normal (transition 7). This is D-011.
- Transition 12's "any active" excludes `archived` itself.
- Transition 14 preserves the existing PM admin superpowers — admin can move a property to any status regardless of rules.

The DB trigger `enforce_property_status_transitions` (see commons-schema.md §7) enforces owner-initiated transitions. Admin (`is_admin()`) bypasses.

---

## 3. `edit_pending_review` UI spec (Option C — inline)

When status = `edit_pending_review`, the property management page renders a single Details view with pending values shown. For each field that differs from the currently listed value, a subtitle appears below the input: `Currently live: {current_value}`.

Example:
```
Monthly rent
₹30,000  ← pending value (from property_edit_requests.payload.listed_rent)
Currently live: ₹32,000
```

- Owner sees this as a preview of "what will apply once approved."
- Public search continues to show the live values.
- Admin review queue shows the same diff view with Approve / Request changes buttons.

---

## 4. Button visibility per status

Buttons appear on the property management page's Details tab (Actions section) only for statuses where they're valid.

| Status | Withdraw | Unlist | Re-list | Cancel Listing | Cancel Pending Edit | Edit | Submit for Review | Delete Draft |
|---|---|---|---|---|---|---|---|---|
| `draft` | — | — | — | ✅ | — | ✅ (inline auto-save) | ✅ | ✅ |
| `pending_review` | ✅ | — | — | ✅ | — | — | — | — |
| `changes_requested` | — | — | — | ✅ | — | ✅ | ✅ (resubmit) | — |
| `listed` | — | ✅ | — | ✅ | — | ✅ | — | — |
| `edit_pending_review` | — | ✅ | — | ✅ | ✅ | ✅ (updates pending edit) | — | — |
| `unlisted` | — | — | ✅ | ✅ | — | — | — | — |
| `archived` | — | — | — | — | — | — | — | — |

`Edit` on `listed` and `edit_pending_review` opens the accordion form pre-filled. Submitting from `listed` transitions to `edit_pending_review` (transition 7). Submitting from `edit_pending_review` updates the existing pending row (or supersedes it per D-003).

---

## 5. Field tier assignments

### Tier 1 — locked forever for owner; admin can edit
These fields define the property identity. Owner cannot change after initial submit.

- `street_address`
- `city`
- `state`
- `pincode`
- `building_name`
- `bhk`
- `property_type`
- `owner_id`

### Tier 2 — owner-editable, requires admin review
Everything else on the properties row. Includes:

- `floor_number`, `total_floors`, `square_footage`, `bathrooms`, `balconies`, `facing`, `building_age_years`
- `locality`
- `listed_rent`, `society_maintenance_approx`, `security_deposit_amount`, `security_deposit_months`, `maintenance_included_in_rent`, `available_from`
- `furnishing`, `furnishing_detail`, `amenities`
- `utility_*`, `gas_type`, `parking_2w`, `parking_4w`
- `pet_policy`, `building_rules`, `building_notes`
- `title`, `description`
- `legal_owner_name`
- All photos (add/delete on `property_images` — treated as Tier 2 edits per D-005)
- `youtube_walkthrough_url`, `google_maps_url`

### Not owner-visible (admin-only)
- `flat_number`, `flat_number_revealed`
- All `owner_*_preference`, `owner_*_rental`, `owner_income_dependent`, `owner_committed_12_months`, `owner_has_local_rep`, `owner_rep_*`, `owner_lives_in_same_city`, `owner_prefers_phone_calls`, `owner_only_rental_property`, `auto_accept_enabled`
- `is_active` (managed by triggers)
- `listed_at`, `occupied_at`, `off_market_at`, `last_leased_at`, `inspection_*`, `agreement_pending_at`, `vacancy_review_*`
- `board_*`, `service_agreement_id`, `map_pin_url`, `latitude`, `longitude`

### PM legacy statuses (untouched by Commons)
`inspection_proposed`, `inspection_accepted`, `inspection_scheduled`, `inspected`, `agreement_pending`, `occupied`, `off_market`, `expiring`, `turnover`, `inactive` — these remain in the enum and continue to power the PM flow. Commons statuses never transition into these; PM statuses never transition into Commons statuses. Admin can force any transition via transition 14.
