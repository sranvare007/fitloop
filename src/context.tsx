import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { makeTheme, Theme } from './theme';
import {
  Profile, Routine, Session, Measurement, FmtHelper, Override, GymSchedule,
  PhysiquePhoto, PhysiquePose,
  makeFmt, sessionVolume, uid, LB, DAY_MS,
} from './data';
import { persistPhoto, photoUri, deletePhotoFile } from './photos';
import {
  AuthUser, AuthResult, ApiError, setAuthToken,
  apiLogin, apiSignup, apiMe,
  apiSaveRoutine, apiDeleteRoutine, apiGetRoutines,
  apiSaveSession, apiDeleteSession, apiGetSessions,
  apiSaveMeasurement, apiGetMeasurements,
  apiGetSettings, apiSaveSettings,
} from './api';
import { scheduleGymNotifications, cancelGymNotifications } from './notifications';
import {
  initDb,
  loadSettings, saveSettings, AppSettings,
  loadRoutines, saveRoutine as dbSaveRoutine, deleteRoutine as dbDeleteRoutine,
  saveSession as dbSaveSession, deleteSessionDb,
  loadRecentSessions, loadSessionPage, totalSessionCount,
  thisWeekSessionCount, thisWeekSessionDays,
  addMeasurementDb, loadMeasurements,
  loadPhysiquePhotos, addPhysiquePhotoDb, deletePhysiquePhotoDb,
  loadStrengthSeries, loadAllExerciseNames,
  exportAllData, importAllData, FitLoopExport,
  saveInProgressSessionDb, loadInProgressSessionDb, clearInProgressSessionDb, InProgressSession,
  loadAllSetBests, SetBest,
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

  // Async data loaders for screens that need more
  loadMoreSessions: (limit: number, offset: number) => Promise<Session[]>;
  loadStrengthData: (exercise: string, cutoffMs: number) => Promise<StrengthPoint[]>;
  loadSetBests: (names: string[]) => Promise<Record<string, SetBest[]>>;
  loadBodyData: (cutoffMs: number) => Promise<{ wSeries: any[]; bfSeries: any[] }>;
  loadExerciseNames: () => Promise<string[]>;

  nav: (tab: string) => void;
  startSession: (routine: Routine | null) => void;
  exitSession: () => void;
  /** Close the session overlay but keep it in progress so it can be resumed. */
  minimizeSession: () => void;
  saveSession: (data: any) => void;
  resumeSession: () => void;
  updateInProgressSession: (exercises: any[]) => void;
  inProgressSession: InProgressSession | null;
  sessionResumeData: InProgressSession | null;
  editRoutine: (r: Routine | null) => void;
  closeRoutineEdit: () => void;
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  openDetail: (s: Session | null) => void;
  deleteSession: (id: string) => void;
  addMeasurement: (wDisp: number, bf: number | null) => void;
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
  importData: () => Promise<{ routines: number; sessions: number; measurements: number } | null>;
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

  // Auth / cloud sync
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
    updateInProgressSession: (exercises: any[]) => {
      const data: InProgressSession = {
        startedAt: sessionStartedAtRef.current,
        lastActiveAt: Date.now(),
        routineId: sessionRoutine?.id || null,
        routineName: sessionRoutine?.name || 'Free Workout',
        exercises,
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
      if (authUser) mirror(apiSaveSession(sess));
      toast({ icon: 'check', msg: 'Session saved!' });
    },
    inProgressSession, sessionResumeData,

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
      });
      for (const p of physiquePhotos) deletePhotoFile(p.file);
      setRoutines([]); setRecentHistory([]); setTotalSessions(0); setWeekCount(0);
      setDoneDays(new Set()); setLastMeasurement(null); setPhysiquePhotos([]);
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
