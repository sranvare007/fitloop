import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { makeTheme, Theme } from './theme';
import {
  Profile, Routine, Session, Measurement, FmtHelper, Override, GymSchedule,
  PhysiquePhoto, PhysiquePose, BodyLog, BodyPart,
  makeFmt, sessionVolume, uid, LB, DAY_MS, SEED_PB,
} from './data';
import { persistPhoto, photoUri, deletePhotoFile } from './photos';
import {
  AuthUser, AuthResult, ApiError, setAuthToken,
  apiLogin, apiSignup, apiMe,
  apiSaveRoutine, apiDeleteRoutine, apiGetRoutines,
  apiSaveSession, apiDeleteSession, apiGetSessions,
  apiSaveMeasurement, apiGetMeasurements,
  apiGetSettings, apiSaveSettings,
  apiWorkoutCalories,
} from './api';
import { scheduleGymNotifications, cancelGymNotifications } from './notifications';
import {
  initDb,
  loadSettings, saveSettings, AppSettings,
  loadRoutines, saveRoutine as dbSaveRoutine, deleteRoutine as dbDeleteRoutine,
  saveSession as dbSaveSession, deleteSessionDb, saveSessionCaloriesDb,
  countSessionsMissingCalories, loadSessionsMissingCalories,
  loadRecentSessions, loadSessionPage, totalSessionCount,
  thisWeekSessionCount, thisWeekSessionDays,
  addMeasurementDb, loadMeasurements,
  loadBodyLogs, saveBodyLogDb, deleteBodyLogDb,
  loadPhysiquePhotos, addPhysiquePhotoDb, deletePhysiquePhotoDb,
  loadStrengthSeries, loadAllExerciseNames,
  exportAllData, importAllData, FitLoopExport,
  saveInProgressSessionDb, loadInProgressSessionDb, clearInProgressSessionDb, InProgressSession,
  loadAllSetBests, SetBest,
  loadPersonalRecords, savePersonalRecordsDb,
  StrengthPoint,
} from './db';
import { File, Paths } from 'expo-file-system';
import { StorageAccessFramework, writeAsStringAsync as safWrite } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { storage, KEYS } from './storage';

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
  /** All physique progress photos, newest-first. */
  physiquePhotos: PhysiquePhoto[];
  /** All body-measurement logs, oldest-first. Values are in cm. */
  bodyLogs: BodyLog[];

  // Async data loaders for screens that need more
  loadMoreSessions: (limit: number, offset: number) => Promise<Session[]>;
  loadStrengthData: (exercise: string, cutoffMs: number) => Promise<StrengthPoint[]>;
  loadSetBests: (names: string[]) => Promise<Record<string, SetBest[]>>;
  loadBodyData: (cutoffMs: number) => Promise<{ wSeries: any[]; bfSeries: any[] }>;
  loadExerciseNames: () => Promise<string[]>;

  /** User-set personal-record sets per exercise (position → best kg × reps), overriding history-derived bests. */
  personalRecords: Record<string, SetBest[]>;
  /** Resolved headline PB `[kg, reps]` (heaviest set) for an exercise — user-set value over the seeded default. */
  pbFor: (name: string) => [number, number] | undefined;
  /** Replace the personal-record sets for an exercise. Each `w` is in the current display unit; an empty list clears them. */
  savePR: (name: string, sets: { reps: number; w: number }[]) => Promise<void>;

  /**
   * Ask the backend to estimate calories burnt for a saved session, persist the
   * result and return the updated session. Returns null when it could not run
   * (signed out, offline, or the estimator rejected the workout).
   */
  estimateCalories: (s: Session) => Promise<Session | null>;
  /** Id of the session currently being estimated, if any. */
  caloriesPending: string | null;
  /** Progress of the backfill over pre-existing history, or null when idle. */
  caloriesBackfill: { done: number; total: number } | null;
  /** Re-run the backfill over any sessions still missing an estimate. */
  backfillCalories: () => Promise<void>;
  /** How many saved sessions still have no calorie estimate. */
  countMissingCalories: () => Promise<number>;

  nav: (tab: string) => void;
  startSession: (routine: Routine | null) => void;
  exitSession: () => void;
  /** Close the session overlay but keep it in progress so it can be resumed. */
  minimizeSession: () => void;
  saveSession: (data: any) => void;
  resumeSession: () => void;
  updateInProgressSession: (exercises: any[], openIds?: string[]) => void;
  inProgressSession: InProgressSession | null;
  sessionResumeData: InProgressSession | null;
  editRoutine: (r: Routine | null) => void;
  closeRoutineEdit: () => void;
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  openDetail: (s: Session | null) => void;
  deleteSession: (id: string) => void;
  addMeasurement: (wDisp: number, bf: number | null) => void;
  /**
   * Create (no `id`) or overwrite a body-measurement log. `values` are in the
   * current display length unit; blank parts are simply omitted.
   */
  saveBodyLog: (entry: { id?: string; at?: number; values: Partial<Record<BodyPart, number>> }) => Promise<void>;
  deleteBodyLog: (id: string) => Promise<void>;
  addPhysiquePhotos: (shots: { uri: string; pose: PhysiquePose; weightKg?: number | null }[], note?: string) => Promise<void>;
  deletePhysiquePhoto: (id: string) => Promise<void>;
  physiqueCameraOn: boolean;
  openPhysiqueCamera: () => void;
  closePhysiqueCamera: () => void;
  setUnit: (u: 'kg' | 'lbs') => void;
  themeName: string;
  setTheme: (name: string) => void;
  accent: string;
  pop: string;
  setAccent: (c: string) => void;
  setPop: (c: string) => void;
  setTodayDay: (d: number) => void;
  swapTodayRoutine: (id: string | null) => void;
  gymSchedule: GymSchedule | null;
  setGymSchedule: (s: GymSchedule | null) => Promise<void>;
  replayOnboarding: () => void;
  completeOnboarding: (p: Profile, rs: Routine[], gymSched?: GymSchedule | null) => void;
  clearData: () => void;
  updateProfile: (p: Profile) => void;
  exportData: () => Promise<void>;
  importData: () => Promise<{ routines: number; sessions: number; measurements: number; bodyLogs: number } | null>;
  toast: (cfg: ToastConfig | null) => void;

  // Auth / cloud sync
  authUser: AuthUser | null;
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
  syncNow: () => Promise<void>;
  syncing: boolean;

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

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  // Settings / preferences
  const [profile, setProfile] = useState<Profile>({ name: 'Alex', age: 28, gender: 'MALE', heightCm: 178, weightKg: 79.4 });
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [unit, setUnitState] = useState<'kg' | 'lbs'>('kg');
  const [themeName, setThemeName] = useState('dark');
  const [onboarded, setOnboarded] = useState(() => storage.getBoolean(KEYS.ONBOARDED) ?? false);
  const [todayDay, setTodayDay] = useState(new Date().getDay());
  const [accent, setAccent] = useState('#FF5A2C');
  const [pop, setPop] = useState('#C6FF3A');
  const [override, setOverride] = useState<Override | null>(null);
  const [gymSchedule, setGymScheduleState] = useState<GymSchedule | null>(null);

  // In-memory recent data
  const [recentHistory, setRecentHistory] = useState<Session[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [doneDays, setDoneDays] = useState<Set<number>>(new Set());
  const [lastMeasurement, setLastMeasurement] = useState<Measurement | null>(null);
  const [physiquePhotos, setPhysiquePhotos] = useState<PhysiquePhoto[]>([]);
  const [bodyLogs, setBodyLogs] = useState<BodyLog[]>([]);
  const [personalRecords, setPersonalRecords] = useState<Record<string, SetBest[]>>({});

  // Auth / cloud sync
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [caloriesPending, setCaloriesPending] = useState<string | null>(null);
  const [backfill, setBackfill] = useState<{ done: number; total: number } | null>(null);
  /** Sessions this run could not estimate — skipped so the pass can terminate. */
  const failedBackfillIds = useRef<Set<string>>(new Set());

  // UI / overlay state
  const [activeTab, setActiveTab] = useState('home');
  const [physiqueCameraOn, setPhysiqueCameraOn] = useState(false);
  const [sessionOn, setSessionOn] = useState(false);
  const [sessionRoutine, setSessionRoutine] = useState<Routine | null>(null);
  const [inProgressSession, setInProgressSession] = useState<InProgressSession | null>(null);
  const [sessionResumeData, setSessionResumeData] = useState<InProgressSession | null>(null);
  const sessionStartedAtRef = useRef(0);
  const [routineEdit, setRoutineEdit] = useState<Routine | null | undefined>(undefined);
  const [detail, setDetail] = useState<Session | null>(null);
  const [toastState, setToastState] = useState<ToastConfig | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initialise DB and load data ───────────────────────────
  useEffect(() => {
    (async () => {
      await initDb();

      const s = await loadSettings();
      setProfile(s.profile);
      setUnitState(s.unit);
      setThemeName(s.theme);
      setTodayDay(s.todayDay);
      setAccent(s.accent);
      setPop(s.pop);
      setOverride(s.override);
      setGymScheduleState(s.gymSchedule);

      const rts = await loadRoutines();
      setRoutines(rts);

      setPersonalRecords(await loadPersonalRecords());

      const ips = await loadInProgressSessionDb();
      setInProgressSession(ips);

      if (ips) {
        sessionStartedAtRef.current = ips.startedAt;
        const routine = ips.routineId ? rts.find(r => r.id === ips.routineId) ?? null : null;
        setSessionRoutine(routine);
        setSessionResumeData(ips);
        setSessionOn(true);
      }

      // Restore a previous session and verify the token in the background.
      const token = storage.getString(KEYS.AUTH_TOKEN) ?? null;
      const userJson = storage.getString(KEYS.AUTH_USER);
      if (token && userJson) {
        setAuthToken(token);
        try { setAuthUser(JSON.parse(userJson) as AuthUser); } catch { /* ignore corrupt cache */ }
        apiMe()
          .then(u => { setAuthUser(u); storage.set(KEYS.AUTH_USER, JSON.stringify(u)); })
          .catch(err => { if (err instanceof ApiError && err.status === 401) signOutLocal(); });
      }

      await refreshRecentData();
      setLoaded(true);
    })();
  }, []);

  async function refreshRecentData() {
    const recent = await loadRecentSessions(20);
    setRecentHistory(recent);
    const total = await totalSessionCount();
    setTotalSessions(total);
    const wc = await thisWeekSessionCount();
    setWeekCount(wc);
    const dd = await thisWeekSessionDays();
    setDoneDays(dd);

    const measurements = await loadMeasurements(0);
    setLastMeasurement(measurements.length ? measurements[measurements.length - 1] : null);

    setPhysiquePhotos(await loadPhysiquePhotos(0));
    setBodyLogs(await loadBodyLogs(0));
  }

  // ── Auth / cloud sync ─────────────────────────────────────
  // Fire-and-forget a mirror write; local data is already saved so failures
  // are non-fatal and reconciled by the next "Sync now".
  const mirror = (p: Promise<unknown>) => { p.catch(() => {}); };

  function applyAuth(res: AuthResult) {
    setAuthToken(res.token);
    storage.set(KEYS.AUTH_TOKEN, res.token);
    storage.set(KEYS.AUTH_USER, JSON.stringify(res.user));
    setAuthUser(res.user);
  }

  function signOutLocal() {
    setAuthToken(null);
    storage.remove(KEYS.AUTH_TOKEN);
    storage.remove(KEYS.AUTH_USER);
    setAuthUser(null);
  }

  function applyRemoteSettings(rs: Record<string, unknown>) {
    const patch: Partial<AppSettings> = {};
    if (rs.profile && typeof rs.profile === 'object') { setProfile(rs.profile as Profile); patch.profile = rs.profile as Profile; }
    if (rs.unit === 'kg' || rs.unit === 'lbs') { setUnitState(rs.unit); patch.unit = rs.unit; }
    if (typeof rs.theme === 'string') { setThemeName(rs.theme); patch.theme = rs.theme; }
    if (typeof rs.accent === 'string') { setAccent(rs.accent); patch.accent = rs.accent; }
    if (typeof rs.pop === 'string') { setPop(rs.pop); patch.pop = rs.pop; }
    if (Object.keys(patch).length) saveSettings(patch).catch(() => {});
  }

  async function pullAllSessions(): Promise<Session[]> {
    const all: Session[] = [];
    let offset = 0;
    for (;;) {
      const page = await apiGetSessions(100, offset);
      all.push(...page.sessions);
      offset += page.sessions.length;
      if (page.sessions.length === 0 || all.length >= page.total) break;
    }
    return all;
  }

  // Push everything local, then pull everything remote and merge (by id) into
  // the local DB. Pre-release, so no elaborate conflict resolution is needed.
  async function fullSync() {
    const local = await exportAllData(profile);
    for (const r of local.routines) await apiSaveRoutine(r);
    for (const s of local.sessions) await apiSaveSession(s);
    for (const m of local.measurements) await apiSaveMeasurement(m);
    await apiSaveSettings({ profile, unit, theme: themeName, accent, pop });

    const [remoteRoutines, remoteMeasurements] = await Promise.all([apiGetRoutines(), apiGetMeasurements(0)]);
    const remoteSessions = await pullAllSessions();
    await importAllData({
      version: 1, exportedAt: Date.now(), profile,
      routines: remoteRoutines, sessions: remoteSessions, measurements: remoteMeasurements,
    });
    setRoutines(await loadRoutines());
    await refreshRecentData();

    applyRemoteSettings(await apiGetSettings());
  }

  // ── Calories ──────────────────────────────────────────────
  // The estimate is an online extra on top of an already-saved session: it runs
  // after the local write, and a failure never blocks logging a workout.
  async function runCalorieEstimate(sess: Session): Promise<Session | null> {
    // The endpoint caps the payload at 50 exercises and 120-character names.
    const posted = sess.exercises.filter(e => e.sets.length > 0).slice(0, 50);
    if (!posted.length) return null;

    const inRange = (n: number, lo: number, hi: number) => (n >= lo && n <= hi ? n : null);
    const durationSec = Math.min(86400, Math.max(1, Math.round(sess.durationSec)));
    setCaloriesPending(sess.id);
    try {
      const est = await apiWorkoutCalories({
        sessionId: sess.id,
        routineName: sess.routineName.slice(0, 120),
        durationSec,
        exercises: posted.map(e => ({
          name: e.name.slice(0, 120),
          sets: e.sets.map(s => ({ reps: s.reps, kg: s.kg })),
        })),
        profile: {
          weightKg: profile.weightKg,
          heightCm: inRange(profile.heightCm, 50, 300),
          age: inRange(profile.age, 5, 120),
          gender: profile.gender || null,
        },
      });

      // The backend answers one entry per posted exercise, in the posted order.
      const byId = new Map<string, number>();
      est.exercises.forEach((e, i) => {
        const local = posted[i];
        if (local) byId.set(local.id, e.calories);
      });

      await saveSessionCaloriesDb(
        sess.id, est.totalCalories, est.summary,
        [...byId].map(([id, calories]) => ({ id, calories })),
      );

      const updated: Session = {
        ...sess,
        calories: est.totalCalories,
        caloriesSummary: est.summary,
        exercises: sess.exercises.map(e => (byId.has(e.id) ? { ...e, calories: byId.get(e.id)! } : e)),
      };
      setRecentHistory(h => h.map(s => (s.id === updated.id ? updated : s)));
      setDetail(d => (d && d.id === updated.id ? updated : d));
      return updated;
    } finally {
      setCaloriesPending(null);
    }
  }

  /** Body weight is the one input the MET formula cannot work without. */
  const canEstimateCalories = () => profile.weightKg >= 20 && profile.weightKg <= 500;

  // ── Backfill for pre-existing history ─────────────────────
  // Sessions logged before the calorie estimator existed have no estimate. Walk
  // them newest-first, pacing well under the endpoint's 20-req/min LLM limit.
  // User-triggered from Settings; a session that gets an estimate drops out of
  // the query, so an interrupted run simply resumes where it left off.
  const BACKFILL_DELAY_MS = 4500;
  const BACKFILL_BATCH = 25;
  const backfillRunning = useRef(false);

  async function runCaloriesBackfill(): Promise<void> {
    if (backfillRunning.current) return;
    backfillRunning.current = true;
    let attempted = 0;
    let succeeded = 0;
    try {
      const total = await countSessionsMissingCalories();
      if (!total) return;
      setBackfill({ done: 0, total });

      for (;;) {
        // Skipped sessions stay in the query and, being newer than anything not
        // yet reached, sit at its head — so offsetting past them lands on the
        // next unattempted session.
        const batch = await loadSessionsMissingCalories(BACKFILL_BATCH, failedBackfillIds.current.size);
        const pending = batch.filter(s => !failedBackfillIds.current.has(s.id));
        if (!pending.length) break;

        for (const sess of pending) {
          if (attempted > 0) await sleep(BACKFILL_DELAY_MS);
          try {
            const updated = await runCalorieEstimate(sess);
            if (updated) succeeded++; else failedBackfillIds.current.add(sess.id);
          } catch (err) {
            // Rate limit, server trouble or no connection: stop and resume later.
            // A 4xx means this session will never estimate — skip it and move on.
            const status = err instanceof ApiError ? err.status : 0;
            if (status === 0 || status === 429 || status >= 500) return;
            failedBackfillIds.current.add(sess.id);
          }
          attempted++;
          setBackfill({ done: attempted, total });
        }
      }
    } finally {
      backfillRunning.current = false;
      setBackfill(null);
      if (succeeded) {
        await refreshRecentData();
        toast({ icon: 'flame', msg: `Calories estimated for ${succeeded} past ${succeeded === 1 ? 'workout' : 'workouts'}` });
      }
    }
  }

  // ── Theme ─────────────────────────────────────────────────
  const systemScheme = useColorScheme();
  const resolvedThemeName = themeName === 'system' ? (systemScheme ?? 'dark') : themeName;
  const t = useMemo(() => makeTheme(resolvedThemeName, accent, pop), [resolvedThemeName, accent, pop]);
  const fmt = useMemo(() => makeFmt(unit), [unit]);

  // ── Toast ─────────────────────────────────────────────────
  const toast = (cfg: ToastConfig | null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState(cfg);
    if (cfg) toastTimer.current = setTimeout(() => setToastState(null), cfg.action ? 4200 : 2400);
  };

  // ── Settings persistence helpers ─────────────────────────
  const persistSetting = (patch: Partial<AppSettings>) => {
    saveSettings(patch).catch(() => {});
    if (authUser) {
      const syncable: Record<string, unknown> = {};
      for (const k of ['profile', 'unit', 'theme', 'accent', 'pop'] as const) {
        if (k in patch) syncable[k] = patch[k];
      }
      if (Object.keys(syncable).length) mirror(apiSaveSettings(syncable));
    }
  };

  const ctx: AppContextValue = {
    t, fmt,
    state: { profile, routines, todayDay, override },
    recentHistory,
    totalSessions,
    weekCount,
    doneDays,
    lastMeasurement,
    physiquePhotos,
    bodyLogs,

    // Async data loaders
    loadMoreSessions: (limit, offset) => loadSessionPage(limit, offset),
    loadStrengthData: (exercise, cutoffMs) => loadStrengthSeries(exercise, cutoffMs, unit),
    loadSetBests: (names) => loadAllSetBests(names),
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

    personalRecords,
    pbFor: (name) => {
      const sets = personalRecords[name];
      if (sets && sets.length) {
        const top = sets.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a));
        return [top.kg, top.reps];
      }
      return SEED_PB[name];
    },
    savePR: async (name, sets) => {
      const conv = sets.map(s => ({
        reps: Math.max(0, Math.round(s.reps)),
        kg: unit === 'kg' ? s.w : +(s.w / LB).toFixed(1),
      }));
      await savePersonalRecordsDb(name, conv);
      setPersonalRecords(prev => ({
        ...prev,
        [name]: conv.map((s, i) => ({ position: i, reps: s.reps, kg: s.kg })),
      }));
      toast({ icon: 'star', msg: `PR updated for ${name}` });
    },

    nav: (k) => setActiveTab(k),

    startSession: (routine) => {
      const now = Date.now();
      sessionStartedAtRef.current = now;
      setSessionRoutine(routine);
      setSessionResumeData(null);
      setSessionOn(true);
      const ips: InProgressSession = { startedAt: now, lastActiveAt: now, routineId: routine?.id || null, routineName: routine?.name || 'Free Workout', exercises: [] };
      setInProgressSession(ips);
      saveInProgressSessionDb(ips).catch(() => {});
    },
    resumeSession: () => {
      if (!inProgressSession) return;
      sessionStartedAtRef.current = inProgressSession.startedAt;
      const routine = inProgressSession.routineId ? routines.find(r => r.id === inProgressSession.routineId) ?? null : null;
      setSessionRoutine(routine);
      setSessionResumeData(inProgressSession);
      setSessionOn(true);
    },
    updateInProgressSession: (exercises: any[], openIds?: string[]) => {
      const data: InProgressSession = {
        startedAt: sessionStartedAtRef.current,
        lastActiveAt: Date.now(),
        routineId: sessionRoutine?.id || null,
        routineName: sessionRoutine?.name || 'Free Workout',
        exercises,
        openIds,
      };
      setInProgressSession(data);
      saveInProgressSessionDb(data).catch(() => {});
    },
    exitSession: () => {
      setSessionOn(false); setSessionRoutine(null); setSessionResumeData(null);
      setInProgressSession(null); clearInProgressSessionDb().catch(() => {});
    },
    minimizeSession: () => { setSessionOn(false); setSessionResumeData(null); },
    saveSession: async (data: any) => {
      const volume = sessionVolume(data.exercises);
      const sess: Session = { ...data, volume };
      await dbSaveSession(sess);
      setSessionOn(false); setSessionRoutine(null); setSessionResumeData(null); setActiveTab('home');
      setInProgressSession(null); clearInProgressSessionDb().catch(() => {});
      await refreshRecentData();
      toast({ icon: 'check', msg: 'Session saved!' });
      if (authUser) {
        mirror(apiSaveSession(sess));
        if (canEstimateCalories()) {
          runCalorieEstimate(sess)
            .then(updated => {
              if (updated?.calories) toast({ icon: 'flame', msg: `${updated.calories} kcal burnt` });
            })
            .catch(() => {});
        }
      }
    },
    inProgressSession, sessionResumeData,

    estimateCalories: async (s) => {
      if (!authUser) {
        toast({ icon: 'cloud', msg: 'Sign in to estimate calories' });
        return null;
      }
      if (!canEstimateCalories()) {
        toast({ icon: 'info', tone: 'danger', msg: 'Set your body weight in Settings first' });
        return null;
      }
      try {
        const updated = await runCalorieEstimate(s);
        if (!updated) {
          toast({ icon: 'info', tone: 'danger', msg: 'No logged sets to estimate from' });
          return null;
        }
        toast({ icon: 'flame', msg: `${updated.calories} kcal burnt` });
        return updated;
      } catch (err) {
        toast({ icon: 'info', tone: 'danger', msg: err instanceof ApiError ? err.message : 'Could not estimate calories' });
        return null;
      }
    },
    caloriesPending,
    caloriesBackfill: backfill,
    countMissingCalories: () => countSessionsMissingCalories(),
    backfillCalories: async () => {
      if (backfillRunning.current) return;
      if (!authUser) { toast({ icon: 'cloud', msg: 'Sign in to estimate calories' }); return; }
      if (!canEstimateCalories()) {
        toast({ icon: 'info', tone: 'danger', msg: 'Set your body weight in Settings first' });
        return;
      }
      // An explicit retry, including of sessions that failed on an earlier run.
      failedBackfillIds.current.clear();
      await runCaloriesBackfill();
    },

    editRoutine: (r) => setRoutineEdit(r === null ? null : r),
    closeRoutineEdit: () => setRoutineEdit(undefined),
    saveRoutine: async (r) => {
      await dbSaveRoutine(r);
      const updated = await loadRoutines();
      setRoutines(updated);
      setRoutineEdit(undefined);
      if (authUser) mirror(apiSaveRoutine(r));
      toast({ icon: 'check', msg: 'Routine saved' });
    },
    deleteRoutine: async (id) => {
      await dbDeleteRoutine(id);
      setRoutines(rs => rs.filter(x => x.id !== id));
      setRoutineEdit(undefined);
      if (authUser) mirror(apiDeleteRoutine(id));
      toast({ icon: 'trash', tone: 'danger', msg: 'Routine deleted' });
    },

    openDetail: (s) => setDetail(s),
    deleteSession: async (id) => {
      await deleteSessionDb(id);
      setRecentHistory(h => h.filter(x => x.id !== id));
      setTotalSessions(n => n - 1);
      if (authUser) mirror(apiDeleteSession(id));
      toast({ icon: 'trash', tone: 'danger', msg: 'Session deleted' });
    },

    addMeasurement: async (wDisp, bf) => {
      const kg = unit === 'kg' ? wDisp : +(wDisp / LB).toFixed(1);
      const m: Measurement = { id: uid(), at: Date.now(), weightKg: kg, bodyFat: bf };
      await addMeasurementDb(m);
      setLastMeasurement(m);
      if (authUser) mirror(apiSaveMeasurement(m));
      toast({ icon: 'check', msg: 'Measurement logged' });
    },

    saveBodyLog: async ({ id, at, values }) => {
      const cmValues: Partial<Record<BodyPart, number>> = {};
      for (const [part, v] of Object.entries(values) as [BodyPart, number | undefined][]) {
        if (v != null && v > 0) cmValues[part] = fmt.toCm(v);
      }
      if (!Object.keys(cmValues).length) return;
      const log: BodyLog = { id: id ?? uid(), at: at ?? Date.now(), values: cmValues };
      await saveBodyLogDb(log);
      setBodyLogs(prev => [...prev.filter(l => l.id !== log.id), log].sort((a, b) => a.at - b.at));
      toast({ icon: 'check', msg: id ? 'Measurements updated' : 'Measurements logged' });
    },
    deleteBodyLog: async (id) => {
      await deleteBodyLogDb(id);
      setBodyLogs(prev => prev.filter(l => l.id !== id));
      toast({ icon: 'trash', tone: 'danger', msg: 'Measurements deleted' });
    },

    addPhysiquePhotos: async (shots, note = '') => {
      if (!shots.length) return;
      const at = Date.now();
      for (const s of shots) {
        const id = uid();
        const file = persistPhoto(s.uri, id);
        await addPhysiquePhotoDb({ id, at, file, uri: photoUri(file), pose: s.pose, note, weightKg: s.weightKg ?? null });
      }
      setPhysiquePhotos(await loadPhysiquePhotos(0));
      setPhysiqueCameraOn(false);
      toast({ icon: 'check', msg: shots.length > 1 ? `${shots.length} photos saved` : 'Photo saved' });
    },
    deletePhysiquePhoto: async (id) => {
      const photo = physiquePhotos.find(p => p.id === id);
      await deletePhysiquePhotoDb(id);
      if (photo) deletePhotoFile(photo.file);
      setPhysiquePhotos(ps => ps.filter(p => p.id !== id));
      toast({ icon: 'trash', tone: 'danger', msg: 'Photo deleted' });
    },
    physiqueCameraOn,
    openPhysiqueCamera: () => setPhysiqueCameraOn(true),
    closePhysiqueCamera: () => setPhysiqueCameraOn(false),

    setUnit: (u) => { setUnitState(u); persistSetting({ unit: u }); },
    themeName,
    setTheme: (n) => { setThemeName(n); persistSetting({ theme: n }); },
    accent, pop,
    setAccent: (c) => { setAccent(c); persistSetting({ accent: c }); },
    setPop: (c) => { setPop(c); persistSetting({ pop: c }); },
    setTodayDay: (d) => { setTodayDay(d); persistSetting({ todayDay: d }); },
    swapTodayRoutine: (id) => {
      const ov = id ? { day: todayDay, id } : null;
      setOverride(ov); persistSetting({ override: ov });
    },

    gymSchedule,
    setGymSchedule: async (s) => {
      setGymScheduleState(s);
      await persistSetting({ gymSchedule: s });
      if (s && s.days.length) {
        await scheduleGymNotifications(s);
      } else {
        await cancelGymNotifications();
      }
    },

    replayOnboarding: () => { storage.set(KEYS.ONBOARDED, false); setOnboarded(false); },
    completeOnboarding: async (p, rs, gymSched) => {
      setProfile(p);
      await saveSettings({ profile: p });
      for (const r of rs) {
        await dbSaveRoutine(r);
      }
      const updated = await loadRoutines();
      setRoutines(updated);
      if (gymSched) {
        setGymScheduleState(gymSched);
        await saveSettings({ gymSchedule: gymSched });
        await scheduleGymNotifications(gymSched).catch(() => {});
      }
      storage.set(KEYS.ONBOARDED, true);
      setOnboarded(true);
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
        await database.runAsync('DELETE FROM physique_photos');
        await database.runAsync('DELETE FROM personal_records');
        await database.runAsync('DELETE FROM body_log_values');
        await database.runAsync('DELETE FROM body_logs');
      });
      for (const p of physiquePhotos) deletePhotoFile(p.file);
      setRoutines([]); setRecentHistory([]); setTotalSessions(0); setWeekCount(0);
      setDoneDays(new Set()); setLastMeasurement(null); setPhysiquePhotos([]); setPersonalRecords({}); setBodyLogs([]);
      toast({ icon: 'trash', tone: 'danger', msg: 'All data cleared' });
      setActiveTab('home');
    },
    updateProfile: (p) => { setProfile(p); persistSetting({ profile: p }); toast({ icon: 'check', msg: 'Profile updated' }); },

    exportData: async () => {
      try {
        const data = await exportAllData(profile);
        const json = JSON.stringify(data, null, 2);
        const date = new Date().toISOString().slice(0, 10);
        const filename = `fitloop-backup-${date}`;

        if (Platform.OS === 'android') {
          // null opens the folder picker at the device root — user can choose any accessible folder
          const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync(null);
          if (perm.granted) {
            // Find or create the Fitloop subfolder inside the chosen folder
            const entries = await StorageAccessFramework.readDirectoryAsync(perm.directoryUri);
            let fitloopDirUri = entries.find(
              u => decodeURIComponent(u).split('/').pop() === 'Fitloop'
            );
            if (!fitloopDirUri) {
              fitloopDirUri = await StorageAccessFramework.makeDirectoryAsync(
                perm.directoryUri, 'Fitloop'
              );
            }
            const fileUri = await StorageAccessFramework.createFileAsync(
              fitloopDirUri, filename, 'application/json'
            );
            await safWrite(fileUri, json);
            toast({ icon: 'check', msg: 'Saved to Fitloop folder' });
            return;
          }
          // user cancelled picker — fall through to share sheet
        }

        // iOS + Android fallback when picker is cancelled
        const file = new File(Paths.document, `${filename}.json`);
        file.write(json);
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save FitLoop Backup' });
        toast({ icon: 'check', msg: 'Backup exported' });
      } catch {
        toast({ icon: 'info', msg: 'Export failed', tone: 'danger' });
      }
    },

    importData: async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.length) return null;
        const uri = result.assets[0].uri;
        const json = await new File(uri).text();
        const data: FitLoopExport = JSON.parse(json);
        if (data.version !== 1 || !Array.isArray(data.routines) || !Array.isArray(data.sessions) || !Array.isArray(data.measurements)) {
          toast({ icon: 'info', msg: 'Invalid backup file', tone: 'danger' });
          return null;
        }
        const counts = await importAllData(data);
        const updated = await loadRoutines();
        setRoutines(updated);
        await refreshRecentData();
        return counts;
      } catch {
        toast({ icon: 'info', msg: 'Import failed', tone: 'danger' });
        return null;
      }
    },

    toast,

    authUser, authOpen, syncing,
    openAuth: () => setAuthOpen(true),
    closeAuth: () => setAuthOpen(false),
    signIn: async (email, password) => {
      const res = await apiLogin(email.trim(), password);
      applyAuth(res);
      setAuthOpen(false);
      toast({ icon: 'check', msg: `Welcome back, ${res.user.name || res.user.email}` });
      setSyncing(true);
      fullSync().catch(() => {}).finally(() => setSyncing(false));
    },
    signUp: async (email, password, name) => {
      const res = await apiSignup(email.trim(), password, name.trim());
      applyAuth(res);
      setAuthOpen(false);
      toast({ icon: 'check', msg: 'Account created — syncing your data' });
      setSyncing(true);
      fullSync().catch(() => {}).finally(() => setSyncing(false));
    },
    signOut: () => {
      signOutLocal();
      toast({ icon: 'info', msg: 'Signed out — your data stays on this device' });
    },
    syncNow: async () => {
      if (!authUser || syncing) return;
      setSyncing(true);
      try {
        await fullSync();
        toast({ icon: 'check', msg: 'Synced with cloud' });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          signOutLocal();
          toast({ icon: 'info', tone: 'danger', msg: 'Session expired — please sign in again' });
        } else {
          toast({ icon: 'info', tone: 'danger', msg: 'Sync failed — try again' });
        }
      } finally {
        setSyncing(false);
      }
    },

    onboarded, sessionOn, sessionRoutine, routineEdit, detail, toastState,
    activeTab, setActiveTab,
  };

  if (!loaded) return null;
  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}
