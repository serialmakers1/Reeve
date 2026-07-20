type UserLike =
  | { full_name?: string | null; email?: string | null }
  | null
  | undefined;
// D-P4-002/003: full_name (Google) is primary. display_name retained as a
// legacy fallback since existing rows may still carry a value.
type ProfileLike = { display_name?: string | null } | null | undefined;

export function getUserDisplayName(user: UserLike, profile?: ProfileLike): string {
  if (user?.full_name) return user.full_name;
  const dn = profile?.display_name?.trim();
  if (dn) return dn;
  if (user?.email) {
    const prefix = user.email.split("@")[0];
    if (prefix) return prefix;
  }
  return "Anonymous";
}

/**
 * Returns first initial + last initial for avatar placeholder.
 * Used when profile_photo_url is not set.
 */
export function getUserInitials(user: UserLike, profile?: ProfileLike): string {
  const name = getUserDisplayName(user, profile);
  if (name === "Anonymous") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
