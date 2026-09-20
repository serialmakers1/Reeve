import { BRAND } from '../styles';
import type { DamageItem } from '@/types/inspection';

/**
 * Shared, presentation-only issue helpers used by BOTH the detailed Issues
 * section (DamagesSection) and the Inspection Brief. Business logic is unchanged
 * from Prompt 1 — this module only centralizes the display mapping so the Brief
 * never reimplements severity/next-action behaviour.
 */

export type SeverityKey = 'cosmetic' | 'repair_before_relet' | 'urgent_immediate';

/** Normalizes new + legacy severity values to the three internal keys. */
export function normalizeSeverity(severity: DamageItem['severity']): SeverityKey | null {
  if (severity === 'urgent_immediate' || (severity as string) === 'high') return 'urgent_immediate';
  if (severity === 'repair_before_relet' || (severity as string) === 'medium') return 'repair_before_relet';
  if (severity === 'cosmetic' || (severity as string) === 'low') return 'cosmetic';
  return null;
}

/** Owner-facing severity label. Always explicit text (never colour-only). */
export const SEVERITY_LABEL: Record<SeverityKey, string> = {
  cosmetic: 'Cosmetic / Minor',
  repair_before_relet: 'Attention Needed',
  urgent_immediate: 'Urgent',
};

/** Semantic tone tokens per severity (text + surface). Meaning, not decoration. */
export const SEVERITY_TONE: Record<SeverityKey, { text: string; bg: string }> = {
  cosmetic: { text: BRAND.blue, bg: '#eff6ff' },
  repair_before_relet: { text: BRAND.attentionText, bg: BRAND.attentionBg },
  urgent_immediate: { text: BRAND.urgentText, bg: BRAND.urgentBg },
};

// Display-only next-action fallback derived from severity. Applied ONLY to
// auto-generated issues with no inspector-entered recommendation; never persisted.
const SEVERITY_DEFAULT_ACTION: Record<SeverityKey, string> = {
  cosmetic: 'Monitor',
  repair_before_relet: 'Maintenance recommended',
  urgent_immediate: 'Urgent attention',
};

/**
 * The next action to display for an issue:
 *  - a manual/inspector recommendation is authoritative (verbatim);
 *  - an auto-generated issue with no recommendation gets the severity fallback;
 *  - a manual issue with a blank recommendation stays blank.
 */
export function nextAction(d: DamageItem): string {
  const manual = d.recommended_action?.trim();
  if (manual) return manual;
  if (d.is_auto_generated) {
    const key = normalizeSeverity(d.severity);
    if (key) return SEVERITY_DEFAULT_ACTION[key];
  }
  return '';
}

/** Severity ranking for priority ordering (Urgent first). */
export const SEVERITY_RANK: Record<SeverityKey, number> = {
  urgent_immediate: 0,
  repair_before_relet: 1,
  cosmetic: 2,
};

/** Counts by severity key, for the Brief's severity tiles. */
export function severityCounts(damages: DamageItem[]): Record<SeverityKey, number> {
  const counts: Record<SeverityKey, number> = {
    cosmetic: 0,
    repair_before_relet: 0,
    urgent_immediate: 0,
  };
  for (const d of damages) {
    const key = normalizeSeverity(d.severity);
    if (key) counts[key] += 1;
  }
  return counts;
}

/**
 * Up to `limit` priority items, ordered Urgent → Attention → Cosmetic while
 * preserving original order within each severity. Presentation-only.
 */
export function priorityItems(damages: DamageItem[], limit = 3): DamageItem[] {
  return damages
    .map((d, i) => ({ d, i, rank: normalizeSeverity(d.severity) }))
    .filter((x) => x.rank !== null)
    .sort((a, b) =>
      SEVERITY_RANK[a.rank as SeverityKey] - SEVERITY_RANK[b.rank as SeverityKey] || a.i - b.i,
    )
    .slice(0, limit)
    .map((x) => x.d);
}
