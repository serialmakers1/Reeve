export const FLAT_NUM_RE = /^[A-Za-z0-9 /-]{1,10}$/;

export function validateFlatNumber(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null;
  const t = v.trim();
  if (t.length > 10) return "Flat / Unit number can be up to 10 characters.";
  if (!FLAT_NUM_RE.test(t)) return "Use only letters, numbers, spaces, hyphens and slashes.";
  return null;
}
