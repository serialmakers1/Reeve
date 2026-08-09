/**
 * Normalized owner review payload (Prompt 2a / S0).
 *
 * One canonical shape used for BOTH dirty-detection (reviewDraft vs pendingBaseline)
 * and for building the exact Prompt-1 `submit_property_edit_request` args. amenities/
 * furnishing are normalized to custom-additions-only (never full JSON), scalar no-ops
 * (== current live) are dropped, and internal field names are NEVER sent to the RPC —
 * `toSubmitArgs` maps them to the deployed contract (`p_field_changes.amenities`,
 * `p_field_changes.furnishing_detail`, `p_photo_changes.add`).
 *
 * Pure + framework-free so it can be unit-tested directly.
 */

import type { FurnishingItem } from "@/lib/reviewAmenities";

/** Review scalar columns (removal-asymmetric text + enum corrections). */
export const REVIEW_SCALAR_KEYS: readonly string[] = [
  "building_notes", "building_rules", "parking_notes", "rera_registration_number",
  "youtube_walkthrough_url", "bhk", "property_type",
];

export interface ReviewLiveBaseline {
  scalars?: Record<string, unknown>;
  amenities?: { building?: string[] } | null;
  furnishing_detail?: FurnishingItem[] | null;
}

export interface StagedPhoto {
  url: string;
  section?: string | null;
  is_floor_plan?: boolean;
}

/** The review-draft buffer shape ListProperty maintains. */
export interface ReviewDraftFields {
  // review scalars keyed by DB column
  [k: string]: unknown;
  amenities_add?: string[];
  furnishing_add?: FurnishingItem[];
}

export interface NormalizedReview {
  scalars: Record<string, string>;
  amenities_add: string[];
  furnishing_add: FurnishingItem[];
  photo_add: StagedPhoto[];
}

const norm = (s: string): string => s.trim().toLowerCase();
const normScalar = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/**
 * Build the canonical normalized review payload. Omits scalar proposals equal to the
 * current live value (retract → no-op) and custom additions already live / no longer
 * proposed, so retractions never trip Prompt-1's "No reviewable changes".
 */
export function normalizeReviewPayload(
  fieldChanges: ReviewDraftFields,
  stagedAdds: StagedPhoto[],
  liveBaseline: ReviewLiveBaseline | null | undefined,
): NormalizedReview {
  const scalars: Record<string, string> = {};
  for (const k of REVIEW_SCALAR_KEYS) {
    if (!(k in fieldChanges)) continue;
    const proposed = normScalar(fieldChanges[k]);
    if (proposed == null) continue; // clearing is a live op, never a review proposal
    const live = normScalar(liveBaseline?.scalars?.[k]);
    if (proposed !== live) scalars[k] = proposed; // real add/replace only
  }

  const liveBuilding = new Set(
    (liveBaseline?.amenities?.building ?? []).map((x) => norm(String(x))),
  );
  const amenities_add = uniqBy(
    (fieldChanges.amenities_add ?? []).map((x) => String(x).trim()).filter(Boolean),
    (x) => norm(x),
  ).filter((x) => !liveBuilding.has(norm(x)));

  const liveFdNames = new Set(
    (liveBaseline?.furnishing_detail ?? [])
      .filter((e) => e && typeof e.item === "string")
      .map((e) => norm(e.item)),
  );
  const furnishing_add = uniqBy(
    (fieldChanges.furnishing_add ?? []).filter((e) => e && typeof e.item === "string" && e.item.trim()),
    (e) => norm(e.item),
  ).filter((e) => !liveFdNames.has(norm(e.item)));

  const photo_add = (stagedAdds ?? []).map((a) => ({
    url: a.url,
    section: a.section ?? null,
    is_floor_plan: !!a.is_floor_plan,
  }));

  return { scalars, amenities_add, furnishing_add, photo_add };
}

/** A staged photo reconstructed on reload, carrying a client temp id. */
export interface HydratedStagedPhoto extends StagedPhoto {
  temp_id: string;
  section: string | null;
  is_floor_plan: boolean;
}

export interface HydratedPersistedReview {
  /** Internal review-draft buffer (deployed `*_add` keys mapped to internal names). */
  draftFc: ReviewDraftFields;
  /** Proposed scalar values only (for merged form display). */
  proposedScalars: Record<string, unknown>;
  addAmenities: string[];
  addFurnishing: FurnishingItem[];
  staged: HydratedStagedPhoto[];
}

/**
 * Reconstruct the owner review-draft state from a PERSISTED pending edit-request payload
 * (the deployed shape: `field_changes` with `amenities_building_add`/`furnishing_detail_add`
 * deltas + scalar keys, plus `photo_changes.add`). This is the single source of the reload/
 * refresh hydration contract: after a remount the same proposals must reappear as "Under
 * review" (not dirty), and staged photos must not be duplicated. Pure + deterministic given
 * an injectable id generator.
 */
export function hydratePersistedReviewPayload(
  payload: { field_changes?: Record<string, unknown> | null; photo_changes?: { add?: unknown[] | null } | null } | null | undefined,
  genId: () => string = () => globalThis.crypto?.randomUUID?.() ?? `s-${Math.random()}`,
): HydratedPersistedReview {
  const fc = (payload?.field_changes ?? {}) as Record<string, unknown>;
  const draftFc: ReviewDraftFields = {};
  const proposedScalars: Record<string, unknown> = {};
  let addAmenities: string[] = [];
  let addFurnishing: FurnishingItem[] = [];
  for (const [k, v] of Object.entries(fc)) {
    if (k === "amenities_building_add") { addAmenities = (v as string[]) ?? []; draftFc.amenities_add = v as string[]; }
    else if (k === "furnishing_detail_add") { addFurnishing = (v as FurnishingItem[]) ?? []; draftFc.furnishing_add = v as FurnishingItem[]; }
    else { proposedScalars[k] = v; draftFc[k] = v; }
  }
  const rawAdds = (payload?.photo_changes?.add ?? []) as Array<{ url: string; section?: string | null; is_floor_plan?: boolean; temp_id?: string }>;
  const staged: HydratedStagedPhoto[] = rawAdds.map((a) => ({
    temp_id: a.temp_id ?? genId(),
    url: a.url,
    section: a.section ?? null,
    is_floor_plan: !!a.is_floor_plan,
  }));
  return { draftFc, proposedScalars, addAmenities, addFurnishing, staged };
}

/** True when the normalized review payload contains nothing submittable. */
export function isReviewEmpty(n: NormalizedReview): boolean {
  return (
    Object.keys(n.scalars).length === 0 &&
    n.amenities_add.length === 0 &&
    n.furnishing_add.length === 0 &&
    n.photo_add.length === 0
  );
}

/** Structural equality of two normalized review payloads (dirty-detection). */
export function reviewEquals(a: NormalizedReview, b: NormalizedReview): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/** Map the normalized payload to the EXACT deployed RPC args. */
export function toSubmitArgs(n: NormalizedReview): {
  p_field_changes: Record<string, unknown>;
  p_photo_changes: { add: StagedPhoto[] };
} {
  const p_field_changes: Record<string, unknown> = { ...n.scalars };
  if (n.amenities_add.length) p_field_changes.amenities = { building: n.amenities_add };
  if (n.furnishing_add.length) p_field_changes.furnishing_detail = n.furnishing_add;
  return { p_field_changes, p_photo_changes: { add: n.photo_add } };
}

// ── internals ──
function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function canonical(n: NormalizedReview) {
  return {
    scalars: Object.keys(n.scalars).sort().reduce<Record<string, string>>((o, k) => ((o[k] = n.scalars[k]), o), {}),
    amenities_add: [...n.amenities_add].map((x) => x.trim().toLowerCase()).sort(),
    furnishing_add: [...n.furnishing_add]
      .map((e) => ({ ...e, item: e.item.trim().toLowerCase() }))
      .sort((a, b) => a.item.localeCompare(b.item)),
    photo_add: [...n.photo_add].map((p) => p.url).sort(),
  };
}
