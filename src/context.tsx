import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { makeTheme, Theme } from './theme';
import {
  Profile, Routine, Session, Measurement, FmtHelper, Override,
  makeFmt, sessionVolume, uid, LB, DAY_MS,
} from './data';
import {
  initDb, seedIfEmpty,
  loadSettings, saveSettings, AppSettings,
  loadRoutines, saveRoutine as dbSaveRoutine, deleteRoutine as dbDeleteRoutine,
  saveSession as dbSaveSession, deleteSessionDb,
  loadRecentSessions, loadSessionPage, totalSessionCount,
  recentSessionCount, recentSessionDays,
  addMeasurementDb, loadMeasurements,
  loadStrengthSeries, loadAllExerciseNames,
  StrengthPoint,
} from './db';

export interface ToastConfig {
  icon?: string;
  msg: string;
  tone?: 'danger';
  action?: { label: string; fn: () => void };
}

export interface AppState {
  profile: Profile;
  routines: Routine[];
  todayDay: number;
  override: Override | null;
}

export interface AppContextValue {
  t: Theme;
  fmt: FmtHelper;
  state: AppState;
  /** Recent sessions kept in-memory (last ~20) for home screen. */
  recentHistory: Session[];
  /** Total number of sessions ever logged. */
  totalSessions: number;
  /** Week-count of sessions in the last 7 days. */
  weekCount: number;
  /** Days (0-6) that have a session in the last 7 days. */
  doneDays: Set<number>;
  /** Last measurement (if any) */
  lastMeasurement: Measurement | null;

  // Async data loaders for screens that need more
  loadMoreSessions: (limit: number, offset: number) => Promise<Session[]>;
  loadStrengthData: (exercise: string, cutoffMs: number) => Promise<StrengthPoint[]>;
  loadBodyData: (cutoffMs: number) => Promise<{ wSeries: any[]; bfSeries: any[] }>;
  loadExerciseNames: () => Promise<string[]>;

  nav: (tab: string) => void;
  startSession: (routine: Routine | null) => void;
  exitSession: () => void;
  saveSession: (data: any) => void;
  editRoutine: (r: Routine | null) => void;
  closeRoutineEdit: () => void;
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  openDetail: (s: Session | null) => void;
  deleteSession: (id: string) => void;
  addMeasurement: (wDisp: number, bf: number | null) => void;
  setUnit: (u: 'kg' | 'lbs') => void;
  setTheme: (name: string) => void;
  accent: string;
  pop: string;
  setAccent: (c: string) => void;
  setPop: (c: string) => void;
  setTodayDay: (d: number) => void;
  swapTodayRoutine: (id: string | null) => void;
  replayOnboarding: () => void;
  completeOnboarding: (p: Profile, rs: Routine[]) => void;
  clearData: () => void;
  updateProfile: (p: Profile) => void;
  toast: (cfg: ToastConfig | null) => void;

  // Overlay state
  onboarded: boolean;
  sessionOn: boolean;
  sessionRoutine: Routine | null;
  routineEdit: Routine | null | undefined;
  detail: Session | null;
  toastState: ToastConfig | null;
  activeTab: string;
  setActiveTab: (t: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
export const useApp = () => useContext(AppContext)!;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  // Settings / preferences
  const [profile, setProfile] = useState<Profile>({ name: 'Alex', age: 28, gender: 'MALE', heightCm: 178, weightKg: 79.4 });
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [unit, setUnitState] = useState<'kg' | 'lbs'>('kg');
  const [themeName, setThemeName] = useState('dark');
  const [onboarded, setOnboarded] = useState(false);
  const [todayDay, setTodayDay] = useState(new Date().getDay());
  const [accent, setAccent] = useState('#FF5A2C');
  const [pop, setPop] = useState('#C6FF3A');
  const [override, setOverride] = useState<Override | null>(null);

  // In-memory recent data
  const [recentHistory, setRecentHistory] = useState<Session[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [doneDays, setDoneDays] = useState<Set<number>>(new Set());
  const [lastMeasurement, setLastMeasurement] = useState<Measurement | null>(null);

  // UI / overlay state
  const [activeTab, setActiveTab] = useState('home');
  const [sessionOn, setSessionOn] = useState(false);
  const [sessionRoutine, setSessionRoutine] = useState<Routine | null>(null);
  const [routineEdit, setRoutineEdit] = useState<Routine | null | undefined>(undefined);
  const [detail, setDetail] = useState<Session | null>(null);
  const [toastState, setToastState] = useState<ToastConfig | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initialise DB and load data ───────────────────────────
  useEffect(() => {
    (async () => {
      await initDb();
      await seedIfEmpty();

      const s = await loadSettings();
      setProfile(s.profile);
      setUnitState(s.unit);
      setThemeName(s.theme);
      setOnboarded(s.onboarded);
      setTodayDay(s.todayDay);
      setAccent(s.accent);
      setPop(s.pop);
      setOverride(s.override);

      const rts = await loadRoutines();
      setRoutines(rts);

      await refreshRecentData();
      setLoaded(true);
    })();
  }, []);

  async function refreshRecentData() {
    const recent = await loadRecentSessions(20);
    setRecentHistory(recent);
    const total = await totalSessionCount();
    setTotalSessions(total);
    const wc = await recentSessionCount(7);
    setWeekCount(wc);
    const dd = await recentSessionDays(7);
    setDoneDays(dd);

    const measurements = await loadMeasurements(0);
    setLastMeasurement(measurements.length ? measurements[measurements.length - 1] : null);
  }

  // ── Theme ─────────────────────────────────────────────────
  const t = useMemo(() => makeTheme(themeName, accent, pop), [themeName, accent, pop]);
  const fmt = useMemo(() => makeFmt(unit), [unit]);

  // ── Toast ─────────────────────────────────────────────────
  const toast = (cfg: ToastConfig | null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState(cfg);
    if (cfg) toastTimer.current = setTimeout(() => setToastState(null), cfg.action ? 4200 : 2400);
  };

  // ── Settings persistence helpers ─────────────────────────
  const persistSetting = (patch: Partial<AppSettings>) => saveSettings(patch).catch(() => {});

  const ctx: AppContextValue = {
    t, fmt,
    state: { profile, routines, todayDay, override },
    recentHistory,
    totalSessions,
    weekCount,
    doneDays,
    lastMeasurement,

    // Async data loaders
    loadMoreSessions: (limit, offset) => loadSessionPage(limit, offset),
    loadStrengthData: (exercise, cutoffMs) => loadStrengthSeries(exercise, cutoffMs, unit),
    loadBodyData: async (cutoffMs) => {
      const measurements = await loadMeasurements(cutoffMs);
      const LBx = 2.20462;
      const wSeries = measurements.map(m => ({
        x: m.at, y: unit === 'kg' ? m.weightKg : Math.round(m.weightKg * LBx),
        label: new Date(m.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
      const bfSeries = measurements.filter(m => m.bodyFat != null).map(m => ({
        x: m.at, y: m.bodyFat!,
        label: new Date(m.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
      return { wSeries, bfSeries };
    },
    loadExerciseNames: () => loadAllExerciseNames(),

    nav: (k) => setActiveTab(k),

    startSession: (routine) => { setSessionRoutine(routine); setSessionOn(true); },
    exitSession: () => { setSessionOn(false); setSessionRoutine(null); },
    saveSession: async (data: any) => {
      const volume = sessionVolume(data.exercises);
      const sess: Session = { ...data, volume };
      await dbSaveSession(sess);
      setSessionOn(false); setSessionRoutine(null); setActiveTab('home');
      await refreshRecentData();
      toast({ icon: 'check', msg: 'Session saved!' });
    },

    editRoutine: (r) => setRoutineEdit(r === null ? null : r),
    closeRoutineEdit: () => setRoutineEdit(undefined),
    saveRoutine: async (r) => {
      await dbSaveRoutine(r);
      const updated = await loadRoutines();
      setRoutines(updated);
      setRoutineEdit(undefined);
      toast({ icon: 'check', msg: 'Routine saved' });
    },
    deleteRoutine: async (id) => {
      await dbDeleteRoutine(id);
      setRoutines(rs => rs.filter(x => x.id !== id));
      setRoutineEdit(undefined);
      toast({ icon: 'trash', tone: 'danger', msg: 'Routine deleted' });
    },

    openDetail: (s) => setDetail(s),
    deleteSession: async (id) => {
      await deleteSessionDb(id);
      setRecentHistory(h => h.filter(x => x.id !== id));
      setTotalSessions(n => n - 1);
      toast({ icon: 'trash', tone: 'danger', msg: 'Session deleted' });
    },

    addMeasurement: async (wDisp, bf) => {
      const kg = unit === 'kg' ? wDisp : +(wDisp / LB).toFixed(1);
      const m: Measurement = { id: uid(), at: Date.now(), weightKg: kg, bodyFat: bf };
      await addMeasurementDb(m);
      setLastMeasurement(m);
      toast({ icon: 'check', msg: 'Measurement logged' });
    },

    setUnit: (u) => { setUnitState(u); persistSetting({ unit: u }); },
    setTheme: (n) => { setThemeName(n); persistSetting({ theme: n }); },
    accent, pop,
    setAccent: (c) => { setAccent(c); persistSetting({ accent: c }); },
    setPop: (c) => { setPop(c); persistSetting({ pop: c }); },
    setTodayDay: (d) => { setTodayDay(d); persistSetting({ todayDay: d }); },
    swapTodayRoutine: (id) => {
      const ov = id ? { day: todayDay, id } : null;
      setOverride(ov); persistSetting({ override: ov });
    },

    replayOnboarding: () => { setOnboarded(false); persistSetting({ onboarded: false }); },
    completeOnboarding: async (p, rs) => {
      setProfile(p); persistSetting({ profile: p });
      for (const r of rs) {
        await dbSaveRoutine(r);
      }
      const updated = await loadRoutines();
      setRoutines(updated);
      setOnboarded(true); persistSetting({ onboarded: true });
      setActiveTab('home');
    },
    clearData: async () => {
      // Delete all sessions, routines, measurements
      const d = await import('./db').then(m => m);
      // Re-init with empty tables by deleting records
      const { initDb: _init } = await import('./db');
      const sqlite = await import('expo-sqlite');
      const database = await sqlite.openDatabaseAsync('fitloop.db');
      await database.withTransactionAsync(async () => {
        await database.runAsync('DELETE FROM exercise_sets');
        await database.runAsync('DELETE FROM session_exercises');
        await database.runAsync('DELETE FROM sessions');
        await database.runAsync('DELETE FROM routine_exercises');
        await database.runAsync('DELETE FROM routines');
        await database.runAsync('DELETE FROM measurements');
      });
      setRoutines([]); setRecentHistory([]); setTotalSessions(0); setWeekCount(0);
      setDoneDays(new Set()); setLastMeasurement(null);
      toast({ icon: 'trash', tone: 'danger', msg: 'All data cleared' });
      setActiveTab('home');
    },
    updateProfile: (p) => { setProfile(p); persistSetting({ profile: p }); toast({ icon: 'check', msg: 'Profile updated' }); },
    toast,

    onboarded, sessionOn, sessionRoutine, routineEdit, detail, toastState,
    activeTab, setActiveTab,
  };

  if (!loaded) return null;
  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}
