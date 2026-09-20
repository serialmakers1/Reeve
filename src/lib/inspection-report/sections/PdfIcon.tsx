import React from 'react';
import { Svg, Path } from '@react-pdf/renderer';
import { BRAND } from '../styles';

/**
 * One consistent SVG icon language for the PDF (no lucide-react / DOM icons, no
 * emoji, no Unicode symbols). Each icon is one or more stroked 24×24 paths.
 * Icons are supportive; text always remains authoritative.
 */
export type IconName =
  | 'building' | 'calendar' | 'user' | 'service' | 'occupancy' | 'warning'
  | 'bolt' | 'flame' | 'room' | 'appliance' | 'key' | 'notes' | 'signature'
  | 'folder' | 'water' | 'shield' | 'check' | 'arrow' | 'phone' | 'mail'
  | 'globe' | 'home' | 'doc';

const ICON_PATHS: Record<IconName, string[]> = {
  building: ['M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16', 'M15 21V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v12', 'M3 21h18', 'M7 8h3', 'M7 12h3', 'M7 16h3'],
  calendar: ['M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z', 'M4 9h16', 'M8 3v4', 'M16 3v4'],
  user: ['M5 20a7 7 0 0 1 14 0', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  service: ['M3 8a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', 'M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2', 'M3 13h18'],
  occupancy: ['M4 11 12 4l8 7', 'M6 10v9h12v-9', 'M10 19v-5h4v5'],
  home: ['M4 11 12 4l8 7', 'M6 10v9h12v-9'],
  warning: ['M12 4 22 20H2z', 'M12 10v5', 'M12 18h.01'],
  bolt: ['M13 3 5 13h6l-1 8 8-10h-6z'],
  flame: ['M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1 1 2 2 2 1-2 0-4 1-7z'],
  room: ['M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17', 'M4 21h16', 'M14 12h.5'],
  appliance: ['M9 3v5', 'M15 3v5', 'M7 8h10v3a5 5 0 0 1-10 0z', 'M12 16v5'],
  key: ['M14 7a4 4 0 1 1-3.9 5H8v3H5v-3H3v-3h7.1A4 4 0 0 1 14 7z'],
  notes: ['M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M14 3v4h4', 'M8 12h8', 'M8 16h6'],
  doc: ['M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M14 3v4h4', 'M8 12h8', 'M8 16h6'],
  signature: ['M3 20c3 0 3-2 6-2s3 2 6 2 3-2 3-2', 'M5 15 15 5l3 3L8 18l-4 1z'],
  folder: ['M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z'],
  water: ['M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z'],
  shield: ['M12 3 20 6v6c0 5-4 8-8 9-4-1-8-4-8-9V6z'],
  check: ['M4 12l5 5L20 6'],
  arrow: ['M4 12h15', 'M13 6l6 6-6 6'],
  phone: ['M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  globe: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'],
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function PdfIcon({ name, size = 12, color = BRAND.blue, strokeWidth = 1.7 }: Props) {
  const paths = ICON_PATHS[name] ?? [];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
