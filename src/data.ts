/** `note` is a free-text comment on the set (e.g. "used 5kg plate"); '' when none. */
export interface SetEntry { reps: number; kg: number; note: string }
export interface SessionExercise {
  id: string; name: string; sets: SetEntry[];
  /** kcal burnt on this exercise, estimated by the backend; null until estimated. */
  calories?: number | null;
}
export interface Routine { id: string; name: string; days: number[]; color: string; exercises: string[] }
export interface Session {
  id: string; routineId: string | null; routineName: string;
  startedAt: number; endedAt: number; durationSec: number;
  exercises: SessionExercise[]; volume: number; notes: string;
  /** Total kcal burnt, estimated by the backend; null until estimated. */
  calories?: number | null;
  /** One-line intensity summary that came back with the estimate. */
  caloriesSummary?: string;
}
export interface Measurement { id: string; at: number; weightKg: number; bodyFat: number | null }
export type BodyPart =
  | 'neck' | 'shoulders' | 'chest' | 'biceps' | 'forearms'
  | 'waist' | 'hips' | 'thighs' | 'calves';
/** One measuring session. Circumferences are always stored in cm; a part left blank is absent. */
export interface BodyLog { id: string; at: number; values: Partial<Record<BodyPart, number>> }
export type PhysiquePose = 'front' | 'back' | 'side' | 'legs' | 'other';
export interface PhysiquePhoto {
  id: string;
  at: number;
  /** Filename within the physique photo directory (the only part persisted in the DB). */
  file: string;
  /** Resolved absolute file:// uri — derived at load time, never persisted. */
  uri: string;
  pose: PhysiquePose;
  note: string;
  weightKg: number | null;
}
export interface Profile { name: string; age: number; gender: string; heightCm: number; weightKg: number }
export interface Override { day: number; id: string }
export type GymSchedule = {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  days: number[];
};

export interface FmtHelper {
  unit: 'kg' | 'lbs';
  wlabel: string;
  step: number;
  w: (kg: number) => number;
  wStr: (kg: number) => string;
  /** Length unit follows the weight unit: metric → cm, imperial → in. */
  lunit: 'cm' | 'in';
  l: (cm: number) => number;
  /** Convert a length typed in the display unit back to cm for storage. */
  toCm: (v: number) => number;
}

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
import * as Crypto from 'expo-crypto';
export const uid = (): string => Crypto.randomUUID();
export const DAY_MS = 86400000;
export const LB = 2.20462;
export const CM_PER_IN = 2.54;
export const ROUTINE_COLORS = ['#FF5A2C', '#C6FF3A', '#5B8CFF', '#FF9F1C', '#19E0A0', '#C77DFF'];

export const PHYSIQUE_POSES: { key: PhysiquePose; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'side', label: 'Side' },
  { key: 'legs', label: 'Legs' },
  { key: 'other', label: 'Other' },
];
export const BODY_PARTS: { key: BodyPart; label: string; tip: string }[] = [
  { key: 'neck', label: 'Neck', tip: 'Wrap the tape just below the Adam\'s apple, keeping it level. Stand tall and look straight ahead.' },
  { key: 'shoulders', label: 'Shoulders', tip: 'Arms relaxed at your sides — go around the widest point of the shoulders, over the deltoids.' },
  { key: 'chest', label: 'Chest', tip: 'Under the armpits and across the nipples, tape level all the way round. Measure after a normal exhale.' },
  { key: 'biceps', label: 'Biceps', tip: 'Flex the arm at 90° and measure around the peak of the bicep. Use the same arm every time.' },
  { key: 'forearms', label: 'Forearms', tip: 'Arm straight, hand relaxed — measure the thickest part, just below the elbow.' },
  { key: 'waist', label: 'Waist', tip: 'Around the navel, standing relaxed. Don\'t suck in — measure after a normal exhale.' },
  { key: 'hips', label: 'Hips', tip: 'Feet together, measure around the widest part of the glutes, keeping the tape level.' },
  { key: 'thighs', label: 'Thighs', tip: 'Standing with weight on both legs, measure the thickest part of the upper thigh, just below the glutes.' },
  { key: 'calves', label: 'Calves', tip: 'Standing, weight spread evenly — measure around the widest part of the calf.' },
];

export function poseLabel(k: string): string {
  return PHYSIQUE_POSES.find(p => p.key === k)?.label ?? 'Photo';
}

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

export const SEED = {
  profile: { name: 'Alex', age: 28, gender: 'MALE', heightCm: 178, weightKg: 79.4 } as Profile,
};

export function makeFmt(unit: 'kg' | 'lbs'): FmtHelper {
  return {
    unit,
    wlabel: unit === 'kg' ? 'kg' : 'lbs',
    step: unit === 'kg' ? 2.5 : 5,
    w: (kg: number) => unit === 'kg' ? kg : Math.round(kg * LB),
    wStr: (kg: number) => (unit === 'kg' ? +kg.toFixed(1) : Math.round(kg * LB)) + '',
    lunit: unit === 'kg' ? 'cm' : 'in',
    l: (cm: number) => +(unit === 'kg' ? cm : cm / CM_PER_IN).toFixed(1),
    toCm: (v: number) => +(unit === 'kg' ? v : v * CM_PER_IN).toFixed(2),
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

/** Midnight (local) at the start of the current calendar week — Monday-based. */
export function startOfWeekMs(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7; // days since Monday (Sun=6 … Sat=5)
  d.setDate(d.getDate() - diff);
  return d.getTime();
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

// ── Lock-screen session widget ────────────────────────────────
// The native widget (iOS Live Activity / Android ongoing notification) keeps
// its own copy of the in-progress session so its buttons work while JS is not
// running. `w` is in the display unit, exactly as the session screen holds it.
export type WidgetSet = { reps: number; w: number; done: boolean };
export type WidgetExercise = { id: string; name: string; sets: WidgetSet[] };
export type WidgetSnapshot = {
  startedAt: number;
  lastActiveAt: number;
  routineName: string;
  unit: string;
  /** Bumped by every change made from the widget itself. */
  rev: number;
  cursorId: string | null;
  exercises: WidgetExercise[];
};
export type SessionFocus = { exId: string; set: number; field: 'reps' | 'kg' };

type SessionExerciseLike = { id: string; name: string; sets: { reps: unknown; w: unknown; done?: boolean }[] };

export function toWidgetExercises(exs: SessionExerciseLike[]): WidgetExercise[] {
  return exs.map(e => ({
    id: e.id,
    name: e.name,
    sets: e.sets.map(s => ({ reps: Number(s.reps) || 0, w: Number(s.w) || 0, done: !!s.done })),
  }));
}

/**
 * Fold sets ticked from the widget back into session exercises. The widget can
 * only mark sets done, so this never un-ticks anything. Returns the same array
 * when nothing changed so callers can skip a state update.
 */
export function mergeWidgetDone<E extends { id: string; sets: { done?: boolean }[] }>(exs: E[], snapshot: WidgetSnapshot): E[] {
  const byId = new Map(snapshot.exercises.map(e => [e.id, e]));
  let changed = false;
  const out = exs.map(e => {
    const w = byId.get(e.id);
    if (!w) return e;
    let touched = false;
    const sets = e.sets.map((s, i) => {
      if (s.done || !w.sets[i]?.done) return s;
      touched = true;
      return { ...s, done: true };
    });
    if (!touched) return e;
    changed = true;
    return { ...e, sets };
  });
  return changed ? out : exs;
}

/** The exercise whose sets differ between two versions of a session, if exactly one does. */
export function changedExerciseId(prev: SessionExerciseLike[], next: SessionExerciseLike[]): string | null {
  const before = new Map(prev.map(e => [e.id, JSON.stringify(e.sets)]));
  const changed = next.filter(e => before.has(e.id) && before.get(e.id) !== JSON.stringify(e.sets));
  return changed.length === 1 ? changed[0].id : null;
}

export const SESSION_LINK = 'fitloop://session';

/** Parses `fitloop://session[?ex=<id>&set=<n>&field=reps|kg]`. `null` = not a session link. */
export function parseSessionLink(url: string | null | undefined): { focus: SessionFocus | null } | null {
  if (!url || !url.startsWith(SESSION_LINK)) return null;
  const query = url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const [k, v] = pair.split('=');
    if (k) params[k] = decodeURIComponent(v ?? '');
  }
  const set = parseInt(params.set ?? '', 10);
  if (!params.ex || Number.isNaN(set)) return { focus: null };
  return { focus: { exId: params.ex, set, field: params.field === 'reps' ? 'reps' : 'kg' } };
}
