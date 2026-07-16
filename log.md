## [2026-07-14] fix | Sync Prompt 5 (final) — security_deposit_months owner input, maintenance_included_in_rent bridge cleanup, dead furnishingItems removal, CLAUDE.md trim, commons memory consolidation [IST]

Closes the 5-prompt parity-audit sync series (D-171). Five targeted fixes + memory work in a single pass.

**1. `security_deposit_months` owner input** — spec entry has `owner_form + admin_form + public_detail` audiences since D-167, but no owner input existed. Added `<SpecField fieldKey="security_deposit_months" surface="owner_form" formValues={{ listing_type: form.listing_type }}>` directly below the security_deposit_amount chips in Section 3 (spec `visibleWhen: listing_type !== 'sale'` handles rent-only gating). Owner FormState + INITIAL_STATE + prefillFormFromRow extended; mapFieldToDb switch gained a case. 1/2/3-month chips now write BOTH `security_deposit_amount` (rent × N) AND `security_deposit_months` (N) via inline `setForm + patch` (single-key `updateField` doesn't fit two-key writes). Manual entry in either field overrides. Closes a latent bug — chips wrote amount but not months, so the D-167 public-detail annotation "₹70,000 (2 months)" only fired for rows an admin had edited.

**2. `maintenance_included` FormState rename** — local key was `maintenance_included`; DB column is `maintenance_included_in_rent`. Bridge existed at the Switch call site (`updateField('maintenance_included', v, { maintenance_included_in_rent: v })`). Renamed the key throughout — FormState interface, INITIAL_STATE, prefillFormFromRow, section-touched check, Switch call site. Bridge second-arg dropped: `updateField('maintenance_included_in_rent', v)` writes directly. Added `case "maintenance_included_in_rent": return { maintenance_included_in_rent: !!value }` to mapFieldToDb — was missing before (only reachable via the dbPatch second-arg, which is now gone). PropertyPreview payload continues to use `maintenance_included: form.maintenance_included_in_rent` — preview owns its own shape; annotated with a `// preview payload key is intentional` comment.

**3. Dead `furnishingItems` state removed** — D-170 orphaned this state when admin's amenities save switched to `buildAmenitiesJson(buildingAmenities, furnishingDetail)`. Deleted both the `useState<string[]>([])` declaration at L119 and the `setFurnishingItems(...)` call at L314. Also dropped the `amenities.furnishing_items` array hydration line — that key is now derived on save from `furnishingDetail`. `grep furnishingItems src/pages/admin/PropertyEdit.tsx` → zero code references (only the D-171 comment).

**4. CLAUDE.md trimmed** — from 438 lines to ~275. Removed: verbose per-prompt narratives now captured in `commons-decisions.md`; duplicate auth rules (the same "never call getSession in render" rule was stated three times); Phase 1 per-prompt implementation logs. Preserved (all load-bearing): the entire "DO NOT" list, typecheck baseline + command, SSG route classification + rules, all auth infrastructure invariants (noOpLock, deferred callback, safety timeout, phone verify flow), RLS patterns, visit RPC contract + status machine, NewApplication render-guard order, SpecField rules including the `!== 'sale'` fail-safe, save pipeline (D-153/154), shared JSONB editors (D-170), Payments idempotency contract, Skills reference, PropertyDetail CTA priority. Every remaining D-XXX reference still points at a real decision that CC needs to know. Full history in `commons-decisions.md` D-001–D-171.

**5. Commons memory consolidation**
- `commons-schema.md` §24 already had the brokerage split annotation (D-169). Added §25 sync-series summary paragraph (D-167–D-171).
- `commons-forward-plan.md` Phase 2 candidates gained: `state`/`pincode` as public search filters (TODO(P2) tags in spec entries; when wired, re-add `public_detail` to audiences + address-line render on PropertyDetail); note on Google Places entry that `landmark` field is already spec-plumbed from Phase 1.5 Prompt 8, only the autocomplete flow needs wiring. Added "Sync notes (Phase 1.5 addendum)" section at end pointing at commons-decisions.md as source of truth.
- `commons-decisions.md` D-171 records this prompt.

Untouched: `<SpecField>`, `PROPERTY_FIELDS`, `PUBLIC_DETAILS_GRID_KEYS`, `PropertyDetail.tsx`, `useListingSave`, D-153/154 defense stack, D-160 trigger, D-091/111 boundaries, all migrations/RPCs/RLS/types.ts/config.toml/client.ts, `FurnishingEditor.tsx`, `AmenitiesEditor.tsx`, `Header.tsx`, `Footer.tsx`, `BottomNav.tsx`, `Index.tsx`.

Tests: **9 files / 82 tests pass** (no new tests — all changes are rename + spec-driven input). `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta). `grep maintenance_included[^_] src/pages/ListProperty.tsx` returns only the preview-payload comment (intentional). `grep furnishingItems src/pages/admin/PropertyEdit.tsx` returns only the D-171 comment.

**Phase 1.5 + Sync series complete.**

## [2026-07-14] refactor | Sync Prompt 4 — FurnishingEditor + AmenitiesEditor extracted as shared components; owner + admin both consume them; custom items editable on both surfaces [IST]

Consolidation of the last two duplicated JSONB editors (D-170). Diagnostic surfaced structural divergence not just visual: owner used decomposed local state (`furnishing_items` + `_counts` + `_sizes` + `_rooms` + `custom_furnishing` + `custom_amenities`) with `buildFurnishingDetail(f)` deriving the JSONB before patch; admin used raw JSONB state (`furnishingDetail: FurnishingDetailItem[]`) but had NO custom-items UI at all. User picked JSONB-canonical reconciliation — bigger refactor, keeps admin's per-item size/rooms metadata, gives admin custom-items UX for the first time.

**New shared type module** (`src/types/property.ts`): `FurnishingDetailItem` (was inline in both surfaces), `AmenitiesJson`, `buildAmenitiesJson(building, furnishingDetail)` — the JSONB derivation helper (previously owner-only as `buildAmenitiesJson(f)`). `@/config/property-form` re-exports `FurnishingDetailItem` for backward-compat.

**New shared component** `src/components/property/FurnishingEditor.tsx`: canonical checkbox grid over `FURNISHING_ITEM_OPTIONS` with per-item count (unless `yesNoOnly`), per-item size text (when `hasSizeText`), per-item rooms text (when `hasRooms`); custom items list with name+count+delete. Layout uses owner's `rounded border p-2` per-item card with `border-primary bg-accent/30` on checked. Emits full `FurnishingDetailItem[]` on every mutation.

**New shared component** `src/components/property/AmenitiesEditor.tsx`: canonical `BUILDING_AMENITIES` checkbox grid + custom string list. Value is a flat `string[]` — component derives canonical vs custom via a `Set<string>` of canonical values. Emits the flat array on every mutation.

**Owner FormState migration**: removed `furnishing_items`, `furnishing_counts`, `furnishing_sizes`, `furnishing_rooms`, `custom_furnishing`, `custom_amenities`. Added `furnishing_detail: FurnishingDetailItem[]`. Retained `building_amenities: string[]` with new semantic (flat, canonical+custom mixed). Deleted `CustomItem` interface — customs now live inside `furnishing_detail` with `custom: true`. Deleted `buildFurnishingDetail(f)` helper; deleted old form-taking `buildAmenitiesJson(f)` (replaced by shared 2-arg version).

Owner-touching sites updated in one pass: `prefillFormFromRow` hydrates `furnishing_detail` + flat `building_amenities` directly (dropped 5 lines of decomposition); `isSectionTouched` + `sectionSummary` for Sections 4/5 read new keys (`furnishing_detail.filter((it) => !it.custom || it.item.trim()).length`); `PropertyPreview` payload continues to send split `building_amenities` + `custom_amenities` (preview owns its own shape — split via `.filter` at the callsite so preview UX stays byte-identical). Section 4 render collapsed from 58 lines to a single `<FurnishingEditor value onChange>` call; Section 5 collapsed from 40 lines to a single `<AmenitiesEditor>` call. Both `onChange` handlers `setForm` + `patch()` (D-153 buffer preserved).

**Admin PropertyEdit changes**: deleted 3 admin-local const copies (`FURNISHING_ITEMS`, `BUILDING_AMENITIES`, `FURNISHING_ITEM_OPTIONS`) — imported from `@/config/property-form` (owner canonical was more complete: has `stove`, `chimney`, `fan`, `exhaust_fan`, `curtain_rod` vs admin's stale `curtains`). Deleted local `FurnishingDetailItem` interface — imported from `@/types/property`. Furnishing block collapsed from 65 lines to `<FurnishingEditor value={furnishingDetail} onChange={setFurnishingDetail} />`. Amenities block collapsed from 10 lines to `<AmenitiesEditor value={buildingAmenities} onChange={setBuildingAmenities} />`. handleSave amenities now derived via shared `buildAmenitiesJson(buildingAmenities, furnishingDetail)` — old inline `{ furnishing_items: furnishingItems, building: buildingAmenities }` gone; `furnishingItems` state var now dead (unused; scheduled cleanup).

**Constants unified**: `FURNISHING_ITEM_OPTIONS.hasSize` renamed `hasSizeText` for consistency with admin's naming (owner's `hasSize` was misleading — it drove a text input, not a numeric size). Single find-and-replace across `property-form.ts`.

**Visual parity**: shared components use owner's per-item card layout (`rounded border p-2 transition-colors` + accent on check). Admin's earlier layout differed slightly (`p-3`); extraction normalizes to owner canonical per prompt's "use owner's version as canonical" instruction. Admin now shows per-item size text on bed/mattress + rooms text on AC — same as before, plus the custom-items UX it lacked.

**Tests**: new `src/test/jsonb-editors.test.tsx` — 10 tests covering `FurnishingEditor` (renders standard + custom from value; toggles emit `{item, count}`; yesNoOnly emits `{item}` alone; `+ Add item` appends `{item:"", custom:true}`; removal on second toggle) + `AmenitiesEditor` (splits value into canonical vs custom; toggle adds/removes; `+ Add amenity` appends empty string) + `buildAmenitiesJson` (preserves flat building array; derives `furnishing_items` from non-custom detail entries). Full suite: **9 files / 82 tests pass** (was 8/72; +1 file, +10 tests). `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta; one drive-by narrowing cast in AmenitiesEditor to widen the Set generic).

**Public detail untouched** — PropertyDetail.tsx renders furnishing_detail + amenities via existing bespoke accordion/chips (display-only, out of scope per prompt).

Memory: D-170 in commons-decisions.md; CLAUDE.md gained the Sync Prompt 4 invariant. CLAUDE.md is at 438 lines (over the 200 heuristic) — trim deferred; each Phase 1.5 line is load-bearing.

## [2026-07-14] refactor | Sync Prompt 3 — brokerage column split (fixed_amount + months), gas_type None option, pet_policy admin migrated to SpecField select [IST]

Three data-drift fixes shipped (D-169). Schema changes already applied via MCP before this prompt — no migration files created here.

**1. Brokerage column split.** `rent_brokerage_amount` (overloaded — rupees when type=fixed, months when type=months) dropped. Two new nullable numeric columns: `rent_brokerage_fixed_amount` (rupees, populated when type=fixed) and `rent_brokerage_months` (months, populated when type=months). Zero rows had data at cutover — no backfill. Matches the D-131 `security_deposit_amount` + `security_deposit_months` precedent. `types.ts` regenerated via MCP.

Spec: `rent_brokerage_amount` entry deleted; two new entries with fail-safe `visibleWhen` (`listing_type !== 'sale'` + strict type match — `=== 'fixed'` and `=== 'months'` respectively). Both `ownerSection: 'rent_deposit'`, `audiences: ['owner_form', 'admin_form', 'public_detail']`, `editableBy: ['owner', 'admin']`, `input: 'number'`, `min: 0`.

Owner form (`ListProperty.tsx`): `FormState` / `INITIAL_STATE` / `prefillFormFromRow` / `mapFieldToDb` / `DB_COLUMN_TO_SECTION` all updated — 5 sites, single find-and-replace pattern per each. Bespoke dynamic-label brokerage `<Input>` at L1499-1515 replaced with two `<SpecField>` calls (each gated by spec `visibleWhen`); `formValues={{ listing_type, rent_brokerage_type }}` passed so predicate reads both. Dynamic label semantic removed — each field carries its own static label from spec (`"Brokerage amount (₹)"` / `"Brokerage (months of rent)"`).

Admin form (`admin/PropertyEdit.tsx`): `rentBrokerageAmount` state var split into `rentBrokerageFixedAmount` + `rentBrokerageMonths`. Hydration reads both DB columns separately. handleSave payload writes both. Single `<SpecField>` for the amount replaced with two.

Public detail (`PropertyDetail.tsx`): `PropertyData` interface + SELECT string extended with both new columns; old removed. Bespoke rent Card brokerage row now branches on type and reads the matching column. "As applicable" fallback dropped (dead code — each column is only meaningful for one type; the null-amount-but-set-type case is no longer reachable via the split).

**2. `gas_type` — 'None' option.** Spec `options` extended with `{value:'none', label:'None'}` at the head (inline; not touching the `GAS_TYPE_OPTIONS` constant so other consumers stay unchanged). CHECK constraint unchanged (`pipeline | cylinder | NULL`); the `'none'` sentinel is caller-side only, mapped to `null` on save.

Owner form: was bespoke `<Select>` at L1663 with hardcoded `GAS_TYPE_OPTIONS.map` (no None option → forced a selection). Replaced with `<SpecField>` — `value={form.gas_type || "none"}` for the display transform; `onChange` writes empty-string to local form (mapFieldToDb continues to translate "" → null) and explicit `dbPatch: { gas_type: null }` for the 'none' case.

Admin form: was bespoke `<Select>` at L1086 with a hardcoded `<SelectItem value="none">Not specified</SelectItem>` sentinel + duplicate Pipeline/Cylinder items. Replaced with `<SpecField>`. Existing handleSave payload logic `gas_type: gasType === "none" ? null : gasType || null` already handles the sentinel → NULL cast correctly, so no save-side change.

**3. `pet_policy` admin migrated to SpecField.** Was bespoke `<Input>` free-text with a `TODO(spec)` marker — legacy free-text values had blocked migration. Sync P1 MCP step normalized the 2 non-canonical rows ("No Pets Allowed" → `not_allowed`, "Pets Allowed" → `all_welcome`); all 20 rows now conform to the 4 canonical enum values (`not_allowed / small_only / all_welcome / case_by_case`). Admin swapped to `<SpecField fieldKey="pet_policy" surface="admin_form">`. `petPolicy` state var + save unchanged (still stores the enum string). Owner form was already `<SpecField>` — no owner change needed.

**Tests:** `src/test/property-fields.test.ts` — replaced the old `rent_brokerage_amount` compound-predicate test with two new tests (one per new column); added regression assertion that the old entry no longer exists in spec; added `gas_type` (3 options including 'none') and `pet_policy` (4 canonical options) assertions; updated addendum-shape iteration to enumerate both new brokerage keys. Full suite: **8 files / 72 tests pass** (was 68, +4). `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta).

`grep -rn rent_brokerage_amount src/` — only comment/test-reference hits remain (the D-169 migration comment in spec + the "removed from spec" regression assertion). Column fully purged from frontend.

Untouched: `<SpecField>` core (no new branches), `PUBLIC_DETAILS_GRID_KEYS` (brokerage stays bespoke), `useListingSave` + D-153/154 defense stack, D-160 rent/sale trigger, D-091 flat_number, D-111 admin direct-write, D-168 date branch. RPCs / triggers / RLS / migrations / config.toml / client.ts unmodified.

Memory: D-169 in commons-decisions.md; CLAUDE.md gained the Sync Prompt 3 invariant; commons-schema.md §24 annotated with the column split.

## [2026-07-14] refactor | Sync Prompt 2 — SpecField date branch implemented; 6 bespoke Popover+Calendar blocks replaced with spec-driven <SpecField input='date'> on owner + admin [IST]

Consolidation of the date-input fragmentation site (D-168). Diagnostic confirmed `SpecField` had no `case 'date'` (fell through to `default: return null`), and 3 date fields (`available_from`, `possession_date`, `property_tax_paid_upto`) each had bespoke Popover+Calendar blocks on both owner (`ListProperty.tsx`) and admin (`admin/PropertyEdit.tsx`) surfaces — 6 near-duplicate blocks total.

**Spec:** `PropertyFieldSpec` gained `datePickerOptions?: { warnOnPast?: string; maxDaysFromNow?: number }`. Extended 3 spec entries — `available_from` with the full D-146 config (`warnOnPast: "Available from is in the past — is this correct?"`, `maxDaysFromNow: 90`); `possession_date` and `property_tax_paid_upto` with empty `datePickerOptions: {}` (marker: the key's presence signals date-picker; no separate flag).

**SpecField `case 'date'`:** shadcn `<Popover>` + `<Calendar>` (mode single), value normalized via new `coerceDate()` (accepts `Date | ISO string | full ISO | null | undefined`, guards against `NaN`), `onSelect` emits `format(date, "yyyy-MM-dd")` or null. `disabled` predicate: always block `< 1900-01-01` baseline; when `maxDaysFromNow` is set, additionally block `> today + N days`. Amber warning `<p className="text-amber-600 text-xs mt-1">` renders below trigger when `warnOnPast` is set AND `isPastDate(selected)` (comparison at midnight — today is not flagged).

**Read-only branch** (public + owner/admin Tier-1-locked): date fields format via `format(new Date(value), "dd MMM yyyy")` regardless of spec `display()`. Applied to both `public_detail` card and shell read-only branches — single `displayText` derivation. Public rows for `possession_date` / `property_tax_paid_upto` / `available_from` now show `15 Jul 2026`, not raw ISO strings. Empty/null falls through to `formatFieldValue`'s em-dash for row-structure parity.

**Callsite pattern** (all 6 replaced): value is `Date` in local state; `onChange` emits `iso: string | null`. Bridge via `value={x as unknown} onChange={((iso) => …) as (v: unknown) => void}` — pragmatic vs. decoupling value in/out types in SpecField (would fragment the generic contract for one field type).

**Owner form (ListProperty.tsx):**
- `possession_date` block (was L1401-1416 bespoke, gated by `possession_status === 'under_construction'` outer conditional) → `<SpecField fieldKey="possession_date" surface="owner_form" formValues={{ possession_status: form.possession_status }}>`. `visibleWhen` from spec now gates render.
- `property_tax_paid_upto` block (was L1423-1438) → `<SpecField fieldKey="property_tax_paid_upto" surface="owner_form">`.
- `available_from` block (was L1480-1511 with inline warnOnPast IIFE + inline maxDaysFromNow disabled predicate) → `<SpecField fieldKey="available_from" surface="owner_form">`. Both D-146 behaviors now come from spec `datePickerOptions`.
- Unused imports removed: `Popover`/`PopoverContent`/`PopoverTrigger`, `Calendar`, `CalendarIcon`. `format` from `date-fns` retained (still used at L761 in `mapFieldToDb` + L1114 in preview).

**Admin form (admin/PropertyEdit.tsx):**
- `available_from` block (was L932-942) → `<SpecField surface="admin_form">`. **Deliberate behavior addition:** admin now shows amber past-date warning + 90-day future cap (parity with owner form; previously admin had neither). Justification: spec is source of truth; the rule applies everywhere the field renders. Admin can still pick past dates (warning, not block).
- `possession_date` block (was L963-973, gated by outer `possession_status === 'under_construction'` conditional) → `<SpecField formValues={{ possession_status: possessionStatus }}>`. `visibleWhen` now gates.
- `property_tax_paid_upto` block (was L979-989) → `<SpecField surface="admin_form">`.
- Unused imports removed: `Popover`/`PopoverContent`/`PopoverTrigger`, `Calendar`, `CalendarIcon`. `cn` retained (7 remaining uses); `format` retained (handleSave uses `format(d, "yyyy-MM-dd")` for DB payload).

**No behavior regression on owner form:** D-146 amber warning + 90-day cap preserved via spec. `possession_date` still conditionally rendered via spec `visibleWhen`. `property_tax_paid_upto` still shows unconditionally under `listing_type === 'sale'` branch. D-153/D-154 defense stack untouched. `useListingSave` untouched. RPCs/triggers/RLS/migrations/types untouched.

**Tests:** `src/test/property-fields.test.ts` +2 assertions: `available_from.datePickerOptions === { warnOnPast, maxDaysFromNow: 90 }`; `possession_date` + `property_tax_paid_upto` have `datePickerOptions` defined (empty). Full suite: **8 files / 68 tests pass**. `npx tsc -p tsconfig.app.json --noEmit` = **360** (baseline, no delta).

Memory: D-168 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the Sync Prompt 2 invariant.

## [2026-07-14] fix | Sync Prompt 1 — security deposit public display, cover auto-select on first upload, property_type label mapping, audience corrections on 3 spec entries [IST]

Five surface-bug fixes in one pass (D-167).

**1. Public deposit display** — new exported `formatDeposit(amount, months, rent)` helper on `PropertyDetail.tsx` (immediately below `formatIndianRupee`): prefers `security_deposit_amount` > 0 (annotates `(N months)` when months also set), falls back to `months × listed_rent`, then `2 × listed_rent` when both null. Replaced two render sites — the rent Card row at L1088 and the sidebar aside at L1356 (inside `COMMONS_HIDE` but kept in sync). Prior `depositAmount` const was NaN-prone when `security_deposit_months` was null despite the type saying NOT NULL; replaced with `depositDisplay`. `PropertyData` interface extended with `security_deposit_amount: number | null`; SELECT string extended to fetch it.

**2. `security_deposit_months` audience widened** — was `['admin_form']`; now `['owner_form', 'admin_form', 'public_detail']` with `editableBy: ['owner', 'admin']` and `ownerSection: 'rent_deposit'` (added to satisfy `validateSpec`). Matches actual usage — the 1/2/3 month chips indirectly reference; public deposit fallback reads. No new owner-form months input in this pass (chips continue to write to `security_deposit_amount` only, unchanged).

**3. `property_type` public label** — `PropertyDetail.tsx:955` badge now renders `PROPERTY_TYPE_OPTIONS.find(o => o.value === property.property_type)?.label ?? property.property_type` for the display label ("Apartment" instead of raw enum "apartment"). Defensive fallback to raw value for enum drift.

**4. `state` + `pincode` audiences narrowed** — removed `public_detail` (no render site). `// TODO(P2): re-add 'public_detail' if state/pincode become search filters or address-line renders` tags added above each entry.

**5. Cover auto-select on first upload** — new `src/lib/property-images.ts:ensurePrimaryPhoto(propertyId, uploadedImageId)`: reads primaries via `.select('id').eq('property_id', ...).eq('is_primary', true).limit(1)`, no-ops if any exist, else `UPDATE property_images SET is_primary = true WHERE id = uploadedImageId`. Fails closed on the count read (won't force-promote if state can't be verified). Called from both `ListProperty.tsx` (after both Path A and Path B upload branches) and admin `PropertyEdit.tsx`. Client-side `prevHadPrimary` snapshot mirrors the DB flip into local state so the "Cover" badge appears immediately without a refetch. Race window: two concurrent uploads on a zero-primary property could both self-promote — benign; owner resolves via manual "★ Cover" click. Manual `setPrimaryPhoto` handler untouched.

Data migration (applied via MCP before this prompt, D-167): 2 legacy `pet_policy` free-text rows mapped to canonical enum values — `"No Pets Allowed"` → `not_allowed`, `"Pets Allowed"` → `all_welcome`. All 20 rows now conform to `PET_POLICY_OPTIONS` (values `not_allowed / small_only / all_welcome / case_by_case`). Prep for Prompt 2 admin pet_policy Select migration.

D-153/154 buffering, D-160 trigger (unchanged), D-091/111 boundaries all preserved. Untouched: `<SpecField>`, `PROPERTY_FIELDS` entries beyond the 3 audience arrays, `PUBLIC_DETAILS_GRID_KEYS`, dates (deferred to Prompt 2), brokerage/pet_policy/gas_type wiring (deferred to Prompt 2), JSONB editors, `useListingSave`, migrations/RPCs/RLS.

Tests: new `src/test/format-deposit.test.ts` (5 assertions covering the 4 branches + zero-amount edge case); property-fields.test.ts +2 assertions (security_deposit_months audience widening; state/pincode narrowing). Full suite: 8 files / 66 tests pass. `npx tsc -p tsconfig.app.json --noEmit` = 360 (baseline, no delta).

Memory: D-167 in commons-decisions.md; CLAUDE.md Phase 1.5 gained the Sync Prompt 1 invariant.

## [2026-07-14] feature | Phase 1.5 addendum — move-in charges + brokerage wired end-to-end (4 cols on properties; spec + 3 surfaces; bespoke amount label + bespoke public Cards) [IST]

Regenerated `src/integrations/supabase/types.ts` via MCP: +85 / −1. Contains the 4 addendum columns (`move_in_charges_amount`, `rent_brokerage_type`, `rent_brokerage_amount`, `sale_brokerage_pct`) × 3 sections plus accumulated regens from Prompts 12/13 that weren't yet in the working copy. No unexpected drift.

Four spec entries added to `src/config/property-fields.ts` (D-166). Rent-side (`move_in_charges_amount`, `rent_brokerage_type`, `rent_brokerage_amount`) live in the `rent_deposit` section with `visibleWhen: (v) => v.listing_type !== 'sale'` — fail-safe pattern per D-161 (legacy null-listing_type rows render as rent). `rent_brokerage_amount` uses a compound `visibleWhen` reading BOTH `listing_type` and `rent_brokerage_type`, gated to `fixed`|`months`; SpecField's Prompt-10a signature `(values) => boolean` handles arbitrary predicates without any component change — architectural bet validated. `sale_brokerage_pct` lives in `sale` section with strict `=== 'sale'` (safe because sale is opt-in). Public formatters spec-declared for display: `₹{amount}` for move-in, `{pct}%` for sale brokerage. `PUBLIC_DETAILS_GRID_KEYS` deliberately NOT extended — bespoke public rendering per D-166.

`ListProperty.tsx` Section 3 gained a `"One-time charges"` sub-heading (`col-span-2 mt-2 pt-2 border-t border-border/60 text-xs font-semibold uppercase text-muted-foreground`) above the new rows — Section 3 rent mode hit 10 fields and needed the visual divider. Move-in charges and brokerage type render via `<SpecField>` with `formValues={{ listing_type: form.listing_type }}` for predicate gating. `rent_brokerage_amount` renders BESPOKE inline as a shadcn `<Input type="number">` inside a `<FormField>` — dynamic label flips between `'Amount (₹)'` (fixed) and `'Number of months'` (months) based on the sibling `rent_brokerage_type`; hidden entirely when type is `none` or unset. Same value preserved across type flips (single DB column, single form-state key). Spec entry still exists so admin surface + hydration + save all flow through `<SpecField>`. Sale section adds `sale_brokerage_pct` via `<SpecField>` right after `property_tax_paid_upto`. FormState + INITIAL_STATE + prefillFormFromRow + mapFieldToDb + DB_COLUMN_TO_SECTION all extended for the 4 new keys.

`admin/PropertyEdit.tsx`: 4 useState + hydration + save-payload entries + 4 `<SpecField surface="admin_form">` calls. Admin gets the static `'Brokerage amount'` label from spec (no dynamic overload — admins know what "amount" means in context). Passes `formValues={{ listing_type: listingType }}` (plus `rent_brokerage_type` for the compound predicate). Save via D-111 direct-write bypass.

`PropertyDetail.tsx`: PropertyData interface + SELECT extended for 4 new fields. Rent & Fees Card gets two bespoke rows inside the existing `space-y-2` one-time-costs block: `Move-in charges ₹{amount}` (hidden when null/0), `Brokerage ₹{amount}` for fixed / `Brokerage {N} month(s) rent` for months (respects singular/plural) / `Brokerage As applicable` fallback when type is set but amount is null. `none` and null type skip the row entirely. Sale Price Card gets `Brokerage {pct}%` line beneath expected/sqft (hidden when null/0). Same visual weight as sibling one-time-cost rows.

`property-fields.test.ts` gained 3 new assertions (all-4-entries shape guardrail, compound-visibleWhen truth table for `rent_brokerage_amount`, sale-only strict-equality behavior for `sale_brokerage_pct`) + a stale-count update (sale section now 9 fields, was 8). 59/59 tests pass across 7 files.

D-153/154 buffering, D-160 trigger (unchanged — none of the 4 fields are required for submit), D-111 admin bypass, D-091 flat_number invariant all preserved. Untouched: `<SpecField>` (compound predicate already supported), `useListingSave`, any migration/RPC/RLS/trigger, `PUBLIC_DETAILS_GRID_KEYS`, owner dashboard cards, admin queue, Search filters, Decisions tab.

Memory: D-166 appended to commons-decisions.md; commons-schema.md gained §24 (column-by-column table with the semantic-overload caveat + Phase 2 extraction note); CLAUDE.md Phase 1.5 gained the addendum invariant. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Phase 1.5 final baseline, no delta); `npx vitest run` = 7 files / 59 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 13 (final) — admin review detail shows full property + edit diff (G2); Decisions audit tab on /admin/listing-reviews with two-query merge (G3); Phase 1.5 complete [IST]

**G2** — `src/pages/admin/ListingReviewDetail.tsx` property snapshot expanded from ~12 fields to the full spec surface. `PropertyRow` interface extended with `flat_number` + all 7 Prompt-8 India columns (landmark, notice_period_months, annual_rent_increase_pct, water_storage, parking_2w_count, parking_4w_count, parking_notes) + all 9 Prompt-10 rent/sale columns (listing_type, sale_price, price_negotiable, expected_price_per_sqft, possession_status, possession_date, rera_registration_number, khata_type, property_tax_paid_upto). Snapshot now renders: an admin-only amber `Flat number` line at top (D-091 held — spec `audiences: ['admin_form']` means shared preview components never expose it publicly); a listing-type chip (Prompt 10b parity); a listing-type-conditional pricing block (Rent & Deposit for rent + legacy null-listing_type; Sale Details for sale, with `possession_date` conditional on `possession_status === 'under_construction'`); a Building & Society block with parking enum+count compound + water_storage + parking_notes; existing title/description/pet_policy/rules/notes sections preserved.

New `src/components/property-management/EditRequestDiff.tsx` — small focused component (label + proposedValue + liveValue) rendering the `Currently live: X` subtitle pattern in the same style as `OwnerPropertyManagement.FieldRow`. `ListingReviewDetail`'s pre-Prompt-13 3-column diff (label / current / proposed) was replaced with `<EditRequestDiff>` per changed field. Admin now sees the same visual pattern owners see (D-093 curated events).

**G3** — New third tab "Decisions" on `/admin/listing-reviews`. `TabValue` widened to `"new" | "edit" | "decisions"`; `TabsList` bumped to `grid-cols-3`; URL param `?tab=decisions` supported.

New `src/components/admin/DecisionsTab.tsx` fires TWO separate queries and merges client-side: `property_activity_log.select(*, properties(...), users:actor_id(...))` filtered on `action IN ('listing_approved', 'listing_rejected')` + `property_edit_requests.select(*, properties(...), users:reviewed_by(...))` filtered on `status IN ('approved','rejected','withdrawn','superseded')`. **Never UNION** — the anti-pattern is documented in D-165 and §23 to future-proof against consolidation attempts. Bulk photo prefetch via one `property_images.in('property_id', [...ids]).eq('is_primary', true)` query. Sort DESC by effective timestamp (`reviewed_at ?? created_at`).

Filters (all URL-persistent, all combinable): decision-type multi-select via checkboxes with colored badges — defaults to All; auto-restores to All if user unchecks everything (prevents "empty filter = zero rows" confusion). From/To date range on effective timestamp. Single-select Admin dropdown built from distinct actors in the merged set. Single-select City dropdown same. Reason cell truncated to 60 chars with tooltip on hover. Per-row subtitle `Currently: {getStatusDisplay(row.property.status).label}` — historical decision vs present state (a listing approved months ago might now be archived).

Row click → `/owner-dashboard/property/:id` (owner property-management page's Activity Timeline is the richer historical surface — no separate admin decision-detail page).

Legacy-data resilience baked in: null `payload.reason` on pre-Prompt-11 `listing_rejected` rows → reason cell shows "—"; null `reviewed_by` on withdrawn/superseded → "Owner" for withdrawn, "—" for superseded; rows where `properties` join returned null (property hard-deleted via Prompt 12 RPC) → filtered out silently client-side. `mergeDecisionRows` exported as a pure function; 7 test assertions cover merge/sort, legacy-null tolerance, effective-timestamp fallback, hard-deleted filtering, and photo attachment.

Preserved: existing approve/reject flows (Prompt 11 RPCs unchanged), current photos gallery, prior revisions section, page navigation. D-153/154 buffering, D-111 admin bypass, D-091 flat_number invariant, D-093 curated events all preserved. Untouched: any migration, any RPC/trigger/RLS, `useListingSave`, `SpecField`, `PROPERTY_FIELDS`, `PropertyDetail`, owner-facing pages, admin `PropertyEdit`. No `types.ts` regen — Prompts 7/9/11/12 kept it in sync; no new schema in Prompt 13.

Memory: D-165 appended to commons-decisions.md; commons-schema.md gained §23 (data-source table by decision kind + never-UNION anti-pattern note + photo prefetch pattern + row-nav rationale); CLAUDE.md Phase 1.5 gained the review-detail + Decisions-tab invariant and the "Phase 1.5 complete" marker. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 12 baseline, no delta); `npx vitest run` = 7 files / 55 tests pass (added 7 assertions in decisions-tab.test.ts).

## [2026-07-14] feature | Phase 1.5 Prompt 12 — admin properties gained filter/search/owner column + delete-draft (via RPC) and restore-archived row actions [IST]

Regenerated `src/integrations/supabase/types.ts` via MCP: +73 / −1. Diff includes the expected additions from every schema shipment since the last regen — the new `admin_delete_draft_property` RPC (Prompt 12), plus `activity_log_id` on `owner_action_acknowledgments` (Prompt 11), `property_listing_type` enum + 9 rent/sale columns (Prompt 9), 7 India columns (Prompt 7), `reject_property_listing` RPC (Prompt 11). No unexpected drift.

Rewrote `src/pages/admin/Properties.tsx` (D-164). Status filter Select: 8 Commons options (labels from `getStatusDisplay()`) + "Legacy PM" bucket (`.in('status', LEGACY_PM_STATUSES)` covering `inspection_proposed|inspection_accepted|inspection_scheduled|inspected|agreement_pending|occupied|off_market|expiring|turnover|inactive`). Server-side status filter for perf; client-side search over the fetched set. Search Input covers building_name + owner.full_name + owner.email + owner.phone (case-insensitive substring after 300ms debounce). URL params `?status=` and `?q=` persist filter/search across reloads and back-nav (`setSearchParams({ replace: true })`).

Owner column extended: join stays `owner:users!properties_owner_id_fkey(...)` but now selects `email` and `phone` too — used in the search haystack only; visible cell still shows `full_name` (fallback "—") per D-091 privacy. Search predicate extracted as pure `filterPropertiesBySearch()` export for test coverage.

Row actions gated by status:
- **Delete draft** (destructive, visible when `status='draft'`) → shadcn AlertDialog → `supabase.rpc('admin_delete_draft_property', { p_property_id })`. RPC pre-checks applications and visits and RAISEs with a legible message ("Property has N applications; archive instead") — surfaced via toast. Successful delete → refetch, toast "Draft deleted". CASCADE FKs handle `property_images` (R2 photo files remain — separate cleanup job scoped post-launch), `property_activity_log`, `property_edit_requests`, `property_inspections`, `favourites`, `inspection_callbacks`.
- **Restore** (secondary, visible when `status='archived'`) → AlertDialog → direct `.update({ status: 'unlisted' })`. Admin bypasses `enforce_property_owner_transitions` via `is_admin()`. `property_activity_log_writer` records the transition. Refetch + toast "Property restored to unlisted".

Row layout switched from `<button>` to `<div role="button" tabIndex={0}>` so nested action buttons don't create invalid DOM. Action `onClick`s call `e.stopPropagation()` so their clicks don't bubble to the row's navigate handler. Both mobile and desktop layouts include the action buttons.

New test `src/test/admin-properties.test.ts` — pure-function coverage of `filterPropertiesBySearch` (empty query, case-insensitive building match, owner name/email/phone matches, null-owner tolerance, no-match) + STATUS_FILTER_OPTIONS shape + LEGACY_PM_STATUSES completeness. 9 assertions, all pass. Full suite: 6 files / 48 tests pass.

Preserved: existing "Edit" navigation (row-scope click still goes to `/admin/properties/:id`), STATUS_COLORS map + badge rendering, applications/rents secondary queries, mobile+desktop layouts. Untouched: any migration, any RPC/trigger/RLS, `useListingSave`, `SpecField`, `PROPERTY_FIELDS`, admin `PropertyEdit`, D-153/154, D-091/110/111 boundaries.

Memory: D-164 appended to commons-decisions.md; commons-schema.md gained §22 (RPC signature + guard sequence, FK table grouped by delete rule with post-delete R2 cleanup caveat, RLS reference); CLAUDE.md Phase 1.5 gained the admin-properties invariant. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 11 baseline, no delta); `npx vitest run` = 6 files / 48 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 11 — comms shipped (H1 rejection panel, H2 activity_log_id ack scoping, H3 StatusGuidance); schema via MCP (rpc + trigger skip + ack column) [IST]

Wired D-163 owner comms end-to-end. Regenerated `src/integrations/supabase/types.ts` via MCP: +69 insertions / −1 (BOM strip) — exactly the expected additions: `activity_log_id: string | null` on `owner_action_acknowledgments` Row/Insert/Update + FK reference + `reject_property_listing` in Functions. No unexpected drift.

Two new shared components in `src/components/property-management/`: `StatusGuidance.tsx` (H3) reads `STATUS_CONFIG[status].guidance` via `getStatusDisplay` and renders a muted neutral card with Info icon + heading + body; not amber (amber palette reserved for rejection). `RejectionPanel.tsx` (H1/H2) fetches the most recent `property_activity_log` row where `action IN ('listing_rejected', 'edit_rejected')`, checks `owner_action_acknowledgments` scoped to the specific `activity_log_id`, renders an amber `AlertCircle` panel with heading (differs for edit vs listing), reason label, optional italic reason_text, and a `mailto:support@reeve.in` support line. "Got it" button upserts an ack scoped to the log entry via `onConflict: "user_id,target_type,target_id,activity_log_id"` — hides the panel for that specific rejection. Subsequent admin rejection creates a new log row → new activity_log_id → no matching ack → panel reappears (D-141 resolved).

`OwnerPropertyManagement.tsx`: replaced inline `changes_requested` banner (L316-330 pre-refactor) with `<StatusGuidance>` + `<RejectionPanel>` inside the Details tab. Deleted local `ackId`, `banner` state, `acknowledgeBanner` callback, and the property-scoped ack query from the Promise.all fetch. Removed the changes_requested reason-computation block.

`ListProperty.tsx`: replaced inline changes-requested banner with `<StatusGuidance>` + `<RejectionPanel>` in edit mode (`isEditMode && propertyId && entryStatus not in {loading,blocked,create}`). Deleted local `showChangesBanner`, `changesRejectionText` state; `acknowledgeBanner` callback; property_edit_requests rejection query + property-scoped ack query. Both components are self-contained — no local wiring needed.

`admin/ListingReviewDetail.tsx`: `requestChangesOnNewListing` swapped from the two-step UPDATE + INSERT-log (D-118) to a single `reject_property_listing(p_property_id, p_reason, p_reason_text)` RPC call. Trigger `property_activity_log_writer` skips its automatic log write when transitioning to `changes_requested` (applied via MCP) — the RPC owns that log entry, no double-log.

Support email verified `support@reeve.in` throughout `src/` (Footer, Contact, Privacy, MyPropertyDetail, propertyStatus.ts guidance bodies) — no D-139 hygiene fixes needed. STATUS_CONFIG.guidance already populated with locked copy in Phase 1.5 Prompt 1.

Tests: new `src/test/rejection-panel.test.tsx` — 6 assertions across RejectionPanel + StatusGuidance including D-141 acceptance (second rejection reappears when no ack matches the new activity_log_id). All 39 tests pass across 5 files.

Memory: D-163 appended to commons-decisions.md; commons-schema.md gained §21 (RPC signature, unique-index shape with NULLS NOT DISTINCT rationale, trigger skip behavior, ack backfill note); CLAUDE.md Phase 1.5 gained the comms-shipped invariant.

D-153/154 buffering + defense stack, D-111 admin bypass, D-091 flat_number invariant all preserved. `useListingSave`, `SpecField`, spec entries, admin PropertyEdit surface (Prompt 10b) all untouched. No migration files added — schema was applied directly via MCP. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 10b baseline 360, no delta); `npx vitest run` = 5 files / 39 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 10b — rent/sale wired end-to-end (admin form + public detail + search filter + card badges); D-162 completes the rent/sale wire [IST]

Wired the remaining 4 surfaces to `listing_type` (D-162), completing rent/sale end-to-end.

Admin `PropertyEdit.tsx`: added 9 state vars + hydration + save-payload entries for listing_type + 8 sale columns. Rendered `listing_type` `<SpecField>` at top of Listing Details (admin freely editable, no Tier-1 lock — D-111 bypass). Wrapped rent-only fields (listed_rent, security_deposit_amount, society_maintenance_approx, maintenance_included_in_rent, security_deposit_months, available_from, notice_period_months, annual_rent_increase_pct) in `{listingType !== 'sale' && ...}`. Sale-only block gated on `=== 'sale'` with 6 SpecFields + 2 bespoke Popover-Calendars (possession_date conditional on under_construction; property_tax_paid_upto unconditional). Passed `formValues={{ listing_type: listingType }}` to the two India rent fields so their spec-declared predicates evaluate on this surface too.

Public `PropertyDetail.tsx`: extended PropertyData interface + SELECT for 9 rent/sale columns. Prominent price block is now a ternary — `listing_type === 'sale'` renders a mirror-weight Sale Price Card (`₹{sale_price}` bold + `Negotiable` when true + `Expected ₹{X}/sqft` secondary); rent branch preserved byte-identical. Details-grid `<SpecField>` calls now pass `formValues={propertyRow}` so `possession_date`'s spec `visibleWhen(v.possession_status === 'under_construction')` evaluates against the row — hidden on ready_to_move/new_launch listings.

`src/config/property-fields.ts`: extended `PUBLIC_DETAILS_GRID_KEYS` with 5 sale-side rows (`possession_status`, `possession_date`, `rera_registration_number`, `khata_type`, `property_tax_paid_upto`) — `sale_price` / `price_negotiable` / `expected_price_per_sqft` stay bespoke in the prominent price block. No spec entry changes (Prompt 10a finalized them).

Search `Search.tsx`: imported `useSearchParams` + `cn`. Added `[For Rent] [For Sale]` toggle above search bar with URL `?type=` writeback + sessionStorage `search_listing_type` persistence (precedence URL > session > default rent). Added `.eq('listing_type', listingType)` to the SELECT chain. Skipped the rent-only budget filter (`gte/lte listed_rent`) when `listingType === 'sale'` so sale rows aren't excluded (sale-price filter deferred; existing budget UI stays visible). Extended SELECT with `listing_type, sale_price, possession_status`. Added `listingType` to fetchProperties useCallback deps so toggling triggers refetch.

Owner dashboard `PropertyCard.tsx`: added optional `listing_type` prop (fail-safe default rent when absent). Small muted chip renders next to title — muted styling so status stays primary. Extended OwnerDashboard SELECT + Property interface with `listing_type`.

Admin queue `ListingReviewQueue.tsx`: extended both SELECTs (new listings + edit-request properties) with `listing_type`. `QueueRow` gained optional `listingType` prop; renders a muted `For Rent`/`For Sale` badge first in the badges row. Both call sites pass through.

D-111 direct-write bypass, D-153 buffering, D-154 defense stack, D-091 flat_number invariant all preserved. `useListingSave` / owner form / spec entries untouched. Trigger already branched per D-160 via MCP.

Admin PropertyEdit gained a runtime-shape-preserving `data as unknown as PropertyData` + `data as unknown as Record<string, unknown>` cast to sidestep Supabase's SelectQueryError inference cascade — surgical, no runtime effect; side benefit: cleaned up 55 pre-existing baseline errors in that hydration block.

property-fields.test.ts: added 1 new assertion — `PUBLIC_DETAILS_GRID_KEYS` includes the 5 sale-side rows and excludes the 3 bespoke price fields. 33/33 tests pass.

Memory: D-162 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the wired-end-to-end invariant with fail-safe pattern restated. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 360 (Prompt 10a baseline 415, delta −55 from the admin cast collapsing the SelectQueryError cascade — well within tolerance); `npx vitest run` = 4 files / 33 tests pass.

## [2026-07-14] feature | Phase 1.5 Prompt 10a — rent/sale wired on owner form (9 spec entries + visibleWhen support + Sale section conditional); trigger already applied per D-160 [IST]

Wired D-160 rent/sale schema into `PROPERTY_FIELDS` + `<SpecField>` + owner form (D-161). SpecField gained `formValues` prop + `visibleWhen` gate: when spec entry has `visibleWhen(values)` predicate and `formValues` is passed, predicate false → renders null; undefined `formValues` with defined predicate → renders with a one-shot DEV console.warn (fail-safe, no silent drops). Used `isFieldVisible` helper from Prompt 2.

Spec additions in `src/config/property-fields.ts`: `listing_type` at top of array (Tier-1 locked, requiredOwner, options rent/sale, ownerSection 'location'); 8 sale-only fields under ownerSection='sale' — `sale_price` (requiredOwner, ₹ formatter), `price_negotiable` (switch, display 'Negotiable'/blank), `expected_price_per_sqft` (₹/sqft formatter, "manual estimate" helper), `possession_status` (requiredOwner, 3 options), `possession_date` (visibleWhen possession_status==='under_construction', publicLabel 'Possession from' per D-135), `rera_registration_number`, `khata_type` (A/B/N/A), `property_tax_paid_upto`. Activated 2 existing entries with `visibleWhen: (v) => v.listing_type !== 'sale'` — `notice_period_months` and `annual_rent_increase_pct` (Prompt 8 TODO(P10) tags removed).

ListProperty.tsx: extended FormState with 9 new fields, INITIAL_STATE defaults (listing_type='rent'), prefillFormFromRow, mapFieldToDb (dates handled via explicit dbPatch from Calendar handlers), DB_COLUMN_TO_SECTION (all 9 → section 3). Rendered listing_type toggle above the accordion via `<SpecField>`; readOnly when entryStatus not in {create, draft, changes_requested} — Tier-1 lock at caller (D-161 rationale: matches how other Tier-1 fields work today; no global auto-derive from spec.tier yet). Section 3 slot flipped to dual-mode via `form.listing_type === 'sale'` ternary: title "Sale Details" vs "Rent & Deposit", body switches. Sale body renders 8 fields via `<SpecField>` + 2 bespoke Popover-Calendar controls (possession_date conditional on under_construction; property_tax_paid_upto unconditional) — spec input='date' but SpecField doesn't own compound picker. Rent body preserved byte-identically. isSectionComplete / isSectionTouched / sectionSummary for section 3 now branch on listing_type — sale-required set is {sale_price, possession_status} + {possession_date if under_construction}.

D-153 buffering / D-154 defense stack / D-111 admin bypass / D-091 flat_number all preserved. useListingSave unchanged. Trigger already branched per D-160 via MCP — not modified. Added inline code comment near submit noting trigger-side validation.

property-fields.test.ts: added 5 new assertions (listing_type Tier-1 + required + 2 options; possession_date visibleWhen semantics; rent-only fields hide on sale + fail-safe on empty values; 8 sale fields all ownerSection=='sale' + all 3 audiences; sale-required per D-160). Updated stale Prompt-2 assertion (`sale` section length 0 → 8). All 32 tests pass.

Memory: D-161 appended to commons-decisions.md; CLAUDE.md Phase 1.5 replaced the "wiring in Prompt 10" invariant with the shipped state + Prompt 10b scope. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (Prompt 9 baseline, no delta); `npx vitest run` = 4 files / 32 tests pass.

## [2026-07-14] schema | Phase 1.5 Prompt 9 — rent/sale schema applied via MCP (property_listing_type enum + 9 cols on properties); types.ts regenerated; trigger update deferred to Prompt 10 per D-160 [IST]

Migration `phase_1_5_prompt_9_rent_sale_schema` already applied to project `tfutuqqcxqqbirnsdpvz` via MCP — no file added to `supabase/migrations/`. New enum `public.property_listing_type` with values `'rent'`, `'sale'`. New column `listing_type property_listing_type NOT NULL DEFAULT 'rent'` on `properties`. Eight nullable sale columns: `sale_price` (CHECK ≥ 0), `price_negotiable`, `expected_price_per_sqft` (CHECK ≥ 0, manual input — not auto-derived), `possession_status` (CHECK IN ready_to_move/under_construction/new_launch), `possession_date` (sale-equivalent of `available_from` per D-135), `rera_registration_number`, `khata_type` (CHECK IN A/B/not_applicable), `property_tax_paid_upto`. All 20 existing rows backfilled with `listing_type = 'rent'` — backward-compatible. No trigger / RLS / RPC changes in this prompt.

Regenerated `src/integrations/supabase/types.ts` via MCP `generate_typescript_types`. Diff = 51 insertions / 1 deletion: enum type + const array (2 lines), 9 cols × 3 sections (Row/Insert/Update) = 27 lines, plus one BOM stripped from line 1 (identical benign normalization as Prompt 7). No drift on other tables, RPCs, or enums. Verified: `listing_type: Database["public"]["Enums"]["property_listing_type"]` on Row (NOT NULL); 8 sale cols all nullable; enum literal `"rent" | "sale"`.

Not wired: `PROPERTY_FIELDS`, `<SpecField>`, `ListProperty`, admin `PropertyEdit`, `PropertyDetail`, `PUBLIC_DETAILS_GRID_KEYS`, `visibleWhen` on rent-only fields — all deferred to Prompt 10.

**D-160 trigger-blocker warning logged:** `enforce_property_owner_transitions` trigger (supabase/migrations/20260710120600_add_commons_rls_and_triggers.sql:229-247) hardcodes 7 rent-only required fields for the `pending_review` submit gate. Sale listings will fail submit with "required fields missing (listed_rent, security_deposit_amount, furnishing, available_from …)" until Prompt 10 branches the trigger on `NEW.listing_type` — for `'sale'`, required set becomes `locality`, `building_name`, `bhk`, `sale_price`, `possession_status` (plus `possession_date` when `possession_status = 'under_construction'`). Also flagged the `unlisted` edit-lock block (L253-269) which currently references rent-only fields and needs a matching sale branch.

Memory: commons-schema.md gained §20 column-by-column table + backfill audit note; commons-decisions.md gained D-160 with the trigger-blocker directive; CLAUDE.md Phase 1.5 gained the rent/sale-applied invariant + Prompt-10 trigger warning. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (Prompt 8 baseline, no delta); `npx vitest run` = 4 files / 27 tests pass; `git diff --stat` scope: types.ts + 4 memory files, no other file touched.

## [2026-07-14] feature | Phase 1.5 Prompt 8 — India fields wired end-to-end (spec + 3 surfaces); notice_period_months visibleWhen deferred to Prompt 10; parking compound public display bespoke; all other fields spec-driven [IST]

Wired 7 India columns from Prompt 7 across the 3 surfaces via `PROPERTY_FIELDS` + `<SpecField>` (D-159). Spec additions in `src/config/property-fields.ts`: `landmark` (location, owner/admin/public), `notice_period_months` (rent_deposit, all 3, `display: v month(s)`, TODO(P10) tag for visibleWhen once listing_type ships), `annual_rent_increase_pct` (rent_deposit, all 3, `display: v% annually` per D-136 always-public), `water_storage` (building_society, all 3, 4-option select matching CHECK constraint from §19), `parking_2w_count` / `parking_4w_count` (building_society, owner+admin only — public renders compound formatter), `parking_notes` (building_society, all 3, textarea). Extended `PUBLIC_DETAILS_GRID_KEYS`: added water_storage, notice_period_months, annual_rent_increase_pct, parking_notes; REMOVED parking_2w / parking_4w (now compound-bespoke in PropertyDetail).

`ListProperty.tsx`: FormState + INITIAL_STATE + prefillFormFromRow + mapFieldToDb extended for 7 new fields; DB_COLUMN_TO_SECTION map (D-154) updated. Section 1 gets landmark via new `<SpecField>`. Section 3 gets notice_period + rent_increase via `<SpecField>` in same grid. Section 5 (bespoke) gets water_storage `<SpecField>` + parking count `<SpecField>` inline next to each enum select in a 2-col grid (renders 4 cells now: 2w enum, 2w count, 4w enum, 4w count) + parking_notes below.

`admin/PropertyEdit.tsx`: state + hydration + handleSave payload extended for 7 fields. JSX inserts: notice/rent_increase after available_from picker in Listing Details, landmark at end of Listing Details, water_storage + parking counts inline with parking selects in Utilities & Policies, parking_notes below. All routed through `<SpecField surface="admin_form">`.

`PropertyDetail.tsx`: PropertyData interface extended with 7 fields; SELECT string extended with the 7 columns. Bespoke "Near {landmark}" subtitle added to the Location block below city. Compound parking rows appended inside details grid via an IIFE — computes `"{parkingLabel(enum)} · {count} slots"` (or singular "slot") when either enum is present (!== 'none') or count > 0; hides row entirely when both are empty; reuses existing `parkingLabel` helper. Same card DOM as SpecField's public_detail branch. Cast `propRes.data as unknown as PropertyData & { amenities: unknown }` to sidestep Supabase's SelectQueryError inference cascade that triggers on long SELECT strings (surgical, no runtime effect).

`property-fields.test.ts`: added 3 new assertions — water_storage 4-option guardrail (values sump_only/overhead_only/both/none), parking_count fields not in public audiences (compound-formatter contract), annual_rent_increase_pct formatter matches D-136 copy. All 27 tests pass.

D-153 buffering / D-154 defense stack / D-111 admin bypass / D-091 flat_number all preserved. SpecField unchanged. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (Prompt 7 baseline 419, delta -4 — the raw cast in PropertyDetail also cleaned up 4 pre-existing SelectQueryError cascades in that same block); `npx vitest run` = 4 files / 27 tests pass. Memory: D-159 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the wired invariant.

## [2026-07-14] schema | Phase 1.5 Prompt 7 — India fields schema applied directly via MCP (7 cols on properties); types.ts regenerated; spec/surface wiring deferred to Prompt 8 [IST]

Migration `phase_1_5_prompt_7_india_fields_schema` already applied to project `tfutuqqcxqqbirnsdpvz` via MCP — no file added to `supabase/migrations/`. Seven nullable columns on `public.properties`: `parking_2w_count integer DEFAULT 0`, `parking_4w_count integer DEFAULT 0`, `parking_notes text`, `landmark text`, `notice_period_months integer DEFAULT 1`, `annual_rent_increase_pct numeric` (CHECK 0–100), `water_storage text` (CHECK IN sump_only/overhead_only/both/none). No RLS, trigger, or RPC change.

Regenerated `src/integrations/supabase/types.ts` via MCP `generate_typescript_types`. Diff = 22 insertions / 1 deletion: 7 columns × 3 sections (Row/Insert/Update) = 21 lines, plus one BOM stripped from line 1 (MCP writes UTF-8 without BOM; prior file had a leading BOM — benign metadata normalization, no runtime effect). No drift on other tables, RPCs, or enums.

Not wired: `PROPERTY_FIELDS`, `<SpecField>`, `ListProperty`, admin `PropertyEdit`, `PropertyDetail`, save handlers, `PUBLIC_DETAILS_GRID_KEYS` — all deferred to Prompt 8. Semantics locked for Prompt 8: `parking_*_count` complements (not replaces) enum `parking_*` (enum = availability, count = quantity); `notice_period_months` rent-only (gate via `visibleWhen` on `listing_type === 'rent'` when Prompt 9 lands rent/sale); `annual_rent_increase_pct` always public per D-136; `water_storage` uses CHECK-string not Postgres ENUM.

Memory: commons-schema.md gained §19 column-by-column table with defaults/constraints/notes; CLAUDE.md Phase 1.5 gained the schema-applied invariant. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (Prompt 6 baseline, no delta); `npx vitest run` = 4 files / 24 tests pass; `git diff --stat` scope: types.ts + 3 memory files only, no other file touched.

## [2026-07-14] fix | Phase 1.5 Prompt 6 — quick UI wins bundle (E1/E2 status labels, A1 optional-section validation, A2 red asterisks, B3 date warnings, J1 2-checkbox, F2 self-redirect removed, B1 focus ring, B2 EV Charging) [IST]

Executed 9-item quick-wins bundle. E1 was a no-op — owner surfaces (OwnerDashboard/PropertyCard, OwnerPropertyManagement, ListProperty header) already route status renders through `getStatusDisplay()` from Prompts 3–5. MyPropertyDetail (legacy PM) intentionally untouched per handoff.

E2: `PublicTimeline.summaryFor` extended to read `payload.from_status`/`to_status` and render `"${getStatusDisplay(from).label} → ${getStatusDisplay(to).label}"` when present, falling back to `payload.summary` then per-action hardcoded string. Never renders raw enum codes to the public.

A1 (D-144): Added `openedSections: Set<SectionNum>` state to ListProperty (seeded with `1` since section-1 auto-opens on mount). Accordion `onValueChange` records opened sections. `isSectionComplete` for optional-only sections (5, 6, 8) now returns true only when the section has been opened OR any of its fields is truthy. Sections 1/2/3/4/7/9 unchanged.

A2: New `SectionShell.required` prop renders `<span className="text-destructive">*</span>` after the title on the 5 required sections (1, 2, 3, 7, 9). `<SpecField surface="owner_form">` renders the same asterisk when the spec entry has `requiredOwner: true`; admin/public branches untouched. `Shell.label` and `FormField.label` widened from `string` to `React.ReactNode` to carry the JSX asterisk without stringifying it. `Available from` bespoke field gets the asterisk inline via `<FormField label={<>Available from <span…>*</span></>}>`.

B3 (D-146): `available_from` Calendar `disabled` prop rejects dates > today + 90 days. Below the picker, an amber warning renders whenever the selected date < today: "Available from is in the past — is this correct?" Immediate on selection; not blocking.

J1 (D-148): Added `terms_privacy_consent: boolean` to `FormState` + `INITIAL_STATE` + `prefillFormFromRow`. Section 9 renders a second required checkbox: "I agree to Reeve's Terms of Service and Privacy Policy" — both `/terms` and `/privacy` open in a new tab (`target="_blank" rel="noopener noreferrer"`). `isSectionComplete(9)` requires both consents; `isSectionTouched(9)` requires either. Submit button `disabled` condition extended with `!form.terms_privacy_consent`. Note: prompt title said "3-checkbox pattern" but Fix instruction specified 2 total (existing + Terms/Privacy) — implemented 2 as per Fix text; discrepancy logged in D-158.

F2 (D-151): Deleted the `/u/:userId → /me` self-redirect useEffect from `PublicProfile.tsx`. PostHog `commons_profile_viewed` now emits `self: user.id === userId` for both self and cross-user views. `navigate` retained for the "Go back" button on notFound.

B1: `AccordionContent` in `SectionShell` now has `className="pt-2 px-1"` — 4px horizontal padding gives focus rings breathing room so they don't clip against Radix's `overflow-hidden` animation container.

B2: Appended `{ value: "ev_charging", label: "EV Charging" }` to `BUILDING_AMENITIES` in `src/config/property-form.ts`. Owner Section 5 amenity grid picks it up automatically (bespoke JSX per Prompts 3–5 already renders the full constant).

Memory: D-158 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the Prompt-6 UI conventions line. Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (Prompt 5 baseline, no delta); `npx vitest run` = 4 files / 24 tests pass; no errors in any touched file. No touches on useListingSave.ts / config.toml / client.ts / types.ts / admin PropertyEdit / Prompt 5's PropertyDetail scalar refactor.

## [2026-07-14] refactor | Phase 1.5 Prompt 5 — public PropertyDetail scalar rows driven by PROPERTY_FIELDS via <SpecField surface='public_detail'>; audiences is the single knob; flat_number invariant enforced; visual parity preserved [IST]

Implemented the real `surface="public_detail"` branch in `src/components/property/SpecField.tsx` — emits the exact card DOM PropertyDetail used pre-refactor (`flex items-start gap-2.5 rounded-lg border border-border bg-card p-3` shell + `mt-0.5 text-muted-foreground` icon span + `text-[11px] text-muted-foreground` label + `text-sm font-medium text-foreground` value). Icons resolved from `spec.displayIcon` string via `PUBLIC_ICON_REGISTRY` (Lucide: home, maximize, building, layers, droplets, wind, compass, calendar-days, armchair, car, bike, key-round, paw-print — 13 icons). Unknown icon → row still emits label + value (safe fallback).

Rewired `src/pages/PropertyDetail.tsx` Property Details grid (L1092–1108) to loop over exported `PUBLIC_DETAILS_GRID_KEYS` from `@/config/property-fields`, filtering via `shouldShowGridField` predicate that preserves the pre-refactor visibility semantics (`floor_number/total_floors: != null` keeps 0; others truthy; parking excluded when === "none"). Removed the 13 `detailItems.push` statements. Preserved existing bespoke helper functions (`bhkLabel`, `furnishingLabel`, `parkingLabel`) — still used in the property header/other sections.

Extended `src/config/property-fields.ts`: populated `displayIcon` on all 13 grid fields, added `publicLabel` overrides where the public page uses different casing ("BHK Type", "Floor", "Building Age", "2-Wheeler Parking", etc.), fixed `building_age_years` formatter from `${v} year(s)` to `~${v} yrs` matching current page output, added new spec entry `main_door_lock_type` (audiences `['admin_form', 'public_detail']`), added `PUBLIC_DETAILS_GRID_KEYS` exported constant (single-knob for grid membership + order — deliberately preserves pre-refactor page order which differs from implicit spec-section order; TODO(spec) in Prompt 6 to reconcile).

D-091 preserved: `flat_number` has zero occurrences in PropertyDetail.tsx and remains `audiences: ['admin_form']`-only in spec. Sensitive-field audit clean: `flat_number_revealed`, `board_status`, `auto_accept_enabled`, `owner_diet/pet/tenant_type_preference`, `legal_owner_name`, `is_active`, `listed_at`, `created_at` all admin_form-only. `status` retains public_detail audience for the bespoke status badge (not in the grid loop). All `COMMONS_HIDE` blocks, `{false && …}` blocks, gallery, floor-plan carousel, price/rent block, amenity chips, furnishing_detail JSONB accordion, address block, activity timeline, "about the owner", CTAs, and Google Maps embed untouched.

Memory: D-157 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the public-surface invariant (audiences+PUBLIC_DETAILS_GRID_KEYS as single knob; D-091 flat_number restated). Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (Prompt 4 baseline 419, no delta); `npx vitest run` = 4 files / 24 tests pass; owner/admin surfaces untouched (ListProperty.tsx, admin/PropertyEdit.tsx, useListingSave.ts all unchanged).

## [2026-07-14] refactor | Phase 1.5 Prompt 4 — admin PropertyEdit scalars driven by PROPERTY_FIELDS via <SpecField surface='admin_form'>; all admin-only fields wired; status badge + D-111 bypass untouched [IST]

Rewired 22 scalar fields in `src/pages/admin/PropertyEdit.tsx` to consume PROPERTY_FIELDS via `<SpecField surface="admin_form">`: Sections 1 (Basic Details), 2 (Listing Details), Furnishing scalar, Parking selects, Rules (building_rules + building_notes), Description. Added previously-missing spec-driven fields to the admin form + hydration + save payload: `state`, `security_deposit_amount`, `building_notes`, `flat_number_revealed`. Added a new read-only Metadata section: `listed_at`, `created_at`, `board_status` (edit deferred — spec has no curated options yet). Extended spec (`src/config/property-fields.ts`) with two admin-only entries: `legal_owner_name` and `security_deposit_months`.

Bespoke stays: publish toggle (Live/Hidden badge treatment), utility switches (compact 3-col grid layout), `gas_type` (has "none" sentinel not in spec), `pet_policy` (admin free-text vs spec enum — data-loss risk), `available_from` Popover+Calendar compound, Section 7 owner-preferences pill buttons, Section 8 owner-profile TriStateQuestions (not scalar; not in spec), `auto_accept_enabled` (derived from ownerWantsControl inverse), Photos. 8 `// TODO(spec):` grep tags added for later label / options folding.

D-110 non-issue confirmed — status renders as a Badge display; no dropdown exists. D-111 direct-write bypass path unchanged (handleSave still writes directly to `properties`, no RPC routing). D-124 admin-only-fields trigger cleared automatically by `is_admin()` in admin session. Owner surface (ListProperty) untouched; useListingSave / D-153 buffering / D-154 defense stack all unchanged. SpecField required no modification — existing owner_form-only asterisk means admin surface renders Tier-1 fields editable automatically.

Memory: D-156 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the admin invariant (audiences+editableBy source of truth, bespoke list). Verification: `npx tsc -p tsconfig.app.json --noEmit` = 419 (baseline 415, +4 for new payload keys — Supabase inference noise, within ±5); `npx vitest run` = 4 files / 24 tests pass.

## [2026-07-14] refactor | Phase 1.5 Prompt 3 — ListProperty scalar rendering driven by PROPERTY_FIELDS spec; JSONB/Photos/consent bespoke; save/patch/D-153 untouched [IST]

Created `src/components/property/SpecField.tsx` — surface-agnostic renderer taking (fieldKey, surface, value, onChange, helperOverride?, placeholderOverride?, readOnly?). Handles text/textarea/number/select/switch. Label always via `getFieldLabel(field, surface)`; requiredOwner adds ' *' on owner_form surface only. Reads spec via `PROPERTY_FIELDS.find(f => f.key === fieldKey)`; unknown key logs `console.error` in DEV and renders null. readOnly branch: public_detail returns `<span>{formatFieldValue(...)}</span>`, other surfaces render a disabled-looking read-only pane. Component never imports form hooks / updateField / useListingSave — caller owns state and transforms. Prompts 4 (admin) and 5 (public detail) reuse this component; forking is not allowed (D-155).

Refactored ListProperty.tsx Sections 1, 2, 3, 6, 8 to consume SpecField for scalar fields. Bespoke stays bespoke: Country hardcode (not a DB column), pincode digit-only transform (owned by caller onChange), security_deposit_amount 1/2/3-month convenience chips, maintenance_included → maintenance_included_in_rent form-state-vs-DB bridge, available_from Popover+Calendar, Section 8 title dynamic placeholder from live bhk+locality. Section 9 consent + preview button unchanged (UI-only, not in spec). Sections 4/5/7 entirely bespoke per Prompt 3 scope (JSONB/Photos). Every helperOverride site tagged `// TODO(spec): fold helper into PROPERTY_FIELDS.<key>.helper in Prompt 6 bundle` for grep-able cleanup.

D-153 invariant preserved — no `if (propertyId)` guards on `patch()`; the 5 remaining `!propertyId` gates (lines 608/882/1098/1485/1580) are legitimate photo-upload and save-button conditions. D-154 defense stack untouched. Path A/B routing, useListingSave, submit RPC, poisonedKeys guard all unchanged. Pincode transform preserved.

Memory: D-155 appended to commons-decisions.md; CLAUDE.md Phase 1.5 gained the SpecField invariant (surface prop, three-surface reuse rule, bespoke list). Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (baseline, no delta); `npx vitest run` = 4 files / 24 tests pass; none in touched files.

## [2026-07-14] arch | Phase 1.5 Prompt 2 — field spec architecture foundation (D-128) [IST]

Created `src/config/property-fields.ts` — canonical `PropertyFieldSpec[]` for all property fields, plus helpers (`getFieldsForSurface`, `getOwnerFieldsGrouped`, `getFieldLabel`, `formatFieldValue`, `isFieldVisible`, `validateSpec`) and `OWNER_FORM_SECTIONS` metadata. 40 fields populated covering location, basics, rent_deposit, inside, building_society, rules_preferences, photos, description sections + 11 admin-only columns (status, is_active, flat_number/revealed, board_status, auto_accept_enabled, 3 owner_*_preference, listed_at, created_at). Sale section defined but empty until Prompt 9. JSONB fields (furnishing_detail, amenities) entered as input='json' — consumer owns UI. All 7 required-owner fields the submit trigger checks are covered and verified via `src/test/property-fields.test.ts` (9 assertions). Tier 1 (locked) fields verified per commons-status-flow.md: building_name, street_address, city, state, pincode, bhk, property_type + admin-only columns.

Consumers unchanged per spec — ListProperty, admin PropertyEdit, PropertyDetail continue to read fields their existing way. `src/config/property-form.ts` constants stay in use through Prompts 3–5 refactors. When wiring in later prompts, the D-153 pre-draft buffering invariant must be preserved: do NOT gate `patch()` on `propertyId`.

Memory: commons-schema.md §18 added (shipped shape, canonical helpers, JSONB caveat, deferred fields note); §17 kept as historical decision record. CLAUDE.md gained the Prompt 2 invariant. Types.ts already reflects Prompt-1 migration state (`public_profiles.full_name` present) — no regen needed.

Verification: `npx tsc -p tsconfig.app.json --noEmit` = 415 (baseline, no delta); `npx vitest run` = 4 files / 23 tests pass (property-fields.test.ts adds 9 assertions).

## [2026-07-14] fix | Pre-draft field loss root cause (D-153) — patch() buffers before draft exists; save-failure defense stack (D-154); sw.js offline fallback [IST]

TRUE root cause of the recurring "Cannot submit for review: required fields missing" failure: patch() dropped every field typed before the draft row existed (Section-3 deposit/available_from are typed before the Section-4 furnishing threshold that triggers createDraft, whose INSERT payload omits them). Evidence: two production HARs showing draft POST without those columns and zero subsequent field PATCHes. Misdiagnosed twice (poison-merge, submit guard) — those fixes were real hardening but not the blocker; they ship as the D-154 defense stack (drop failed snapshots, poisonedKeys tracking, failureTick toast re-fire, submit block naming exact columns, console.error full payload).

Fix: useListingSave.patch() now buffers while propertyId is null; effect auto-flushes on id arrival. Removed all `if (propertyId)` guards on patch() call sites in ListProperty. Regression test added: src/test/useListingSave.test.ts (3 files, 14 tests pass). Also fixed public/sw.js offline fallback resolving undefined → "Failed to convert value to 'Response'" (cache-miss now falls back to cached '/' shell for navigations, else Response.error(); CACHE_NAME bumped to v2).

Memory: D-153 + D-154 appended to commons-decisions.md; CLAUDE.md Phase 1.5 section gained pre-draft buffering + defense stack + sw.js invariants. Typecheck: 415 (baseline, no delta).

## [2026-07-12] hotfix + docs | Phase 1.5 Prompt 1 — data loss fix + admin name fix + commons memory update for Phase 1.5 [IST]

Fixed A3 (draft-load useEffect no longer re-fetches on internal setSearchParams — latched via draftInitialResumeRef). useListingSave now exposes lastError; ListProperty subscribes and toasts on non-null. Defensive Date-to-YYYY-MM-DD normalization in updateField payload. getUserDisplayName simplified per D-125 (users.full_name only; profile arg preserved for backwards compat, no longer consulted). STATUS_CONFIG in propertyStatus.ts gained guidance field per D-138 with locked copy for 7 statuses; deduplicated old PM `listed` entry.

Migrations added: 20260711120000_fix_admin_only_property_fields.sql (git-sync of 2026-07-11 hotfix — D-124), 20260712120000_widen_public_profiles_view.sql (F1 fix — D-125, D-126; view now selects users.full_name via LEFT JOIN profiles).

Memory: commons-decisions.md gained D-124 through D-152 (29 entries covering Phase 1.5 architecture, schema, UX, and 13-prompt sequence). commons-forward-plan.md appended Phase 1.5 deferred items + prompt sequence. commons-schema.md gained §14 migrations list, §15 widened view, §16 event-scoped acks note, §17 field spec architecture. commons-ux.md gained §10 StatusGuidance content + Final Checks 3-checkbox + search rent/sale toggle + section validation + available_from date rules. CLAUDE.md gained compact "Commons Phase 1.5" section listing the 8 load-bearing invariants.

Typecheck: 415 errors (baseline 413, +2, within ±5 tolerance). None in touched files. Types regenerated from REMOTE — public_profiles type still reflects display_name until migration is pushed; will need re-regen after `supabase db push`.

## [2026-07-05] fix | Floor plan carousel crash — aligned lightboxImages filter with activeImages to prevent index-out-of-bounds on floor plan click [IST]
## [2026-07-05] diagnose | Floor plan carousel crash — lightboxImages vs activeImages array mismatch when "All Photos" selected [IST]
## [2026-06-28] feat | Google Maps link + action buttons row — DB column, admin input, moved YouTube from badges to dedicated button row with Maps button [IST]
## [2026-06-28] fix | Hide rent/fee/total rows in pricing card + sidebar fee text — CSS hidden, no deletions [IST]
## [2026-06-28] diagnose | Hide rent/fee/total rows in PropertyDetail pricing card — line map and approach [IST]
## [2026-06-28] feat | YouTube walkthrough link — DB column, admin input in Listing Details, red pill badge in PropertyDetail green badges row [IST]
## [2026-06-28] diagnose | YouTube walkthrough link — DB column, admin input, detail page placement below carousel [IST]
## [2026-06-18] fix | 5-issue fix — furnishing items (stove/chimney/fan/exhaust), amenities (garden/sports/community/water), search UI hide, floor plan carousel, WhyReeveFeeModal height resolution [IST]
## [2026-06-18] diagnose | 5-issue audit — furnishing items, amenities, search UI hide, floor plan carousel, WhyReeveFeeModal dimensions [IST]
## [2026-06-17] fix | Gas Type SelectItem empty-string crash — changed placeholder value from "" to "none" sentinel [IST]
## [2026-06-17] fix | 7-issue property fix — maintenance badge, cover image sort, society maintenance display, Why7% clip, gas type, wardrobe count, search badge [IST]
## [2026-06-17] diagnose | Property detail + search page 7-issue audit — deposit calc, cover image, maintenance badge, gas type, wardrobe count, Why7% border, society maintenance display [IST]
## [2026-06-13] feat | Built Move-in Audit page — /move-in-audit route, 9 sections (Hero, Audience, What We Document, How It Works, Pricing, Neutrality, Broker Partner, FAQ, Final CTA), SSG + sitemap entry [IST]
## [2026-06-11] fix | Condition label rename, auto-population expansion (minor wear + appliances), dropdown refinements, room-type field removals, PDF damage table fixes [12:30 IST]
## [2026-06-10] fix | Post-audit fixes: seepage trigger, edited detection, missing fields, dead code cleanup, DW labels, KeyReturn filter [23:15 IST]
## [2026-06-10] audit | Full end-to-end diagnostic of inspection form rebuild — 15-section report; fixed 4 critical/data-loss bugs (getWorstCondition missing import crash, pendingInspectionPatchRef undefined ref crash, old severity values in furniture damage handler, appliance location omitted from upsert); discovered `npx tsc --noEmit` is vacuous (root tsconfig files:[]) + corrupted supabase types.ts line 1 [22:30 IST]
## [2026-06-10] feat | PDF renderer: 2 new sections (InspectionSummarySection, KeyReturnSection); reordered sections (Cover→Summary→Damages→Utilities→Rooms→Appliances→Notes→KeyReturn→Signatures→Media→Disclaimer); DamagesSection +Recommended Action column +old severity fallback +(Auto) tag; RoomsSection +SKIP_KEYS +entry-array detail rendering (walls/flooring/ceiling/false-ceiling/DW/electrical/plumbing); roomFeatureLabels +15 new keys (ac_brand/condition/notes, wardrobe_notes, modular_notes, counter_notes, chimney_brand/condition, gas_type/cylinder_count, flush_notes, electrical_point_count, wash_basin_*); ReportPayload +inspectionSummary +keyReturnSummary [IST]
## [2026-06-10] feat | Room Features Doors/Windows + Electrical + Plumbing subsections: 6 new files (doorWindowFields, electricalFields, plumbingFields, DoorsWindowsSubsection, ElectricalSubsection, PlumbingSubsection); removed WindowFields + universal fittings (fan/light/switchboard counts) from room-type branches; extended loadData synthesis for namespaced electrical + plumbing keys [IST]
## [2026-06-10] feat | Room Features surfaces restructure: EntryList component, wall/flooring/ceiling entries, false ceiling, fallback synthesis [IST]
## [2026-06-10] refactor | Extract 6 UI cards to src/components/admin/inspection/ — CollapsibleCard, UtilitiesCard, ApplianceInventory, DamageLog, ObservationsCard, InspectionSummaryCard, KeyReturnCard; add delete AlertDialogs on all destructive actions; Room-by-Room accordion stays inline [IST]
## [2026-06-10] refactor | Extract autosave mechanism to useInspectionSave hook, refactor add_to_damage_log handler [IST]
## [2026-06-09] refactor | InspectionForm rebuild Part B — extract shared types to src/types/inspection.ts, rename severity/condition labels, add dining_room, update DamageItem, update all 7 import sites [IST]
## [2026-05-03] feat | BreadcrumbList added to 4 routes; openingHours on homepage; areaServed as City objects [15:27 IST]
## [2026-05-03] sec | Added 6 baseline security headers in vercel.json (CSP deferred) [11:15 IST]
## [2026-05-03] perf | Batch A: hero WebP, contrast, headings, Razorpay lazy load, Google Fonts non-blocking [11:10 IST]
## [2026-05-03] feat | JSON-LD schema injected for 5 pre-rendered routes via prerender.mjs [09:55 IST]
## [2026-05-03] feat | SSG implemented for 5 public marketing routes; og:description fixed [09:35 IST]
## [2026-04-30] feat | ReferProperty refactor — types regenerated, admin Leads.tsx referrer fields added [14:22 IST]
## [2026-04-30] feat | ReferProperty refactor — schema migration + frontend rewrite [14:15 IST]
## [2026-04-30] diagnose | ReferProperty refactor — diagnosis complete, findings documented [IST]
## [2026-04-25] perf | Frontend: gated realtime behind auth, QueryClient defaults, lazy admin routes [17:30 IST]
## [2026-04-25] diagnose | P1 gap audit — FK indexes, storage policies, bucket config [16:30 IST]
## [2026-04-25] fix | Search path hardening: 9 SECURITY DEFINER functions + drop ensure_user_exists + config.toml send-sms-otp verify_jwt=false [15:30 IST]
## [2026-04-25] diagnose | Pre-launch P0 audit — 8 items checked, 9 issues found [14:30 IST]
## [2026-04-25] refactor | Property Details tab: show only owner-submitted Basic Details, add View Listing link, replace WhatsApp footer with /contact link [13:00 IST]
## [2026-04-25] feat | Enabled WhatsApp card on /contact, updated grid to 2×2 [12:00 IST]
## [2026-04-24] fix | Co-resident dedup + RLS delete policy + ApplicationDetail restructure + Contact CTA [20:00 IST]
## [2026-04-24] feat | Step 3 revamp: remove ITR/bank uploads, add work_email/linkedin_url, drag-and-drop salary slip zone [18:00 IST]
## [2026-04-22] feat | Visit scheduler — admin exact-time reschedule mode [19:00 IST]
## [2026-04-19] feature | Hid WhatsApp card in Contact.tsx, added Call Reeve card with tel link [15:00 IST]
## [2026-04-19] feature | Restructured /login to split-screen layout, right trust panel added [14:30 IST]
## [2026-04-18] feat | Created OwnerLandingPage.tsx — new /owners route, 7 sections, dark theme, lifecycle flow, calculator, FAQ [18:30 IST]
## [2026-04-14] refactor | Remove pendingReturnTo localStorage — replaced with query param + sessionStorage returnTo [13:00 IST]
## [2026-04-14] feat | PropertyDetail + Eligibility: add verification gates (phone+Google) + proactive VerificationStrip UI [12:00 IST]
## [2026-04-14] feat | Profile: wire returnTo navigation for phone OTP and Google link success paths [11:00 IST]
## [2026-04-14] fix | Profile: parse OAuth error hash on mount to show toast when Google account already linked to another user [10:30 IST]
## [2026-04-14] fix | verify-phone-otp: add legitimate-user pre-check (SPURIOUS_ROW_MAX_AGE_MS=60s) — abort with 409 if phone belongs to existing user, never delete legitimate accounts [10:00 IST]
## [2026-04-13] fix | supabase client: add noOpLock to fix Web Lock deadlock causing white screen on profile refresh for phone+Google users [18:30 IST]
## [2026-04-13] fix | useAuth: fix white screen on profile refresh for phone+Google users — skip INITIAL_SESSION, increase setTimeout to 100ms [18:00 IST]
## [2026-04-13] fix | useAuth: wrap onAuthStateChange in setTimeout(0) to fix DB deadlock on page refresh [17:30 IST]
## [2026-04-13] fix | useAuth: add 5s safety timeout to prevent infinite loading after OAuth redirect [17:00 IST]
## [2026-04-13] fix | Profile: navigate to clean /profile after Google linking to clear OAuth fragments [16:30 IST]
## [2026-04-13] fix | Profile: fix Google linking email+name update, show email in Google section, hide change phone once verified [16:00 IST]
## [2026-04-13] fix | config: add manual linking + confirm phone display format correct [15:30 IST]
## [2026-04-13] fix | verify-phone-otp: cleanup spurious public.users row + standardise phone format [15:00 IST]
## [2026-04-13] fix | verify-phone-otp: delete spurious phone user before PUT to prevent unique constraint violation [14:30 IST]
## [2026-04-13] fix | verify-phone-otp: fix Admin API HTTP method PATCH→PUT for user update [14:00 IST]
## [2026-04-13] fix | Profile: use fetch instead of functions.invoke to fix missing Authorization header [13:30 IST]
## [2026-04-13] fix | Profile: capture Google token before signInWithOtp to fix 401 on verify-phone-otp [13:00 IST]
## [2026-04-13] fix | verify-phone-otp: add CORS headers + cleanup spurious phone auth rows [12:30 IST]
## [2026-04-13] fix | handle_user_updated: add email_confirmed_at block for Google OAuth users [12:00 IST]
## [2026-04-09] feature | verify-phone-otp edge function: phone linking for OAuth users [14:30 IST]
## [2026-04-09] fix | Profile: fix shouldCreateUser for phone OTP [14:15 IST]
## [2026-04-09] fix | Profile: fix phone OTP for Google OAuth users [14:00 IST]
## [2026-04-09] diagnose | Profile phone+Google linking diagnostic [13:30 IST]
## [2026-04-09] fix | useAuth: retry loadUser on null row to fix trigger race condition [13:00 IST]
## [2026-04-09] fix | Login: fix Google OAuth redirect — remove !user guard from redirect useEffect [12:30 IST]
## [2026-04-09] fix | Add on_auth_user_updated trigger for phone OTP user row creation [11:30 IST]
## [2026-04-09] fix | send-sms-otp: fix Content-Type header on hook response — Supabase Auth requires application/json on all responses [10:00 IST]
## [2026-04-08] fix | send-sms-otp: fix webhook secret extraction — pass raw base64 string to Webhook constructor, not decoded bytes [20:00 IST]
## [2026-04-08] feat | Profile redesign: 4-section layout (name, phone OTP verify, Google link, emergency contact) + dual verification gate on Schedule Visit and Apply [19:30 IST]
## [2026-04-08] refactor | Core auth: phone OTP + Google OAuth, remove onboarding, fix route protection [18:30 IST]
## [2026-04-08] security | send-sms-otp: webhook signature verification added [18:00 IST]
## [2026-04-08] add | Edge function send-sms-otp deployed [17:30 IST]
## [2026-04-08] migrate | DB migration: drop onboarding_completed, fix handle_new_user trigger for phone OTP [17:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap — disable vaul repositionInputs, handle keyboard ourselves [16:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap — visualViewport targets Drawer scroll container, not Dialog [15:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap via structural approach — top-anchored h-dvh, overflow-y-scroll, scrollIntoView on focus [14:00 IST]
## [2026-04-08] fix | RequestCallbackModal: slot ranges, night window range, greying rule >= for India and international [13:00 IST]
## [2026-04-08] fix | RequestCallbackModal: correct timezone select to 7 options [12:30 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap via visualViewport listener [12:00 IST]
## [2026-04-07] fix | Fix 6 UI/logic bugs in RequestCallbackModal: +91 prefix, timezone select, intl phone fields, night window gate, step 4 phone display, call/range summary [12:00 IST]
## [2026-04-07] fix | Fix 4 bugs in RequestCallbackModal: phone normalise, modal size, mobile keyboard, timezone slots [11:00 IST]
## [2026-04-07] feature | Wire RequestCallbackButton into Contact, Admin sidebar, ApplicationDetail, MyPropertyDetail [10:00 IST]
## [2026-04-06] feat | Build /admin/callbacks page + App.tsx route [12:45 IST]
## [2026-04-06] feature | Build RequestCallbackButton + RequestCallbackModal [12:30 IST]
## [2026-04-06] migration | Create callback_requests table [12:00 IST]
## [2026-04-06] migrate | Created visit_events table, extended profiles and visits, added no-show auto-block trigger [11:33 IST]
## [2026-04-06] feat | Created shared VisitSchedulerModal component [11:37 IST]
## [2026-04-06] feat | Rewrote VisitsList: event timeline, fixed date picker, status labels, scheduling block [11:45 IST]
## [2026-04-06] feat | Added 4 admin visit actions to FieldCalendar + fixed rescheduled status filter [11:52 IST]
## [2026-04-06] feat | Built /admin/visits Visit Logs page with filters and row detail drawer [12:04 IST]
## [2026-04-06] feat | Added no-show monitoring and unblock capability to TenantPipeline [12:18 IST]
## [2026-04-06] feat | Surfaced visit notes and admin tenant notes in AdminApplicationDetail [12:35 IST]
## [2026-04-06] feat | Added scheduling block gate and VisitSchedulerModal to PropertyDetail [12:52 IST]

## [2026-04-18] feat | Created OwnerClarityGuide.tsx — owner clarity guide page with 13 sections, TOC, progress bar [18:30 IST]

## [2026-04-19] diagnose | Token payment flow — pre-implementation diagnosis complete [14:30 IST]

## [2026-04-19] diagnose | Razorpay UPI token payment — pre-implementation diagnosis [15:00 IST]

## [2026-04-19] migrate | Razorpay Phase 1 — payments UNIQUE constraint, RLS policies, remove payment_pending from WITHDRAWABLE_STATUSES [15:15 IST]

## [2026-04-19] feat | Razorpay Phase 2 — create-razorpay-order Edge Function [15:30 IST]

## [2026-04-19] feat | Razorpay Phase 3 — verify-razorpay-payment webhook handler [15:50 IST]

## [2026-04-19] feat | Razorpay Phase 4 — frontend checkout, owner_accepted CTA, payment_received screen [16:10 IST]

## [2026-04-19] feat | Footer rewrite — nav links, legal identity block for Meta Business Verification [18:31 IST]

## [2026-04-19] fix | Footer desktop grid 3→4 cols, For Tenants into own column [18:45 IST]

## [2026-04-20] diagnose | Token payment refund policy — pre-implementation diagnosis [14:00 IST]

## [2026-04-22] diagnose | Visit time slot filtering — diagnosis complete [09:22 IST]

## [2026-04-22] feat | Visit scheduler — Early Morning slot, past-slot filtering, 4PM cutoff, 7-day window, full slot label in My Visits [09:40 IST]

## [2026-04-22] diagnose | Visit module — 3 bugs + systemic issues diagnosed [10:36 IST]

## [2026-04-22] backend | Visit module — schema reconciled, RPCs + RLS + status trigger added [11:05 IST]

## [2026-04-22] diagnose | Visit module post-migration — 3 issues diagnosed [12:30 IST]

## [2026-04-22] fix | Visit module — reschedule linkage column + tenant timeline filter + Visit Logs notes display [13:30 IST]

## [2026-04-22] diagnose | Eligibility scheduler — unification feasibility diagnosed [14:30 IST]

## [2026-04-22] refactor | Eligibility scheduler unified with VisitSchedulerModal; legacy component deleted [15:30 IST]

## [2026-04-24] diagnose | Codebase audit for WhyReeveFeeModal — modal, tokens, fonts, animations [12:24 IST]

## [2026-04-24] feat | Built WhyReeveFeeModal — 5-screen pain-first story modal for 7% fee [12:45 IST]

## [2026-04-24] fix | WhyReeveFeeModal — fixed empty slides (CSS translateX formula), desktop overflow (overflow-hidden + [&>button]:hidden), added touch swipe nav [13:09 IST]

## [2026-04-24] fix | WhyReeveFeeModal — fixed progressive slide drift and desktop width [13:19 IST]

## [2026-04-24] fix | WhyReeveFeeModal — moved Screen 5 CTA to footer, rewrote Screen 4 narrative [13:42 IST]

## [2026-05-03] perf | Logo dims, hero LCP fade removed, contrast fix [12:30 IST]

## [2026-05-03] feat | Created public/llms.txt and public/llms-full.txt for AI agent discoverability [14:04 IST]

## [2026-05-05] diagnose | PostHog owner funnel tracking audit — listed gaps for 5 funnel steps [11:30 IST]

## [2026-05-05] feat | Instrumented PostHog owner funnel — 5 events across 6 files [12:15 IST]

## [2026-05-17] diagnose | Inspection report PDF export — surveyed codebase, produced diagnosis [IST]
## [2026-05-17] feat | Export dialog + form integration; removed window.print flow [23:55 IST]
## [2026-05-17] feat | PDF document & generator for inspection reports — 9 sections, ReportDocument, generate.ts, dev test button [23:40 IST]
## [2026-05-17] feat | Foundations for inspection report PDF export (migration, deps, types, formatters) [23:18 IST]
## [2026-05-29] feat | Added legal disclaimer section to inspection report PDFs [18:20 IST]
## [2026-05-29] diagnose | Inspection form resilience audit — surveyed save flow, identified loss paths [18:50 IST]
## [2026-05-29] fix | InspectionForm save resilience: re-populate refs on failure, surface failed state with retry, flush before completion [19:15 IST]
## [2026-06-05] diagnose | Audit 4 PDF/form issues: BHK duplication, paint condition, drive link, features+furniture missing [14:30 IST]
## [2026-06-05] fix | PDF render fixes: BHK formatting, furniture and room features now visible [17:45 IST]
## [2026-06-06] feat | Add Google Drive walkthrough link to inspection form and PDF [11:20 IST]
## [2026-06-06] feat | Add paint_condition field to inspection rooms (form + PDF) [11:40 IST]
 InspectionForm rebuild — full diagnostic report produced [15:30 IST]| InspectionForm rebuild — full diagnostic report produced [15:30 IST]
## [2026-06-10] feat | Room ordering fix (Living→Dining→Kitchen→Balcony→Bedroom→Bathroom), DB migration for inspection_summary/key_return_summary/location/dining_room enum, completion validation warnings (advisory, 6 checks, CompletionWarnings dialog) [IST]
## [2026-06-10] feat | Damage log auto-population: useAutoPopulateDamages hook watches rooms state, creates/updates/removes auto DamageItems for repair_before_relet + urgent_immediate conditions across wall/flooring/ceiling/false_ceiling/door-window/electrical/plumbing entry arrays; inspector edits preserved via recommended_action sentinel; room deletion converts to manual entries [IST]
## [2026-06-10] feat | Derived condition chips replace editable dropdowns, condition snapshot at completion and export [IST]
## [2026-06-10] feat | RoomTypeFields.tsx — replace IIFE room-type branches with module-level component; extend ElectricalInventory with 5 detail fields; delete GLASS_CONDITION_OPTIONS from InspectionForm; loadData synthesis for electrical_light_brand/type/switchboard_brand/wifi_point/wifi_brand; 5 Room Features children (Surfaces/DoorsWindows/Electrical/Plumbing/RoomTypeFields) [IST]

## [2026-06-27] audit | SEO/GEO audit for /move-in-audit — [23 checks, 7 issues found: 1 canonical mismatch, 1 missing FAQPage JSON-LD, 1 missing FAQ in bodyHtml, 1 zero internal links, 3 platform-wide OG/Twitter gaps] [IST]
## [2026-06-27] fix | SEO fixes for /move-in-audit — canonical prefix (WWW→BASE), FAQPage JSON-LD (8 Q&As), FAQ in bodyHtml (dl/dt/dd) [IST]
## [2026-07-10] diagnose | Phase 0 diagnosis — PropertyDetail + Dashboard PM feature inventory [IST]
## [2026-07-10] feat | Phase 0 Steps 0.1 + 0.3 — hid PM CTAs in PropertyDetail, hid PM tiles in Dashboard [IST]
## [2026-07-10] diagnose | Phase 1 diagnosis — PropertyEdit anatomy, property schema, RLS, image upload, status flow [IST]
## [2026-07-10] docs | Phase 1 planning captured — split commons.md into 6 focused docs [IST]
## [2026-07-10] diagnose | Phase 1 final diagnosis — validated plan against codebase, sequenced implementation prompts [IST]
## [2026-07-10] migrate | Phase 1 Prompt 1 — 7 migrations, Edge Function ownership check, commons updates [IST]
## [2026-07-10] feat | Phase 1 Prompt 2 — frontend primitives (deps, hooks, utils, config, propertyStatus, Search filter) [IST]
## [2026-07-10] feat | Phase 1 Prompt 3 — ListProperty create mode (9-section accordion, auto-save, photo pipeline, preview) [IST]
## [2026-07-10] feat | Phase 1 Prompt 4 — ListProperty edit mode + 4 edit request RPCs + Edge Function extension [IST]
## [2026-07-10] feat | Phase 1 Prompt 5 — /me and /u/:userId profile pages [IST]
## [2026-07-10] feat | Phase 1 Prompt 6 — owner dashboard rebuild + BottomNav update + property management placeholder [IST]
## [2026-07-10] feat | Phase 1 Prompt 7 — property management page 4-tab experience + confirmation modals [IST]
## [2026-07-10] feat | Phase 1 Prompt 8 — admin listing review queue + commons memory audit [IST]
## [2026-07-10] feat | Phase 1 Prompt 9 — public timeline + session restore + archived notice + modify-edit polish [IST]
## [2026-07-10] fix | Phase 1 Prompt 10 — RLS gap, admin edit log, Path B guards, final commons sync [IST]

## [2026-07-17] diagnosis | Phase 2 pre-build codebase investigation [19:42 IST]
## [2026-07-17] feat | Phase 2 Prompt 1 — types regen, isFullyVerified, memory update (D-172–D-177) [20:17 IST]
## [2026-07-17] feat | Phase 2 Prompt 2 — VerificationGate component, /profile banner + redirect, /list gate, CLAUDE.md trim [20:31 IST]
## [2026-07-17] feat | Phase 2 Prompt 3 — /me and /u/:userId audit + gap fixes [20:35 IST]
## [2026-07-17] feat | Phase 2 Prompt 4 — /tenant-dashboard/preferences page (TenantPreferences.tsx) [20:48 IST]
## [2026-07-17] feat | Phase 2 Prompt 5 — /tenant-dashboard page (TenantDashboard.tsx) [20:53 IST]
## [2026-07-17] feat | Phase 2 Prompt 6 — routing redirect, BottomNav + Header tenant nav update, orphan cleanup [20:58 IST]
