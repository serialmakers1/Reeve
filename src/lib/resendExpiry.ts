export function isResendExpiredAt(approvedAt: string | null, nowMs: number): boolean {
  if (!approvedAt) return true;
  const approvedAtMs = Date.parse(approvedAt);
  if (!Number.isFinite(approvedAtMs)) return true;
  return nowMs - approvedAtMs > 15 * 24 * 60 * 60 * 1000;
}
