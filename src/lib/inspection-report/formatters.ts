import { format, parseISO, isValid } from 'date-fns';

function toDate(d: Date | string | null): Date | null {
  if (!d) return null;
  const parsed = typeof d === 'string' ? parseISO(d) : d;
  return isValid(parsed) ? parsed : null;
}

// "17 May 2026" — date portion only, no timezone conversion needed.
export function formatINDate(d: Date | string | null): string {
  const date = toDate(d);
  if (!date) return '—';
  return format(date, 'd MMM yyyy');
}

// "17 May 2026, 14:32 IST"
// IST is UTC+5:30. We compute it explicitly so the output is the same
// regardless of the browser/OS timezone — required for Indian rental documents.
export function formatINDateTimeIST(d: Date | string | null): string {
  const date = toDate(d);
  if (!date) return '—';
  const istMs = date.getTime() + (5 * 60 + 30) * 60 * 1000;
  const ist = new Date(istMs);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day  = ist.getUTCDate();
  const mon  = MONTHS[ist.getUTCMonth()];
  const year = ist.getUTCFullYear();
  const hh   = String(ist.getUTCHours()).padStart(2, '0');
  const mm   = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${day} ${mon} ${year}, ${hh}:${mm} IST`;
}

// "2026-05-17" for use in filenames.
export function formatFilenameDate(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

// First 8 characters of a UUID — mirrors the display helper in InspectionForm.tsx
// but lives here so PDF code has no dependency on a page module.
export function shortPropertyId(id: string): string {
  return id.slice(0, 8);
}
