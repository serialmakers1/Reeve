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
