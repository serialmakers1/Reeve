import { describe, it, expect } from 'vitest';
import { scanRoomsForTriggers } from '@/hooks/useAutoPopulateDamages';
import type { LocalRoom } from '@/types/inspection';

/**
 * Focused tests for the pure classifier that turns room features into desired
 * auto-generated issues. Guards the Prompt-1 classification fixes:
 *  - visible plumbing leak/drip/flow issues are not cosmetic;
 *  - a geyser point-only/no-provision "missing" state generates no issue (plumbing + electrical);
 *  - genuinely urgent conditions stay urgent;
 *  - a normal (non-geyser) "missing" is attention, not urgent.
 */

function makeRoom(features: Record<string, unknown>): LocalRoom {
  return {
    id: 'room-1',
    inspection_id: 'insp-1',
    room_type: 'bathroom',
    room_label: 'Bathroom',
    sort_order: 0,
    walls_condition: null,
    walls_notes: null,
    paint_condition: null,
    flooring_condition: null,
    flooring_notes: null,
    ceiling_condition: null,
    ceiling_notes: null,
    doors_windows_condition: null,
    doors_windows_notes: null,
    electrical_condition: null,
    electrical_notes: null,
    plumbing_condition: null,
    plumbing_notes: null,
    overall_room_notes: null,
    is_auto_generated: false,
    room_features: features,
    furniture_items: [],
  };
}

function severities(rooms: LocalRoom[]): string[] {
  return Array.from(scanRoomsForTriggers(rooms).values()).map((e) => e.severity);
}

describe('scanRoomsForTriggers — issue classification', () => {
  it('classifies visible plumbing leak / drip / slow drain / low pressure as Attention Needed (not cosmetic)', () => {
    for (const status of ['leaking', 'dripping', 'slow_drain', 'low_pressure']) {
      const room = makeRoom({ plumbing_issues: [{ item: 'sink', status }] });
      expect(severities([room])).toEqual(['repair_before_relet']);
    }
  });

  it('keeps genuinely urgent conditions urgent', () => {
    const majorLeak = makeRoom({ plumbing_issues: [{ item: 'drain', status: 'major_leakage' }] });
    expect(severities([majorLeak])).toEqual(['urgent_immediate']);

    const severeWall = makeRoom({ wall_entries: [{ location: 'all_walls', condition: 'severe_damage' }] });
    expect(severities([severeWall])).toContain('urgent_immediate');
  });

  it('treats a normal (non-geyser) missing item as Attention Needed, not urgent', () => {
    const missingSocket = makeRoom({ electrical_issues: [{ item: 'socket', status: 'missing' }] });
    expect(severities([missingSocket])).toEqual(['repair_before_relet']);

    const missingSink = makeRoom({ plumbing_issues: [{ item: 'sink', status: 'missing' }] });
    expect(severities([missingSink])).toEqual(['repair_before_relet']);
  });

  it.each([
    ['Point only'],
    ['No provision'],
  ])('suppresses a missing geyser issue when geyser_status is "%s" (plumbing + electrical)', (geyser_status) => {
    const plumbingGeyser = makeRoom({
      geyser_status,
      plumbing_issues: [{ item: 'geyser', status: 'missing' }],
    });
    expect(severities([plumbingGeyser])).toEqual([]);

    const electricalGeyser = makeRoom({
      geyser_status,
      electrical_issues: [{ item: 'geyser_point', status: 'missing' }],
    });
    expect(severities([electricalGeyser])).toEqual([]);
  });

  it('still records a missing geyser when a unit is mounted', () => {
    const room = makeRoom({
      geyser_status: 'Geyser mounted',
      plumbing_issues: [{ item: 'geyser', status: 'missing' }],
    });
    expect(severities([room])).toEqual(['repair_before_relet']);
  });
});
