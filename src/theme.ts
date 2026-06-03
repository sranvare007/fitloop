export type Theme = {
  name: 'dark' | 'light';
  bg: string;
  surface: string;
  surface2: string;
  elev: string;
  elev2: string;
  line: string;
  line2: string;
  text: string;
  mut: string;
  mut2: string;
  orange: string;
  orangeInk: string;
  lime: string;
  limeSoft: string;
  limeInk: string;
  onLime: string;
  danger: string;
  bar: string;
};

const DARK_BASE = {
  name: 'dark' as const,
  bg: '#0C0D10',
  surface: '#15161C',
  surface2: '#1B1D24',
  elev: '#23252E',
  elev2: '#2B2E39',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.055)',
  text: '#F3F4F7',
  mut: 'rgba(255,255,255,0.56)',
  mut2: 'rgba(255,255,255,0.36)',
  danger: '#FF5470',
  bar: 'rgba(18,19,24,0.86)',
};

const LIGHT_BASE = {
  name: 'light' as const,
  bg: '#F1F1EE',
  surface: '#FFFFFF',
  surface2: '#FAFAF8',
  elev: '#F0F0EC',
  elev2: '#E6E6E1',
  line: 'rgba(20,20,28,0.10)',
  line2: 'rgba(20,20,28,0.07)',
  text: '#15161C',
  mut: 'rgba(20,22,30,0.58)',
  mut2: 'rgba(20,22,30,0.40)',
  danger: '#E23A5C',
  bar: 'rgba(255,255,255,0.82)',
};

export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function darken(hex: string, f = 0.5): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `rgb(${r}, ${g}, ${b})`;
}

export function makeTheme(themeName: string, accent: string, pop: string): Theme {
  const base = themeName === 'dark' ? DARK_BASE : LIGHT_BASE;
  return {
    ...base,
    orange: accent,
    orangeInk: themeName === 'dark' ? '#0C0D10' : '#fff',
    lime: pop,
    limeSoft: hexA(pop, themeName === 'dark' ? 0.14 : 0.18),
    limeInk: themeName === 'dark' ? pop : darken(pop, 0.45),
    onLime: '#0C0D10',
  };
}

export const ACCENT_OPTIONS = [
  { hex: '#FF5A2C', name: 'Ember' },
  { hex: '#5B8CFF', name: 'Electric' },
  { hex: '#19E0A0', name: 'Mint' },
  { hex: '#C77DFF', name: 'Violet' },
  { hex: '#FF4D6D', name: 'Cherry' },
  { hex: '#FF9F1C', name: 'Amber' },
];

export const POP_OPTIONS = [
  { hex: '#C6FF3A', name: 'Lime' },
  { hex: '#4DE1FF', name: 'Cyan' },
  { hex: '#FFC83A', name: 'Gold' },
  { hex: '#6EE787', name: 'Leaf' },
  { hex: '#FF73C3', name: 'Pink' },
];
