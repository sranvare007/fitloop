import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

const PATHS: Record<string, string> = {
  home: 'M3 10.6L12 3l9 7.6 M5.5 9.5V20h13V9.5',
  dumbbell: 'M6.5 6.5v11 M17.5 6.5v11 M3.5 9v6 M20.5 9v6 M6.5 12h11',
  chart: 'M4 4v16h16 M8 15l3.5-4 3 2.2L20 8',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7.5V12l3 2',
  gear: 'M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.5H10.9l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.5h3.8l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4z',
  gearDot: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  x: 'M5 5l14 14 M19 5L5 19',
  check: 'M4 12.5l5 5L20 6.5',
  trash: 'M4 7h16 M9 7V4.5h6V7 M6.5 7l1 13h9l1-13',
  pencil: 'M4 20l4-1L19 8l-3-3L5 16l-1 4z',
  chevR: 'M9 5l7 7-7 7',
  chevL: 'M15 5l-7 7 7 7',
  chevD: 'M5 9l7 7 7-7',
  chevU: 'M5 15l7-7 7 7',
  grip: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-3.5-3.5',
  star: 'M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z',
  flame: 'M12 3c1 3-2 4-2 7a4 4 0 0 0 8 0c0-2-1-3-1-3 2 1 3 3 3 6a8 8 0 1 1-16 0c0-4 4-5 6-10z',
  ruler: 'M4 14l10-10 6 6L10 20z M8 10l2 2 M11 7l2 2 M5 13l2 2',
  back: 'M15 5l-7 7 7 7',
  edit: 'M4 20l4-1L19 8l-3-3L5 16l-1 4z',
  calendar: 'M4 6.5h16V20H4z M4 10h16 M8 3.5V7 M16 3.5V7',
  play: 'M7 4.5l13 7.5-13 7.5z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20a7.5 7.5 0 0 1 15 0',
  drop: 'M12 3c4 5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2-6 6-11z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1.5V4 M12 20v2.5 M4 12H1.5 M22.5 12H20 M5 5l1.8 1.8 M17.2 17.2L19 19 M19 5l-1.8 1.8 M6.8 17.2L5 19',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z',
  trend: 'M3 17l6-6 4 4 8-9 M15 6h6v6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 7.5h.01',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  swap: 'M7 4L3.5 7.5 7 11 M3.5 7.5H17 M17 20l3.5-3.5L17 13 M20.5 16.5H7',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 20h16',
  download: 'M12 4v12 M7 11l5 5 5-5 M4 20h16',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  camera: 'M3.5 8.5h3.2l1.4-2.2h7.8l1.4 2.2h3.2V19H3.5z M12 16.3a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z',
  image: 'M4 5h16v14H4z M4 16l4.5-4.5 3 3 4-4L20 14 M8.5 9.6a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  sw?: number;
  fill?: string;
}

export function Icon({ name, size = 24, color = 'currentColor', sw = 2, fill = 'none' }: IconProps) {
  const hasGearDot = name === 'gear';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={PATHS[name] || ''}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill === 'none' ? 'none' : color}
      />
      {hasGearDot && (
        <Path
          d={PATHS.gearDot}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </Svg>
  );
}

// Dots menu SVG (3 horizontal circles)
export function DotsMenu({ color = 'rgba(255,255,255,0.36)' }: { color?: string }) {
  return (
    <Svg width={18} height={6} viewBox="0 0 18 6">
      <Circle cx={2.5} cy={3} r={2.2} fill={color} />
      <Circle cx={9} cy={3} r={2.2} fill={color} />
      <Circle cx={15.5} cy={3} r={2.2} fill={color} />
    </Svg>
  );
}
