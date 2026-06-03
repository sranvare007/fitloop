/**
 * SQLite database module for FitLoop.
 * Schema:
 *   settings          – key/value preferences
 *   routines          – workout plans
 *   routine_exercises – ordered exercise names per routine
 *   sessions          – completed workout sessions
 *   session_exercises – exercises logged in a session
 *   exercise_sets     – individual sets (reps × kg)
 *   measurements      – body weight + body fat entries
 */
import * as SQLite from 'expo-sqlite';
import {
  Routine, Session, SessionExercise, Measurement, Profile,
  FmtHelper, Override, SEED, SEED_PB, uid, sessionVolume,
} from './data';

export type SessionRow = {
  id: string; routine_id: string | null; routine_name: string;
  started_at: number; ended_at: number; duration_sec: number;
  notes: string; volume: number;
};

let _db: SQLite.SQLiteDatabase | null = null;

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('fitloop.db');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  return _db;
}

// ── Schema ────────────────────────────────────────────────────
export async function initDb(): Promise<void> {
  const d = await db();
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routines (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#FF5A2C',
      days       TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id         TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      position   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id           TEXT PRIMARY KEY,
      routine_id   TEXT,
      routine_name TEXT NOT NULL,
      started_at   INTEGER NOT NULL,
      ended_at     INTEGER NOT NULL,
      duration_sec INTEGER NOT NULL,
      notes        TEXT NOT NULL DEFAULT '',
      volume       REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);

    CREATE TABLE IF NOT EXISTS session_exercises (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      position   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id                  TEXT PRIMARY KEY,
      session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
      reps                INTEGER NOT NULL,
      kg                  REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id        TEXT PRIMARY KEY,
      at        INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      body_fat  REAL
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_at ON measurements(at DESC);
  `);
}

// ── Settings ─────────────────────────────────────────────────
async function getSetting(key: string, fallback: string): Promise<string> {
  const d = await db();
  const row = await d.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}
async function setSetting(key: string, value: string): Promise<void> {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export interface AppSettings {
  profile: Profile;
  unit: 'kg' | 'lbs';
  theme: string;
  onboarded: boolean;
  todayDay: number;
  accent: string;
  pop: string;
  override: Override | null;
}

export async function loadSettings(): Promise<AppSettings> {
  return {
    profile: JSON.parse(await getSetting('profile', JSON.stringify(SEED.profile))),
    unit: (await getSetting('unit', 'kg')) as 'kg' | 'lbs',
    theme: await getSetting('theme', 'dark'),
    onboarded: (await getSetting('onboarded', '0')) === '1',
    todayDay: parseInt(await getSetting('todayDay', String(new Date().getDay())), 10),
    accent: await getSetting('accent', '#FF5A2C'),
    pop: await getSetting('pop', '#C6FF3A'),
    override: JSON.parse(await getSetting('override', 'null')),
  };
}

export async function saveSettings(s: Partial<AppSettings>): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    if (s.profile !== undefined) await setSetting('profile', JSON.stringify(s.profile));
    if (s.unit !== undefined) await setSetting('unit', s.unit);
    if (s.theme !== undefined) await setSetting('theme', s.theme);
    if (s.onboarded !== undefined) await setSetting('onboarded', s.onboarded ? '1' : '0');
    if (s.todayDay !== undefined) await setSetting('todayDay', String(s.todayDay));
    if (s.accent !== undefined) await setSetting('accent', s.accent);
    if (s.pop !== undefined) await setSetting('pop', s.pop);
    if (s.override !== undefined) await setSetting('override', JSON.stringify(s.override));
  });
}

// ── Routines ──────────────────────────────────────────────────
export async function loadRoutines(): Promise<Routine[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ id: string; name: string; color: string; days: string }>(
    'SELECT id, name, color, days FROM routines ORDER BY created_at ASC'
  );
  const routines: Routine[] = [];
  for (const row of rows) {
    const exRows = await d.getAllAsync<{ name: string }>(
      'SELECT name FROM routine_exercises WHERE routine_id = ? ORDER BY position ASC',
      [row.id]
    );
    routines.push({
      id: row.id, name: row.name, color: row.color,
      days: JSON.parse(row.days),
      exercises: exRows.map(e => e.name),
    });
  }
  return routines;
}

export async function saveRoutine(r: Routine): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    await d.runAsync(
      'INSERT OR REPLACE INTO routines (id, name, color, days) VALUES (?, ?, ?, ?)',
      [r.id, r.name, r.color, JSON.stringify(r.days)]
    );
    await d.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [r.id]);
    for (let i = 0; i < r.exercises.length; i++) {
      await d.runAsync(
        'INSERT INTO routine_exercises (id, routine_id, name, position) VALUES (?, ?, ?, ?)',
        [uid(), r.id, r.exercises[i], i]
      );
    }
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM routines WHERE id = ?', [id]);
}

// ── Sessions ──────────────────────────────────────────────────

/** Write a completed session. */
export async function saveSession(s: Session): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    await d.runAsync(
      `INSERT OR REPLACE INTO sessions
        (id, routine_id, routine_name, started_at, ended_at, duration_sec, notes, volume)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.routineId ?? null, s.routineName, s.startedAt, s.endedAt, s.durationSec, s.notes, s.volume]
    );
    for (let ei = 0; ei < s.exercises.length; ei++) {
      const ex = s.exercises[ei];
      const sexId = ex.id || uid();
      await d.runAsync(
        'INSERT INTO session_exercises (id, session_id, name, position) VALUES (?, ?, ?, ?)',
        [sexId, s.id, ex.name, ei]
      );
      for (let si = 0; si < ex.sets.length; si++) {
        const set = ex.sets[si];
        await d.runAsync(
          'INSERT INTO exercise_sets (id, session_exercise_id, reps, kg) VALUES (?, ?, ?, ?)',
          [uid(), sexId, set.reps, set.kg]
        );
      }
    }
  });
}

/** Delete a session and all its exercises/sets (CASCADE). */
export async function deleteSessionDb(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

/** Load full session (with exercises + sets) by id. */
export async function loadFullSession(id: string): Promise<Session | null> {
  const d = await db();
  const row = await d.getFirstAsync<SessionRow>(
    'SELECT * FROM sessions WHERE id = ?', [id]
  );
  if (!row) return null;
  return hydrateSession(d, row);
}

/** Load the N most recent sessions (for home screen + initial context). */
export async function loadRecentSessions(limit = 20): Promise<Session[]> {
  const d = await db();
  const rows = await d.getAllAsync<SessionRow>(
    'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?', [limit]
  );
  return Promise.all(rows.map(r => hydrateSession(d, r)));
}

/** Paginated history — returns sessions ordered newest-first. */
export async function loadSessionPage(limit: number, offset: number): Promise<Session[]> {
  const d = await db();
  const rows = await d.getAllAsync<SessionRow>(
    'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ? OFFSET ?', [limit, offset]
  );
  return Promise.all(rows.map(r => hydrateSession(d, r)));
}

export async function totalSessionCount(): Promise<number> {
  const d = await db();
  const row = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sessions');
  return row?.n ?? 0;
}

/** Count sessions in the last `days` days (for streak/week count). */
export async function recentSessionCount(days: number): Promise<number> {
  const d = await db();
  const cutoff = Date.now() - days * 86400000;
  const row = await d.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sessions WHERE started_at >= ?', [cutoff]
  );
  return row?.n ?? 0;
}

/** Days that have a session within the last `days` days. */
export async function recentSessionDays(days: number): Promise<Set<number>> {
  const d = await db();
  const cutoff = Date.now() - days * 86400000;
  const rows = await d.getAllAsync<{ started_at: number }>(
    'SELECT started_at FROM sessions WHERE started_at >= ?', [cutoff]
  );
  return new Set(rows.map(r => new Date(r.started_at).getDay()));
}

// ── Progress / strength queries ───────────────────────────────

export interface StrengthPoint { x: number; y: number; label: string; reps: number }

/** Max weight for a given exercise name within a time range, one point per session. */
export async function loadStrengthSeries(
  exerciseName: string, cutoffMs: number, unit: 'kg' | 'lbs'
): Promise<StrengthPoint[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ started_at: number; kg: REAL }>(
    `SELECT s.started_at, MAX(es.kg) AS kg
     FROM sessions s
     JOIN session_exercises se ON se.session_id = s.id
     JOIN exercise_sets es ON es.session_exercise_id = se.id
     WHERE se.name = ? AND s.started_at >= ?
     GROUP BY s.id
     ORDER BY s.started_at ASC`,
    [exerciseName, cutoffMs]
  );
  const LB = 2.20462;
  return rows.map(r => ({
    x: r.started_at,
    y: unit === 'kg' ? r.kg : Math.round(r.kg * LB),
    reps: 0,
    label: new Date(r.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
}

/** All distinct exercise names that appear in any logged session. */
export async function loadAllExerciseNames(): Promise<string[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ name: string }>(
    'SELECT DISTINCT name FROM session_exercises ORDER BY name ASC'
  );
  return rows.map(r => r.name);
}

// ── Measurements ──────────────────────────────────────────────
export async function loadMeasurements(cutoffMs = 0): Promise<Measurement[]> {
  const d = await db();
  const rows = await d.getAllAsync<Measurement>(
    'SELECT id, at, weight_kg AS weightKg, body_fat AS bodyFat FROM measurements WHERE at >= ? ORDER BY at ASC', [cutoffMs]
  );
  return rows;
}

export async function addMeasurementDb(m: Measurement): Promise<void> {
  const d = await db();
  await d.runAsync(
    'INSERT INTO measurements (id, at, weight_kg, body_fat) VALUES (?, ?, ?, ?)',
    [m.id, m.at, m.weightKg, m.bodyFat ?? null]
  );
}

// ── Seed data (first-time install) ────────────────────────────
export async function seedIfEmpty(): Promise<void> {
  const d = await db();
  const row = await d.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sessions');
  if ((row?.n ?? 0) > 0) return; // already seeded

  // Seed routines
  for (const r of SEED.routines) await saveRoutine(r);

  // Seed history
  for (const s of SEED.history) await saveSession(s);

  // Seed measurements
  for (const m of SEED.measurements) {
    await d.runAsync(
      'INSERT OR IGNORE INTO measurements (id, at, weight_kg, body_fat) VALUES (?, ?, ?, ?)',
      [m.id, m.at, m.weightKg, m.bodyFat ?? null]
    );
  }
}

// ── Internal: hydrate a session row with exercises + sets ─────
async function hydrateSession(d: SQLite.SQLiteDatabase, row: SessionRow): Promise<Session> {
  const exRows = await d.getAllAsync<{ id: string; name: string; position: number }>(
    'SELECT id, name, position FROM session_exercises WHERE session_id = ? ORDER BY position ASC',
    [row.id]
  );
  const exercises: SessionExercise[] = [];
  for (const ex of exRows) {
    const sets = await d.getAllAsync<{ reps: number; kg: number }>(
      'SELECT reps, kg FROM exercise_sets WHERE session_exercise_id = ? ORDER BY rowid ASC',
      [ex.id]
    );
    exercises.push({ id: ex.id, name: ex.name, sets });
  }
  return {
    id: row.id,
    routineId: row.routine_id,
    routineName: row.routine_name,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: row.duration_sec,
    notes: row.notes,
    volume: row.volume,
    exercises,
  };
}

type REAL = number;
