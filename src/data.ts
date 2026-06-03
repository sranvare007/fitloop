export interface SetEntry { reps: number; kg: number }
export interface SessionExercise { id: string; name: string; sets: SetEntry[] }
export interface Routine { id: string; name: string; days: number[]; color: string; exercises: string[] }
export interface Session {
  id: string; routineId: string | null; routineName: string;
  startedAt: number; endedAt: number; durationSec: number;
  exercises: SessionExercise[]; volume: number; notes: string;
}
export interface Measurement { id: string; at: number; weightKg: number; bodyFat: number | null }
export interface Profile { name: string; age: number; gender: string; heightCm: number; weightKg: number }
export interface Override { day: number; id: string }

export interface FmtHelper {
  unit: 'kg' | 'lbs';
  wlabel: string;
  step: number;
  w: (kg: number) => number;
  wStr: (kg: number) => string;
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
import * as Crypto from 'expo-crypto';
export const uid = (): string => Crypto.randomUUID();
export const DAY_MS = 86400000;
export const LB = 2.20462;
export const ROUTINE_COLORS = ['#FF5A2C', '#C6FF3A', '#5B8CFF', '#FF9F1C', '#19E0A0', '#C77DFF'];

const SEED_ROUTINES: Routine[] = [
  { id: 'r1', name: 'Push Day', days: [1, 4], color: '#FF5A2C',
    exercises: ['Bench Press', 'Incline DB Press', 'Overhead Press', 'Cable Fly', 'Tricep Pushdown'] },
  { id: 'r2', name: 'Pull Day', days: [2, 5], color: '#C6FF3A',
    exercises: ['Deadlift', 'Lat Pulldown', 'Barbell Row', 'Face Pull', 'Bicep Curl'] },
  { id: 'r3', name: 'Leg Day', days: [3, 6], color: '#5B8CFF',
    exercises: ['Back Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Calf Raise'] },
];

export const SEED_PB: Record<string, [number, number]> = {
  'Bench Press': [80, 8], 'Incline DB Press': [32, 10], 'Overhead Press': [50, 8],
  'Cable Fly': [22, 12], 'Tricep Pushdown': [30, 14], 'Deadlift': [140, 5],
  'Lat Pulldown': [70, 10], 'Barbell Row': [80, 8], 'Face Pull': [25, 15],
  'Bicep Curl': [18, 12], 'Back Squat': [120, 6], 'Leg Press': [200, 10],
  'Romanian Deadlift': [100, 8], 'Leg Curl': [45, 12], 'Calf Raise': [90, 15],
};

export const KNOWN_EXERCISES = [...new Set([
  ...Object.keys(SEED_PB),
  'Dumbbell Bench Press', 'Machine Chest Press', 'Push-up', 'Dips',
  'Pull-up', 'Chin-up', 'Seated Cable Row', 'T-Bar Row', 'Hammer Curl',
  'Lateral Raise', 'Front Raise', 'Goblet Squat', 'Hack Squat', 'Lunge',
  'Hip Thrust', 'Hanging Leg Raise', 'Plank', 'Skull Crusher',
])].sort();

function genHistory(): Session[] {
  const sessions: Session[] = [];
  const now = Date.now();
  const plan = [{ r: SEED_ROUTINES[0] }, { r: SEED_ROUTINES[1] }, { r: SEED_ROUTINES[2] }];
  for (let w = 8; w >= 0; w--) {
    plan.forEach((p, pi) => {
      const start = now - (w * 7 + (6 - pi * 2)) * DAY_MS - 19 * 3600000;
      const prog = (8 - w) * 0.02;
      const exs = p.r.exercises.slice(0, 4).map((name) => {
        const [baseKg, baseReps] = SEED_PB[name] || [40, 10];
        const top = Math.round((baseKg * (0.86 + prog) * 2) / 2 * 2) / 2;
        const sets: SetEntry[] = [
          { reps: baseReps + 2, kg: Math.max(20, Math.round((top * 0.75) / 2.5) * 2.5) },
          { reps: baseReps, kg: Math.max(20, Math.round((top * 0.9) / 2.5) * 2.5) },
          { reps: baseReps - 1, kg: top },
        ];
        return { id: uid(), name, sets };
      });
      const vol = exs.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.reps * x.kg, 0), 0);
      const dur = 2600 + Math.round(Math.random() * 1400);
      sessions.push({
        id: uid(), routineId: p.r.id, routineName: p.r.name,
        startedAt: start, endedAt: start + dur * 1000, durationSec: dur,
        exercises: exs, volume: Math.round(vol), notes: '',
      });
    });
  }
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

function genMeasurements(): Measurement[] {
  const out: Measurement[] = [];
  const now = Date.now();
  let wt = 84.5, bf = 19.5;
  for (let i = 60; i >= 0; i -= 4) {
    wt -= 0.18 + Math.random() * 0.12;
    bf -= 0.07 + Math.random() * 0.05;
    out.push({ id: uid(), at: now - i * DAY_MS, weightKg: +wt.toFixed(1), bodyFat: +bf.toFixed(1) });
  }
  return out;
}

export const SEED = {
  profile: { name: 'Alex', age: 28, gender: 'MALE', heightCm: 178, weightKg: 79.4 } as Profile,
  routines: SEED_ROUTINES,
  history: genHistory(),
  measurements: genMeasurements(),
};

export function makeFmt(unit: 'kg' | 'lbs'): FmtHelper {
  return {
    unit,
    wlabel: unit === 'kg' ? 'kg' : 'lbs',
    step: unit === 'kg' ? 2.5 : 5,
    w: (kg: number) => unit === 'kg' ? kg : Math.round(kg * LB),
    wStr: (kg: number) => (unit === 'kg' ? +kg.toFixed(1) : Math.round(kg * LB)) + '',
  };
}

export function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function relDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const nowMid = new Date(now); nowMid.setHours(0, 0, 0, 0);
  const tsMid = new Date(ts); tsMid.setHours(0, 0, 0, 0);
  const days = Math.floor((nowMid.getTime() - tsMid.getTime()) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return DAYS_FULL[d.getDay()];
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function monthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function sessionVolume(exercises: SessionExercise[]): number {
  return Math.round(exercises.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.reps * x.kg, 0), 0));
}

export function sessionSets(exercises: SessionExercise[]): number {
  return exercises.reduce((a, e) => a + e.sets.length, 0);
}

export function dayLabel(days: number[]): string {
  if (days.length === 0) return 'Not scheduled';
  if (days.length === 7) return 'Every day';
  return [1,2,3,4,5,6,0].filter(d => days.includes(d)).map(d => DAYS[d]).join(', ');
}
