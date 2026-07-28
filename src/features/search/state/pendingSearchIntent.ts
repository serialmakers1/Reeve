import type { PendingSearchIntent } from "../domain/searchTypes";
import { PENDING_INTENT_EXPIRY_MS } from "../domain/searchConstants";

const INTENT_KEY = "reeve-search-pending-intent";

/**
 * Persists a pending favourite intent to sessionStorage.
 * Silently ignores external returnUrls (must start with "/").
 */
export function writePendingIntent(propertyId: string, returnUrl: string): void {
  if (!returnUrl.startsWith("/")) return;
  const intent: PendingSearchIntent = {
    propertyId,
    action: "add",
    returnUrl,
    expiresAt: Date.now() + PENDING_INTENT_EXPIRY_MS,
  };
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}

/**
 * Reads the pending intent.
 * Returns null if absent, expired, or the JSON is corrupted.
 */
export function readPendingIntent(): PendingSearchIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const intent = JSON.parse(raw) as PendingSearchIntent;
    if (
      typeof intent !== "object" ||
      typeof intent.propertyId !== "string" ||
      typeof intent.expiresAt !== "number"
    ) {
      return null;
    }
    if (Date.now() > intent.expiresAt) return null;
    return intent;
  } catch {
    return null;
  }
}

/** Removes the pending intent from sessionStorage. */
export function clearPendingIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Reads and clears the intent atomically.
 * A second call in the same session will always return null.
 */
export function consumePendingIntent(): PendingSearchIntent | null {
  const intent = readPendingIntent();
  if (intent) clearPendingIntent();
  return intent;
}
