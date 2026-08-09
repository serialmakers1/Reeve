/**
 * Shared property_images helpers.
 *
 * Sync Prompt 1 (D-167) — cover auto-select on first upload. Owner form + admin
 * form both upload photos with `is_primary: false` by default; call this helper
 * after a successful upload to promote the newly uploaded photo when the
 * property has no primary yet. Manual "★ Cover" flow is unaffected.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * If the property has no `is_primary=true` photo, mark `uploadedImageId` as primary.
 * Otherwise no-op. Race-safe enough for the interactive-upload flow: two concurrent
 * uploads for a property with zero primaries could both set themselves primary,
 * but that's a benign edge case — the last write wins visually and the owner
 * can override via the manual "★ Cover" control.
 */
export async function ensurePrimaryPhoto(propertyId: string, uploadedImageId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: countError } = await (supabase as any)
    .from("property_images")
    .select("id")
    .eq("property_id", propertyId)
    .eq("is_primary", true)
    .limit(1);
  if (countError) return; // fail closed — do not force-promote if we can't read state.
  if (Array.isArray(existing) && existing.length > 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("property_images")
    .update({ is_primary: true })
    .eq("id", uploadedImageId);
}

/**
 * Set the cover photo on a LIVE listing (Prompt 2 / Prompt-1 contract). The DB blocks
 * direct is_primary flips on listed/edit_pending_review; the transactional RPC
 * `set_primary_property_photo` self-authorizes, keeps exactly one primary, and is the
 * only valid path. Use this on live listings; `ensurePrimaryPhoto` remains for draft.
 * Throws on failure so the caller can surface an error + not update local state.
 */
export async function setPrimaryPhotoViaRpc(imageId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("set_primary_property_photo", {
    p_image_id: imageId,
  });
  if (error) throw new Error(error.message ?? "Could not set cover photo");
}
