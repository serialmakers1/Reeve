# Reeve Commons — Schema Changes

Migration order is strict (Section 8). Everything else is reference. Regenerate `types.ts` last.

---

## 1. New property_status enum values

Add these 5 values to the existing `public.property_status` enum:

| Value | Purpose |
|---|---|
| `pending_review` | Owner has submitted; awaiting admin review |
| `changes_requested` | Admin has requested changes; owner editable again |
| `edit_pending_review` | Live listing with pending edit awaiting admin review |
| `unlisted` | Owner has paused the listing; can be re-listed |
| `archived` | Owner has cancelled the listing; admin-only restore |

Migration form (must run inside individual transactions per PG limitation):

```sql
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'changes_requested';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'edit_pending_review';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'unlisted';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'archived';
```

Existing PM values (draft, inspection_proposed, inspection_accepted, inspection_scheduled, inspected, agreement_pending, listed, off_market, occupied, expiring, turnover, inactive) remain untouched.

---

## 2. New columns on `properties`

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `security_deposit_amount` | `numeric` | yes | null | Exact deposit in rupees. Coexists with existing `security_deposit_months`. |
| `building_notes` | `text` | yes | null | Owner-supplied "about the building / neighborhood" prose. |

Notes:
- `security_deposit_months` is retained for backward compatibility with PM listings.
- Neither column is required for INSERT — owner form supplies either or both.

---

## 3. New columns on `profiles`

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `display_name` | `text` | yes | null | Public identity name. Falls back to `users.full_name` if null. |
| `bio` | `text` | yes | null | Public bio, max 200 chars (enforced app-side). |
| `is_public` | `boolean` | no | `true` | Reserved for future hide toggle. No UI in Phase 1. |
| `profile_photo_url` | `text` | yes | null | Google avatar URL auto-populated on OAuth; manual upload deferred. |

The `handle_new_user` / `handle_user_updated` triggers must be updated to populate `profile_photo_url` from `raw_user_meta_data->>'avatar_url'` on Google OAuth.

---

## 4. New table `property_activity_log`

```sql
CREATE TABLE public.property_activity_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  actor_id      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role    text NOT NULL,                        -- 'owner' | 'admin' | 'system'
  action        text NOT NULL,                        -- 'listed' | 'price_changed' | 'photos_updated' | ...
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Option C curated summary
  is_public     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_activity_log_property_id ON public.property_activity_log(property_id, created_at DESC);
CREATE INDEX idx_property_activity_log_public ON public.property_activity_log(property_id) WHERE is_public = true;
```

Payload shape (Option C — see D-076):
```json
{
  "summary": "Rent reduced from ₹32,000 to ₹30,000",
  "changed_field_keys": ["listed_rent"],
  "edit_request_id": "uuid-or-null",
  "reason": null
}
```

### RLS
- `property_activity_log_select_owner` — owner reads full log for own properties (`is_property_owner(property_id)`).
- `property_activity_log_select_admin` — admin reads everything (`is_admin()`).
- `property_activity_log_select_public` — public/authenticated reads only where `is_public = true` AND property is publicly visible.
- INSERT — service-role only (via trigger or Edge Function); no direct client INSERT.

---

## 5. New table `property_edit_requests`

Per build plan Step 1.3:

```sql
CREATE TABLE public.property_edit_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  submitted_by  uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  payload       jsonb NOT NULL,                       -- proposed values keyed by column name
  status        text NOT NULL DEFAULT 'pending',      -- 'pending' | 'approved' | 'rejected' | 'superseded'
  reviewer_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason        text,                                 -- required when status = 'rejected'
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz
);

CREATE INDEX idx_property_edit_requests_property_id ON public.property_edit_requests(property_id, submitted_at DESC);
CREATE INDEX idx_property_edit_requests_pending ON public.property_edit_requests(property_id) WHERE status = 'pending';
```

### RLS
- Owner INSERT own requests: `submitted_by = auth.uid()` AND `is_property_owner(property_id)`.
- Owner SELECT own requests.
- Admin ALL.
- Owner UPDATE (only to withdraw a pending edit — sets status to 'superseded' via app logic; or replaced by a new pending row).

### Superseding behavior
When an owner submits a new edit while a prior row is `pending`, the prior row's `status` is set to `superseded` in the same transaction as the new INSERT.

---

## 6. Existing tables affected

| Table | Change |
|---|---|
| `properties` | New columns (Section 2); new enum values on status column (Section 1) |
| `property_images` | New SELECT RLS policy for owners (Section 7) |
| `profiles` | New columns (Section 3) |
| `users` (via triggers) | `handle_new_user` / `handle_user_updated` populate profiles fields |

---

## 7. New RLS policies

### `property_images_select_owner` (new)

Owners must be able to see their own uploaded photos regardless of property status. The existing `property_images_select_public` policy only covers listed properties.

```sql
CREATE POLICY "property_images_select_owner" ON public.property_images
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_images.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );
```

### DB trigger to enforce owner status transitions

BEFORE UPDATE trigger on `properties` that rejects owner-initiated status changes unless the transition is in the allowed set. Admin path (via `is_admin()`) is unrestricted.

Owner-allowed transitions (see commons-status-flow.md for the full 14):
- draft → pending_review
- pending_review → draft (withdraw)
- changes_requested → pending_review (resubmit)
- listed → edit_pending_review (edit submitted)
- listed → unlisted (unlist)
- unlisted → listed (re-list with no changes)
- unlisted → changes_requested (re-list then edit)  ← must go through listed first; direct unlisted → changes_requested is NOT allowed
- edit_pending_review → listed (cancel pending edit — owner)
- any (except archived) → archived (cancel listing)

All other owner-initiated status transitions raise an exception. Admin can do anything.

---

## 8. Edge Function changes

### `upload-property-image`

Currently accepts any valid JWT and any property_id UUID. Must add an ownership check matching the pattern already in `delete-property-image`:

```ts
// After JWT validation, before R2 upload:
const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=role`, { headers: srHeaders });
const isAdmin = ['admin','super_admin'].includes(roleRes.json()[0]?.role);

if (!isAdmin) {
  const propRes = await fetch(`${SUPABASE_URL}/rest/v1/properties?id=eq.${propertyIdStr}&select=owner_id`, { headers: srHeaders });
  const isOwner = propRes.json()[0]?.owner_id === userId;
  if (!isOwner) return 403;
}
```

No other Edge Function changes in Phase 1.

---

## 9. Migration order (Phase 1 canonical)

Seven files, executed strictly in order. Every file is idempotent — re-runnable without side effects.

| # | Filename | Purpose |
|---|---|---|
| 1 | `20260710120000_add_property_status_enum_values.sql` | 5 new enum values, one COMMIT each |
| 2 | `20260710120100_add_property_columns_commons.sql` | `security_deposit_amount`, `building_notes` on properties |
| 3 | `20260710120200_add_profile_columns_commons.sql` | `display_name`, `bio`, `is_public` on profiles (photo already exists) |
| 4 | `20260710120300_create_property_activity_log.sql` | Table + indexes + RLS enabled |
| 5 | `20260710120400_create_property_edit_requests.sql` | Table + partial unique index + RLS enabled |
| 6 | `20260710120500_create_owner_action_acknowledgments.sql` | Table + RLS enabled |
| 7 | `20260710120600_add_commons_rls_and_triggers.sql` | RLS policies + 2 new triggers + `handle_property_status_change` + `handle_new_user/updated` extensions |
| 8 | `20260710120700_add_edit_request_rpcs.sql` | 4 RPCs — submit/approve/reject/cancel edit requests (Prompt 4) |
| 9 | `20260710120800_public_profiles_view.sql` | `public_profiles` view exposing 5 safe columns (Prompt 5) |
| 10 | `20260710121000_fix_commons_gaps.sql` | Bug fix: `property_images_select_public` includes `edit_pending_review`; `property_activity_log_writer` adds `admin_edit` branch (Prompt 10) |

**Post-migration steps (not migrations themselves):**
- Deploy modified `upload-property-image` Edge Function (`supabase functions deploy upload-property-image`).
- Regenerate `types.ts`: `npx supabase gen types typescript --project-id tfutuqqcxqqbirnsdpvz --schema public > src/integrations/supabase/types.ts`.
- Verify typecheck error count within ±5 of baseline (`npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"`).

## 10. RLS policies added in Phase 1

### `property_images_select_owner`
```sql
CREATE POLICY "property_images_select_owner" ON public.property_images
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_images.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );
```

### `properties_select` (widened)
```sql
CREATE POLICY "properties_select" ON public.properties
  AS PERMISSIVE FOR SELECT
  USING (
    (status IN ('listed'::property_status, 'edit_pending_review'::property_status) AND is_active = true)
    OR (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );
```

### `property_activity_log`
```sql
CREATE POLICY "activity_log_select_owner" ON public.property_activity_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_activity_log.property_id AND properties.owner_id = (SELECT auth.uid()))
  );
CREATE POLICY "activity_log_select_public" ON public.property_activity_log
  FOR SELECT USING (is_public = true);
CREATE POLICY "activity_log_select_admin" ON public.property_activity_log
  FOR SELECT USING ((SELECT is_admin()));
```
No INSERT/UPDATE/DELETE policies — service_role only.

### `property_edit_requests`
```sql
CREATE POLICY "edit_requests_select_owner" ON public.property_edit_requests
  FOR SELECT USING (owner_id = (SELECT auth.uid()));
CREATE POLICY "edit_requests_select_admin" ON public.property_edit_requests
  FOR SELECT USING ((SELECT is_admin()));
CREATE POLICY "edit_requests_insert_owner" ON public.property_edit_requests
  FOR INSERT WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.properties WHERE properties.id = property_edit_requests.property_id AND properties.owner_id = (SELECT auth.uid()))
  );
```
UPDATE/DELETE via service-role RPCs only (supersede/approve/reject).

### `owner_action_acknowledgments`
```sql
CREATE POLICY "acks_select_own"  ON public.owner_action_acknowledgments FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "acks_insert_own"  ON public.owner_action_acknowledgments FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "acks_delete_own"  ON public.owner_action_acknowledgments FOR DELETE USING (user_id = (SELECT auth.uid()));
```

## 11. New triggers

### `enforce_property_owner_transitions` (BEFORE INSERT/UPDATE)
Validates owner-initiated changes. Admin bypasses via `is_admin()`. Rejects:
- INSERT with `status='draft'` when the owner already has 20 draft rows (D-101).
- Status transitions not in the allowed matrix (see commons-status-flow.md §2).
- Transition to `pending_review` when any required field is NULL (`locality, building_name, bhk, listed_rent, security_deposit_amount, furnishing, available_from`) or photo count < 3 (D-109).
- ANY field change on a row whose `OLD.status = NEW.status = 'unlisted'` (D-011).

Trigger name orders alphabetically before `handle_property_status_change`, so validation runs first.

### `property_activity_log_writer` (AFTER INSERT/UPDATE)
Emits one row per state change:
- INSERT with `status='draft'` → `action='listing_started'`.
- UPDATE with status change → `action` derived from the transition. Curated events (`listed` from `pending_review`/`unlisted`, `unlisted`) set `is_public=true`.

Payload always includes `summary: string`; other fields depend on variant (see §12).

### `handle_property_status_change` (BEFORE UPDATE, updated body)
Now keeps `is_active=true` when transitioning to `edit_pending_review`; excludes that status from the "leaving listed → hide" branch. All other behavior byte-identical to `20260425000004`.

### `handle_new_user` / `handle_user_updated` (updated bodies)
Extended profiles INSERT to populate:
- `profile_photo_url = COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture')`.
- `display_name = COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')`.

ON CONFLICT (user_id) refreshes photo (overwrite if Google supplies) and preserves manual display_name (COALESCE keeps existing if non-null).

## 12. Photo change payload structure (`property_edit_requests.payload.photo_changes`)

TypeScript type — canonical shape referenced by the RPC and the owner form:

```ts
export interface PhotoChanges {
  add: Array<{
    temp_id: string;           // client-generated UUID for ordering within the same edit
    url: string;               // R2 public URL from upload-property-image
    section: string | null;
    caption: string | null;
    is_primary: boolean;
    is_floor_plan: boolean;
    sort_order: number;
  }>;
  delete: string[];            // property_images.id values to remove on approval
  update: Array<{
    id: string;                // property_images.id
    is_primary?: boolean;
    is_floor_plan?: boolean;
    section?: string | null;
    caption?: string | null;
    sort_order?: number;
  }>;
}
```

Approval RPC applies `delete` first, then `update`, then `add` — order matters for `is_primary` uniqueness.

## 13. ActivityLogPayload discriminated union

Full type lives in `src/types/activity-log.ts` (built in a later prompt). Every variant carries `summary: string`.

```ts
export type ActivityLogPayload =
  | { action: 'listing_started';   summary: string }
  | { action: 'listing_submitted'; summary: string; from_status: string; to_status: string }
  | { action: 'listing_approved';  summary: string; from_status: string; to_status: string; reviewer_id?: string }
  | { action: 'listing_rejected';  summary: string; from_status: string; to_status: string; reason?: string; reason_text?: string }
  | { action: 'listing_withdrawn'; summary: string; from_status: string; to_status: string }
  | { action: 'edit_submitted';    summary: string; from_status: string; to_status: string; edit_request_id: string }
  | { action: 'edit_resolved';     summary: string; from_status: string; to_status: string; edit_request_id: string; outcome: 'approved' | 'rejected' | 'cancelled' }
  | { action: 'relisted';          summary: string; from_status: string; to_status: string }
  | { action: 'unlisted';          summary: string; from_status: string; to_status: string }
  | { action: 'archived';          summary: string; from_status: string; to_status: string }
  | { action: 'admin_edit';        summary: string; changed_field_keys: string[]; reviewer_id: string }
  | { action: 'status_changed';    summary: string; from_status: string; to_status: string };
```

Readers switch on `action` for narrowing. New variants can be added without DB migration — only the TS type and the RPCs writing them change.

---

## 14. Phase 1.5 migrations

Sequential migration files for Phase 1.5:

| Filename | Purpose |
|---|---|
| `20260711120000_fix_admin_only_property_fields.sql` | Git-sync of 2026-07-11 SQL editor fix — removes `status` from prevent_owner_updating_admin_fields guard list (D-124) |
| `20260712120000_widen_public_profiles_view.sql` | F1 fix — public_profiles now exposes user_id, full_name, profile_photo_url, bio (D-125, D-126) |
| `20260712120100_add_parking_and_india_rental_fields.sql` | India + parking (D-133, D-134) |
| `20260712120200_add_listing_type_and_sale_fields.sql` | Rent/sale (D-131, D-132) |
| `20260712120300_fix_acknowledgments_scoping.sql` | Ack event-scoped (D-141) — H2 fix |

## 15. `public_profiles` view (widened — D-125, D-126)

```sql
CREATE VIEW public.public_profiles WITH (security_invoker = false) AS
SELECT
  u.id                   AS user_id,
  u.full_name,
  p.profile_photo_url,
  p.bio
FROM public.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;
```

- `display_name` and `is_public` are dropped from the view. `profiles.display_name` and `profiles.is_public` are dead columns per the ground rule ("never dropped").
- Email and phone are NEVER exposed via this view. Admin queries `public.users` directly via `is_admin()` RLS (D-126).

## 16. `owner_action_acknowledgments` — event-scoped (D-141)

Phase 1 shape scoped `target_id` to `property_id`. Phase 1.5 rescopes to the specific rejection event (`activity_log_id` or `edit_request_id`). Migration `20260712120300_fix_acknowledgments_scoping.sql` handles the rewrite.

- New `target_type` values: `activity_log_event`, `edit_request_event` (in addition to `property`).
- Old `property`-scoped rows retained for backward compat; new banners write event-scoped rows.

## 17. Field spec architecture (D-128, D-129, D-130)

`src/config/property-fields.ts` is the single source of truth for property fields. Each field entry:

```ts
interface PropertyFieldSpec {
  key: string;                          // DB column
  ownerLabel: string;                   // shown on ListProperty
  adminLabel: string;                   // shown on admin PropertyEdit
  publicLabel: string;                  // shown on PropertyDetail
  input: 'text' | 'number' | 'select' | 'switch' | 'date' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  displayFormatter?: (v: unknown) => string;
  audiences: Array<'owner_form' | 'admin_form' | 'public_detail'>;
  editableBy: Array<'owner' | 'admin'>;
  section?: string;                     // owner form section grouping
  required?: boolean;
  min?: number; max?: number; pattern?: RegExp;
}
```

Consumers: `ListProperty.tsx`, admin `PropertyEdit.tsx`, `PropertyDetail.tsx`. Rent/sale distinction is captured via a `showWhen` predicate on `listing_type`.

## 18. Field spec module shape (Prompt 2 shipped state — supersedes §17 draft)

The spec module actually shipped in Phase 1.5 Prompt 2 diverged from the §17 sketch — this section is canonical. §17 kept as historical decision record.

**Location:** `src/config/property-fields.ts` (single file — types + data + helpers).

**Fields on the shipped `PropertyFieldSpec`:**

```ts
interface PropertyFieldSpec {
  key: string;                            // DB column name (storage source of truth)
  label: string;                          // owner-form default; label used unless overridden
  adminLabel?: string;                    // admin-form label if different
  publicLabel?: string;                   // public-detail label if different
  placeholder?: string;
  helper?: string;
  input: 'text' | 'textarea' | 'number' | 'select' | 'multiselect'
       | 'checkbox' | 'switch' | 'date' | 'radio' | 'json';
  options?: PropertyFieldOption[];
  audiences: PropertyFieldSurface[];      // ['owner_form','admin_form','public_detail']
  editableBy: PropertyFieldRole[];        // ['owner','admin']
  ownerSection?: OwnerFormSection;
  requiredOwner?: boolean;
  requiredAdmin?: boolean;
  min?: number; max?: number;
  pattern?: RegExp;
  maxLength?: number;
  visibleWhen?: (values) => boolean;      // e.g. gas_type only when utility_gas_included
  display?: (value: unknown) => string;   // formatter for public-detail + admin queue
  displayIcon?: string;
  tier?: 'locked' | 'review_required';    // 'locked' = Tier 1 admin-only after listing
}
```

**Owner form sections (fixed order):** `location, basics, rent_deposit, sale, inside, building_society, rules_preferences, photos, description, final_checks`. `sale` is defined but has no fields until Prompt 9 (rent/sale schema).

**Canonical helpers exported alongside `PROPERTY_FIELDS`:**
- `getFieldsForSurface(spec, surface)`
- `getOwnerFieldsGrouped(spec)` — returns `Map<OwnerFormSection, spec[]>` in canonical order
- `getFieldLabel(field, surface)` — resolves admin/public overrides
- `formatFieldValue(field, value)` — display formatter with sensible default (option label → String → "—")
- `isFieldVisible(field, values)` — evaluates `visibleWhen`
- `validateSpec(spec)` — returns `string[]` of problems; asserted empty in `src/test/property-fields.test.ts`

**JSONB fields (`furnishing_detail`, `amenities`):** entered as `input: 'json'` — the spec exposes the column and helper text, but the consumer owns the UI (uses `FURNISHING_ITEM_OPTIONS` / `BUILDING_AMENITIES` from `property-form.ts`). Do not try to render these generically in Prompts 3–5.

**Deferred:** the spec deliberately excludes `listing_type` (Prompt 9), parking counts + India rental fields (Prompt 7), and sale-specific columns (Prompt 9). Each will land with its own decision entry.

**Not wired yet.** Consumers (`ListProperty`, admin `PropertyEdit`, `PropertyDetail`) continue to read fields their existing way through Prompts 3–5. `src/config/property-form.ts` constants stay in use until then — the spec is additive.

## 19. Phase 1.5 Prompt 7 — India fields (applied via MCP; migration name `phase_1_5_prompt_7_india_fields_schema`)

Seven columns added to `public.properties`. All nullable. Applied directly through MCP — no file in `supabase/migrations/`. Types.ts regenerated.

| Column | Type | Default | Constraint | Notes |
|---|---|---|---|---|
| `parking_2w_count` | `integer` | `0` | — | Complements enum `parking_2w`; enum = availability, count = quantity. |
| `parking_4w_count` | `integer` | `0` | — | Same relationship to `parking_4w`. |
| `parking_notes` | `text` | — | — | Free-text parking clarifications (e.g. shared, reserved slot number). |
| `landmark` | `text` | — | — | Free-text nearby-landmark string for directions. |
| `notice_period_months` | `integer` | `1` | — | Rent-only field; visibility gated in Prompt 8 via `visibleWhen` on `listing_type === 'rent'`. |
| `annual_rent_increase_pct` | `numeric` | — | CHECK 0–100 | **Always public** on PropertyDetail (D-136). |
| `water_storage` | `text` | — | CHECK IN `sump_only` \| `overhead_only` \| `both` \| `none` | Enum-string via CHECK (no Postgres ENUM type). |

**Wiring status:** schema only. No `PROPERTY_FIELDS` entry, no surface rendering, no save path. Prompt 8 wires spec + ListProperty + admin PropertyEdit + PropertyDetail.

## 20. Phase 1.5 Prompt 9 — rent/sale schema (applied via MCP; migration name `phase_1_5_prompt_9_rent_sale_schema`)

New enum type + 9 columns on `public.properties`. Applied directly through MCP — no file in `supabase/migrations/`. Types.ts regenerated. All 20 existing rows backfilled with `listing_type = 'rent'` — backward-compatible.

**New enum:** `public.property_listing_type` with values `'rent'`, `'sale'`.

**New column (NOT NULL):**

| Column | Type | Default | Notes |
|---|---|---|---|
| `listing_type` | `property_listing_type` | `'rent'` | NOT NULL. Default guarantees backward compatibility with existing rent rows. |

**New sale-specific columns (all nullable):**

| Column | Type | Constraint | Notes |
|---|---|---|---|
| `sale_price` | `numeric` | CHECK ≥ 0 | Total sale amount in INR. Required for sale submissions (Prompt 10 wires the trigger branch). |
| `price_negotiable` | `boolean` | — | Owner-declared. Displayed as-is. |
| `expected_price_per_sqft` | `numeric` | CHECK ≥ 0 | **Manual input**, not auto-calculated from `sale_price / square_footage`. |
| `possession_status` | `text` | CHECK IN `ready_to_move` \| `under_construction` \| `new_launch` | Enum-string via CHECK (no PG ENUM type). |
| `possession_date` | `date` | — | Sale-equivalent of `available_from` (D-135). Two separate columns — do not repurpose `available_from` for sale listings. |
| `rera_registration_number` | `text` | — | Optional; strongly recommended for under-construction. |
| `khata_type` | `text` | CHECK IN `A` \| `B` \| `not_applicable` | Karnataka property title classification. |
| `property_tax_paid_upto` | `date` | — | Verification signal for buyers. |

**Wiring status:** schema only. No `PROPERTY_FIELDS` entry, no surface rendering, no save path, no `visibleWhen` on rent-only fields. Prompt 10 does all of that AND updates the `enforce_property_owner_transitions` trigger per D-160.

**Backfill audit:** all 20 existing rows have `listing_type = 'rent'`. Sale columns are NULL on every existing row (nothing to migrate).

## 21. Phase 1.5 Prompt 11 — comms schema (applied via MCP)

### RPC: `reject_property_listing(p_property_id uuid, p_reason text, p_reason_text text DEFAULT NULL) RETURNS void`
Admin-only (checks `is_admin()`). Transitions `pending_review → changes_requested` on `properties`, then INSERTs a `property_activity_log` row with `action='listing_rejected'`, `payload = { summary, reason, reason_text, from_status:'pending_review', to_status:'changes_requested' }`, `is_public=false`. Atomic — a failure at either step rolls back.

Mirrors `reject_edit_request`. Frontend call site: `src/pages/admin/ListingReviewDetail.tsx:requestChangesOnNewListing`.

### `owner_action_acknowledgments.activity_log_id` (new column) + new unique index

Column: `activity_log_id uuid REFERENCES property_activity_log(id) ON DELETE CASCADE`. Nullable — legacy rows keep NULL.

Old unique constraint on `(user_id, target_type, target_id)` was DROPPED. Replaced with unique index:
```sql
CREATE UNIQUE INDEX owner_action_acknowledgments_scoped_unique
  ON owner_action_acknowledgments (user_id, target_type, target_id, activity_log_id)
  NULLS NOT DISTINCT;
```

`NULLS NOT DISTINCT` means two rows with the same 3-tuple and NULL `activity_log_id` collide (matches pre-Prompt-11 semantics for legacy rows); rows with distinct `activity_log_id`s coexist (enables per-rejection ack tracking, D-141).

Backfill: 1 pre-existing semantically-malformed row was deleted during migration.

### `property_activity_log_writer` trigger — skip when transitioning to `changes_requested`

The trigger's log-emission branch now short-circuits when `NEW.status = 'changes_requested'`. The RPC (`reject_property_listing`) owns the log entry for that transition — no double-log. All other status transitions still emit via the trigger as before.

**Wiring status:** fully wired in Prompt 11 (D-163). RejectionPanel + StatusGuidance components consume this schema.

## 22. Phase 1.5 Prompt 12 — admin visibility G1 (applied via MCP)

### RPC: `admin_delete_draft_property(p_property_id uuid) RETURNS void`
Admin-only (checks `is_admin()`). Guards, in order:
1. Property exists → else RAISE.
2. `status = 'draft'` → else RAISE ("Only draft properties may be deleted").
3. No `applications` rows reference the property → else RAISE ("Property has N applications; archive instead").
4. No `visits` rows reference the property → else RAISE ("Property has N visits; archive instead").

Then `DELETE FROM properties WHERE id = p_property_id`. Cascading FKs handle the remaining child tables.

Frontend call site: `src/pages/admin/Properties.tsx:confirmDelete` (Delete draft row action). Never call raw `.delete()` from client — the RPC is the only supported deletion path.

### FKs referencing `properties(id)` — deletion behavior reference

| Child table | On delete | Notes |
|---|---|---|
| `property_images` | CASCADE | Photos in Cloudflare R2 remain — separate cleanup job would be needed to purge those; scoped as post-launch. |
| `property_activity_log` | CASCADE | |
| `property_edit_requests` | CASCADE | |
| `property_inspections` | CASCADE | |
| `favourites` | CASCADE | |
| `inspection_callbacks` | CASCADE | |
| `applications` | NO ACTION | Blocks delete — RPC guard raises before reaching this. |
| `visits` | NO ACTION | Blocks delete — RPC guard raises before reaching this. |
| `leases`, `agreements`, `payments`, `keys_tracking`, `maintenance_requests`, `property_condition_reports`, `owner_action_log` | NO ACTION | Should never appear for a `draft` property; if they do, Postgres blocks with FK violation and the RPC surfaces the error message. |

### Existing RLS (unchanged, cited for reference)
- `users_select_own` = `(id = auth.uid()) OR is_admin()` — admin cross-user reads for the search index are permitted.
- `properties_delete` = `is_admin()` — admin CAN raw-DELETE, but the RPC is the required client entry point (adds guards + preserves invariants).
- `enforce_property_owner_transitions` — admin bypasses via `is_admin()`, so restore-archived (`.update({ status: 'unlisted' })`) succeeds without needing the trigger's allowed-transition list.

## 23. Phase 1.5 Prompt 13 — G2+G3 admin visibility (data-source reference, no schema change)

### G2 (ListingReviewDetail) — no schema change
Reads the full `properties` row plus the existing edit request payload. Admin-only `flat_number` line respects the spec's `audiences: ['admin_form']` — no leak to public surface (D-091). Field render matches spec ordering; no server-side additions.

### G3 (DecisionsTab) — data source table

| Decision kind | Source table | Filter | Effective timestamp | Actor field | Reason field |
|---|---|---|---|---|---|
| `listing_approved` | `property_activity_log` | `action = 'listing_approved'` | `created_at` | `actor_id → users(full_name)` | none (payload has no reason) |
| `listing_rejected` | `property_activity_log` | `action = 'listing_rejected'` | `created_at` | `actor_id → users(full_name)` | `payload.reason` — legacy pre-Prompt-11 rows may be null (render "—") |
| `edit_approved` | `property_edit_requests` | `status = 'approved'` | `reviewed_at ?? created_at` | `reviewed_by → users(full_name)` | none |
| `edit_rejected` | `property_edit_requests` | `status = 'rejected'` | `reviewed_at ?? created_at` | `reviewed_by → users(full_name)` | `rejection_reason` |
| `edit_withdrawn` | `property_edit_requests` | `status = 'withdrawn'` | `reviewed_at ?? created_at` (usually created_at) | none (owner action) — render "Owner" | none |
| `edit_superseded` | `property_edit_requests` | `status = 'superseded'` | `reviewed_at ?? created_at` (usually created_at) | none (system action) — render "—" | none |

### Anti-pattern: never UNION
Edit decisions live only in `property_edit_requests`. Do NOT pull `edit_approved`/`edit_rejected` from `property_activity_log` — the writer trigger is suppressed for those transitions, but even if a future migration re-enables it, the RPCs are the source of truth. UNION-ing the two tables would double-count.

### Photo prefetch
Same pattern as Prompts 4/5 admin surfaces: single `property_images` query with `.in('property_id', [...ids]).eq('is_primary', true)`, build a `Map<property_id, url>` client-side.

### Row navigation
Rows link to `/owner-dashboard/property/:id`. No separate `/admin/decisions/:id` route — the owner property-management page's Activity Timeline is the richer historical view and is already admin-viewable.

## 24. Phase 1.5 addendum — move-in charges + brokerage (applied via MCP, D-166)

Four new nullable columns on `public.properties`. All optional; no backfill needed (20 existing rows kept NULL).

| Column | Type | Default | Constraint | Notes |
|---|---|---|---|---|
| `move_in_charges_amount` | `numeric` | — | CHECK ≥ 0 | Rent-side one-time cost. |
| `rent_brokerage_type` | `text` | — | CHECK IN `none` \| `fixed` \| `months` | Free-text with CHECK, matching D-159 `water_storage` pattern (no PG ENUM). |
| ~~`rent_brokerage_amount`~~ | — | — | — | **DROPPED in Sync Prompt 3 (D-169)** — overloaded column split into `rent_brokerage_fixed_amount` + `rent_brokerage_months` below. Zero data loss (column was empty). |
| `rent_brokerage_fixed_amount` | `numeric` | — | CHECK ≥ 0 | Rupees. Populated when `rent_brokerage_type='fixed'`; NULL otherwise. Spec `visibleWhen` gates render to type=fixed. D-169. |
| `rent_brokerage_months` | `numeric` | — | CHECK ≥ 0 | Month count. Populated when `rent_brokerage_type='months'`; NULL otherwise. Spec `visibleWhen` gates render to type=months. D-169. |
| `sale_brokerage_pct` | `numeric` | — | CHECK 0–10 | Percentage. Upper bound 10 is generous — 5 is more typical in Bengaluru sale transactions. Adjustable via DROP + ADD CONSTRAINT if edge cases surface. |

**Wiring status:** fully wired in D-166 (spec + owner form Section 3 + Sale section + admin PropertyEdit + public rent/sale Cards).

**Not touched:** `PUBLIC_DETAILS_GRID_KEYS` (bespoke render in existing Cards, same as `sale_price`/`price_negotiable`/`expected_price_per_sqft` per D-162), `enforce_property_owner_transitions` trigger (D-160 — none of the 4 fields are required for submit), any RLS policy, any RPC.

## 25. Phase 1.5 Sync series summary (D-167–D-171)

Five-prompt parity-audit cleanup after Phase 1.5 shipped. All frontend + one schema change; no RLS/RPC/trigger changes.

- **Sync P1 (D-167)** — `PropertyDetail.formatDeposit` prefers `security_deposit_amount` over `months × rent`; `ensurePrimaryPhoto` cover auto-select on both surfaces; audience corrections on `security_deposit_months` (widened to public), `state`+`pincode` (narrowed off public — TODO(P2)); `property_type` public label via `PROPERTY_TYPE_OPTIONS`. Data migration (MCP): 2 legacy `pet_policy` free-text rows normalized to canonical enum.
- **Sync P2 (D-168)** — `<SpecField input='date'>` branch with `datePickerOptions?: { warnOnPast?, maxDaysFromNow? }`. All 3 date fields (`available_from`, `possession_date`, `property_tax_paid_upto`) spec-driven on owner + admin; 6 bespoke Popover+Calendar blocks removed. Admin `available_from` gains amber past-date warning + 90-day cap (parity with owner).
- **Sync P3 (D-169)** — brokerage column split (see §24): `rent_brokerage_amount` dropped, replaced by `rent_brokerage_fixed_amount` + `rent_brokerage_months`. `gas_type` spec gains `'none'` option (caller-side transform writes NULL). `pet_policy` admin migrated from free-text `<Input>` to `<SpecField>` select. `types.ts` regenerated.
- **Sync P4 (D-170)** — `<FurnishingEditor>` + `<AmenitiesEditor>` shared components in `src/components/property/`. Owner FormState migrated to JSONB shape (`furnishing_detail: FurnishingDetailItem[]` + flat `building_amenities: string[]` with customs mixed). Admin gains custom-items UI (previously absent). `FurnishingDetailItem` + `buildAmenitiesJson` in `@/types/property`; admin imports options from `@/config/property-form` (owner canonical).
- **Sync P5 (D-171)** — `security_deposit_months` owner input added to Section 3 alongside chips (chips now write BOTH amount and months). `maintenance_included` FormState key renamed to `maintenance_included_in_rent` (matches DB column; bridge removed). Dead `furnishingItems` state removed from `PropertyEdit.tsx` (D-170 follow-up). `CLAUDE.md` trimmed from 438 → ~275 lines. Full history: `commons-decisions.md` D-001–D-171.

**Not touched by any sync prompt:** RLS policies, RPCs, triggers, edge functions, `client.ts`, `config.toml`, any migration file (only schema change was via MCP in P3).

## Phase 2 Schema (D-172–D-173)

### `rental_preferences` table (D-172)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK→users | UNIQUE — one row per user |
| preferred_city | text | nullable |
| preferred_localities | text[] | nullable |
| move_in_by | date | nullable; UI enforces future-only, max 90d |
| number_of_occupants | integer | default 1, CHECK 1–20 |
| age | integer | nullable, CHECK 16–100 |
| gender | text | nullable, CHECK (male/female/other) |
| marital_status | text | nullable, CHECK (single/married/family/live_in) |
| occupation | text | nullable, CHECK (salaried/self_employed/student/retired/other) |
| occupation_other | text | nullable, free text when occupation='other' |
| diet_preference | text | nullable, CHECK (veg/non_veg) |
| has_pets | boolean | default false |
| pet_types | text[] | nullable, populated when has_pets=true |
| expected_stay_duration | text | nullable, CHECK (less_than_6_months/6_to_11_months/1_year/2_years/3_years_plus/flexible) |
| is_foreign_citizen | boolean | default false |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | auto-updated by trigger |

RLS: SELECT/INSERT/UPDATE own row (user_id = auth.uid()). No DELETE policy.
Phase 3 reads this table via service role to snapshot into contact_requests.

### `public_profiles` view fix (D-173)
View now exposes: user_id, full_name (from users), profile_photo_url, bio,
display_name, is_public (last 4 from profiles LEFT JOIN).

## Phase 3 Schema

### New enums

**`public.contact_request_status`** — `pending | approved | declined | withdrawn | auto_cancelled`.

**`public.contact_request_decline_reason`** — `preferences_dont_fit | property_currently_unavailable | prefer_to_wait | not_the_right_fit | property_no_longer_available`. Required when transitioning to `declined` (D-P3-007).

### `contact_requests` (17 columns)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| property_id | uuid | no | — | FK properties(id) ON DELETE CASCADE |
| tenant_id | uuid | no | — | FK users(id) ON DELETE CASCADE |
| owner_id | uuid | no | — | FK users(id) ON DELETE CASCADE. Denormalised for RLS + rate-limit perf; must match properties.owner_id at INSERT time (app-enforced, not DB-enforced). |
| status | contact_request_status | no | 'pending' | |
| attempt_number | integer | no | 1 | CHECK BETWEEN 1 AND 3. Auto-set by `check_contact_request_limits()` trigger — do NOT set from client. |
| decline_reason | contact_request_decline_reason | yes | — | Required at UPDATE-to-declined time (app-enforced). |
| tenant_message | text | yes | — | CHECK char_length ≤ 200. |
| tenant_profile_snapshot | jsonb | no | '{}' | Frozen at INSERT (D-P3-002). |
| consent_checked_at | timestamptz | no | now() | D-P3-010. |
| consent_terms_version | integer | no | 1 | D-P3-010. |
| withdrawn_at | timestamptz | yes | — | Set once by event-timestamp trigger. |
| auto_cancelled_at | timestamptz | yes | — | Set once by event-timestamp trigger. |
| declined_at | timestamptz | yes | — | Set once by event-timestamp trigger. Feeds cooldown calc. |
| approved_at | timestamptz | yes | — | Set once by event-timestamp trigger. Triggers email flow (Phase 3 Prompt 4). |
| created_at | timestamptz | no | now() | Feeds daily rate limit (IST calendar day). |
| updated_at | timestamptz | no | now() | Auto-maintained by `set_contact_requests_updated_at`. |

### Indexes on `contact_requests`

- **`contact_requests_one_active_per_property`** — UNIQUE partial index on `(tenant_id, property_id)` WHERE `status IN ('pending','approved')`. Enforces "at most one live request per tenant/property pair". A declined/withdrawn/auto_cancelled row does not block a fresh INSERT — that is how re-attempts work.
- Standard btree indexes on `property_id`, `tenant_id`, `owner_id`, `status`.

### `email_send_log` (9 columns)

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| contact_request_id | uuid | yes | FK contact_requests(id) ON DELETE CASCADE. Nullable to allow non-contact-request emails later. |
| resend_message_id | text | yes | Resend's message id — populated on `sent`. Later webhook events keyed by this. |
| event_type | text | no | `sent` / `delivered` / `bounced` / `complained` / `failed` etc. Free-text (not enum) to accept whatever Resend emits without a migration. |
| recipient_user_id | uuid | yes | FK users(id) ON DELETE SET NULL. |
| recipient_email | text | yes | Snapshotted address at send time — survives user email edits. |
| error_reason | text | yes | Populated on failure webhook events. |
| raw_payload | jsonb | yes | Full Resend webhook body for debugging. |
| created_at | timestamptz | no | |

### Triggers

**`trg_contact_request_limits`** (BEFORE INSERT on contact_requests) → `check_contact_request_limits()`.

Adapted from `check_application_limits()` with **4 documented divergences** (must never regress toward PM semantics):
1. Only `declined` burns an attempt. `withdrawn` and `auto_cancelled` are free retries.
2. Flat **24h** cooldown after each decline (not PM's escalating 2d / 7d / permanent ladder).
3. **No `previous_request_id` FK.** Attempts linked by `(tenant_id, property_id, attempt_number)` alone.
4. **No draft state**, so no draft guard clause.

Additional Phase 3 rule: enforces global **10 requests / calendar day IST** per tenant.

**`trg_auto_cancel_requests_on_archive`** (AFTER UPDATE OF status on properties) → `auto_cancel_requests_on_archive()`. Fires only on transition INTO `archived`. Sets pending contact_requests for the property to `auto_cancelled`. `unlisted`, `changes_requested`, `edit_pending_review` do NOT trigger this (D-P3-005).

**`trg_contact_request_event_timestamps`** (BEFORE UPDATE on contact_requests) → `set_contact_request_event_timestamps()`. Writes declined_at / approved_at / withdrawn_at / auto_cancelled_at on the first transition into each state. Guarded by `OLD.status IS DISTINCT FROM NEW.status` — each timestamp set exactly once, never overwritten.

**`trg_contact_requests_updated_at`** (BEFORE UPDATE on contact_requests) → `set_contact_requests_updated_at()`. Standard `updated_at = now()`.

### RLS policies

RLS enabled on both tables.

- `contact_requests_select` — `tenant_id = auth.uid() OR owner_id = auth.uid() OR is_admin()`. **Deliberate deviation** from `applications_select`: no `status <> 'draft'` clause (no draft state exists).
- `contact_requests_insert` — `authenticated` role, `tenant_id = auth.uid()` AND `owner_id <> auth.uid()` (blocks self-request).
- `contact_requests_update` — tenant OR owner OR admin.
- **No DELETE policy** on contact_requests — records are immutable audit history.
- `email_send_log_admin_select` — `is_admin()` only. No INSERT/UPDATE/DELETE policies — service_role bypasses RLS for Resend webhook writes.

### RPC / function

```sql
get_owner_response_rate(p_owner_id uuid) RETURNS TABLE (
  all_time_total     integer,
  all_time_responded integer,
  all_time_rate      numeric,   -- percentage, one decimal
  last_7d_total      integer,
  last_7d_responded  integer,
  last_7d_rate       numeric
)
```

Responded = `status IN ('approved','declined')`. Excluded from denominator: `pending`, `withdrawn`, `auto_cancelled` (D-P3-009). SECURITY DEFINER, STABLE, granted to `authenticated` and `anon` (public profile page).

### Local migration files (documentation-only mirrors)

Applied via Supabase MCP on 2026-07-17. Local files written manually as documentation — will NOT be re-run against production:
- `20260717000001_phase3_contact_requests_enums.sql`
- `20260717000002_phase3_contact_requests_tables.sql`
- `20260717000003_phase3_contact_requests_triggers.sql`
- `20260717000004_phase3_contact_requests_rls.sql`

### RPC — `get_pending_requests_for_digest()` (Migration 20260717000006)

`get_pending_requests_for_digest()` — Returns `TABLE(owner_user_id uuid, owner_email varchar, owner_name varchar, new_request_count bigint, new_requests jsonb)`. `STABLE`, `SECURITY DEFINER`, `search_path=public`. Grouped by owner across all `contact_requests` in `pending` status with `created_at >= now() - interval '24 hours'`. `new_requests` is a JSONB array of `{building_name, locality, tenant_display, attempt_number, created_at}`, ordered by `created_at DESC` (COALESCE tenant_display = `profiles.display_name` else `users.full_name`). Granted to `anon` and `authenticated`. Called by n8n Contact Daily Digest workflow with the anon key — see D-P3-012 for the security pattern.

---

## Phase 3 addendum — auth & security functions (2026-07-18/19; D-P3-014–D-P3-019)

Applied via Supabase MCP; local files are documentation-only mirrors (same pattern as §"Local migration files"). Do NOT re-run against production.

### Trigger — `prevent_user_privilege_escalation` (BEFORE UPDATE on `public.users`)

```
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role           IS DISTINCT FROM OLD.role
  OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
  OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
  OR NEW.auth_provider  IS DISTINCT FROM OLD.auth_provider
  OR NEW.is_active      IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Not authorized to modify privileged user columns' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
```

- Guard gates on `current_user`, NOT JWT claims role (D-P3-015).
- `IS DISTINCT FROM` allows identical-value no-op writes silently (belt-and-braces during the D-P3-019 Profile.tsx transition).
- `search_path = public` pinned. Same pin also added to `handle_new_user` and `handle_user_updated` in this session; `is_admin()` already had it.

### RPC — `get_phone_fallback(p_user_id uuid) RETURNS text` (D-P3-016)

- `SECURITY DEFINER`, `search_path = public, auth`.
- Reads `auth.users.phone` (WHERE `phone_confirmed_at IS NOT NULL`) first; then `auth.identities.identity_data->>'phone'` as secondary fallback.
- Granted to `service_role` ONLY. `anon` and `authenticated` explicitly revoked.
- Called by `reveal-contact` v5 and `resend-reveal` v5 when `public.users.phone` is null. Both functions log a `skipped_no_phone` row to `email_send_log` if the fallback returns null.

### RPC — `touch_last_login() RETURNS void` (D-P3-018)

- `SECURITY DEFINER`, `search_path = public`.
- Updates `public.users.last_login_at = now()` for `auth.uid()`.
- Granted to `authenticated`. Called once per genuine `SIGNED_IN` event in `useAuth` (never on `INITIAL_SESSION`, `TOKEN_REFRESHED`, or cached-session reload).
- Direct client `.update()` on `public.users.last_login_at` is blocked by D-P3-014 guard — the RPC is the only touch path.

### `handle_user_updated` Block 2 fix (D-P3-017)

Block 2 now sources email + full_name from `auth.identities.identity_data` for the Google identity (previously read `NEW.email` which is NULL after `linkIdentity`). `ON CONFLICT DO UPDATE` clause uses `COALESCE(EXCLUDED.email, public.users.email)` and `COALESCE(EXCLUDED.full_name, public.users.full_name)` — never overwrites a non-null value with NULL. Block 1 (phone_confirmed_at path) unchanged.

### Migrations applied this session (2026-07-18/19)

- `prevent_user_privilege_escalation` — BEFORE UPDATE trigger + function
- `handle_user_updated_source_from_identities` — Block 2 rewrite
- `create_get_phone_fallback_rpc` — v1 of the phone fallback RPC (read `identity_data` only)
- `fix_get_phone_fallback_use_auth_users` — v2 reads `auth.users.phone` first, `identity_data` as fallback
- `touch_last_login_rpc` — the SIGNED_IN wiring RPC

---

## Google Maps Phase 1 — Address Schema (2026-07-25)

Migration: `20260725150706_google_maps_phase1_address_schema`
Applied via Supabase MCP to production. All changes are on `public.properties`.

### New columns (22)

#### Section 1: Google Places address components (15)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `place_id` | TEXT | yes | — | Google place ID (Path A only) |
| `formatted_address` | TEXT | yes | — | Full human-readable address from Google |
| `address_mode` | VARCHAR | yes | — | `'google_place'` \| `'manual'`; CHECK constraint |
| `street_number` | VARCHAR | yes | — | e.g. `"14"` |
| `route` | TEXT | yes | — | Street/road name e.g. `"CMH Road"` |
| `sublocality_1` | VARCHAR | yes | — | Primary neighbourhood e.g. `"Indiranagar"` |
| `sublocality_2` | VARCHAR | yes | — | Finer grain e.g. `"Domlur Division"` |
| `neighborhood` | VARCHAR | yes | — | Google neighborhood component |
| `district` | VARCHAR | yes | — | administrative_area_level_2 |
| `country` | VARCHAR | yes | `'India'` | |
| `plus_code` | VARCHAR | yes | — | Google Plus Code / DIGIPIN |
| `viewport_ne_lat` | FLOAT8 | yes | — | Map zoom fitting — NE corner latitude |
| `viewport_ne_lng` | FLOAT8 | yes | — | Map zoom fitting — NE corner longitude |
| `viewport_sw_lat` | FLOAT8 | yes | — | Map zoom fitting — SW corner latitude |
| `viewport_sw_lng` | FLOAT8 | yes | — | Map zoom fitting — SW corner longitude |

#### Section 2: Street View (4)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `streetview_available` | BOOLEAN | yes | — | null = not yet checked |
| `streetview_pano_id` | TEXT | yes | — | Panorama ID from Google |
| `streetview_checked_at` | TIMESTAMPTZ | yes | — | When last checked |
| `streetview_show_in_listing` | BOOLEAN | no | `FALSE` | Owner toggle to show/hide Street View in listing |

#### Section 3: Location verification (2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `location_verified_by_owner` | BOOLEAN | no | `FALSE` | Owner ticked confirmation checkbox |
| `location_verified_at` | TIMESTAMPTZ | yes | — | Timestamp when owner verified |

#### Section 4: Owner-facing flat number (1)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `lister_flat_number` | VARCHAR(10) | yes | — | CHECK: `^[A-Za-z0-9/-]{1,10}$`. Distinct from `flat_number` (admin-only, revealed on lease) |

### Modified columns (3)

| Column | Change | Reason |
|--------|--------|--------|
| `state` | `DEFAULT 'Karnataka'` removed | Reeve now serves all India |
| `city` | `NOT NULL` removed (now nullable) | Path B area-only selections may not return a city component |
| `street_address` | `NOT NULL` removed (now nullable) | Path A establishment selections may not have a route component |

### Untouched legacy columns (7)

These columns existed before Phase 1 and are unchanged:

| Column | Notes |
|--------|-------|
| `flat_number` | Admin-only; never public (D-091); revealed on lease signing |
| `flat_number_revealed` | Tracks whether flat_number has been disclosed |
| `google_maps_url` | Legacy free-text URL field; still writable via mapFieldToDb |
| `map_pin_url` | Legacy pin image URL |
| `notice_period_months` | Tenant notice period |
| `latitude` | Legacy coordinate (pre-Places API) |
| `longitude` | Legacy coordinate (pre-Places API) |
