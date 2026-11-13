/**
 * SQLite database module for FitLoop.
 * Schema:
 *   settings          – key/value preferences
 *   routines          – workout plans
 *   routine_exercises – ordered exercise names per routine
 *   sessions          – completed workout sessions
 *   session_exercises – exercises logged in a session
 *   exercise_sets     – individual sets (reps × kg) + an optional free-text note
 *   measurements      – body weight + body fat entries
 *   body_logs         – body-measurement sessions (one row per time the user measured)
 *   body_log_values   – circumference in cm per body part within a body log
 *   personal_records  – user-set personal-record sets (kg × reps) per exercise, one row per set position
 */
import * as SQLite from 'expo-sqlite';
import {
  Routine, Session, SessionExercise, Measurement, Profile,
  Override, GymSchedule, PhysiquePhoto, BodyLog, BodyPart, SEED, uid, sessionVolume, startOfWeekMs,
} from './data';
import { photoUri } from './photos';

export type SessionRow = {
  id: string; routine_id: string | null; routine_name: string;
  started_at: number; ended_at: number; duration_sec: number;
  notes: string; volume: number;
  calories: number | null; calories_summary: string | null;
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
      id               TEXT PRIMARY KEY,
      routine_id       TEXT,
      routine_name     TEXT NOT NULL,
      started_at       INTEGER NOT NULL,
      ended_at         INTEGER NOT NULL,
      duration_sec     INTEGER NOT NULL,
      notes            TEXT NOT NULL DEFAULT '',
      volume           REAL NOT NULL DEFAULT 0,
      calories         REAL,
      calories_summary TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);

    CREATE TABLE IF NOT EXISTS session_exercises (
      id         TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      position   INTEGER NOT NULL,
      calories   REAL
    );

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id                  TEXT PRIMARY KEY,
      session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
      reps                INTEGER NOT NULL,
      kg                  REAL NOT NULL,
      note                TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id        TEXT PRIMARY KEY,
      at        INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      body_fat  REAL
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_at ON measurements(at DESC);

    CREATE TABLE IF NOT EXISTS body_logs (
      id TEXT PRIMARY KEY,
      at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_body_logs_at ON body_logs(at DESC);

    CREATE TABLE IF NOT EXISTS body_log_values (
      log_id TEXT NOT NULL REFERENCES body_logs(id) ON DELETE CASCADE,
      part   TEXT NOT NULL,
      cm     REAL NOT NULL,
      PRIMARY KEY (log_id, part)
    );

    CREATE TABLE IF NOT EXISTS physique_photos (
      id        TEXT PRIMARY KEY,
      at        INTEGER NOT NULL,
      file      TEXT NOT NULL,
      pose      TEXT NOT NULL DEFAULT 'front',
      note      TEXT NOT NULL DEFAULT '',
      weight_kg REAL
    );

    CREATE INDEX IF NOT EXISTS idx_physique_at ON physique_photos(at DESC);

    CREATE TABLE IF NOT EXISTS personal_records (
      name     TEXT NOT NULL,
      position INTEGER NOT NULL,
      kg       REAL NOT NULL,
      reps     INTEGER NOT NULL,
      at       INTEGER NOT NULL,
      PRIMARY KEY (name, position)
    );
  `);

  // Migrate: an earlier single-row personal_records schema had no `position`
  // column. Recreate it in the per-set shape (pre-release, so no data to keep).
  const prColumns = await d.getAllAsync<{ name: string }>('PRAGMA table_info(personal_records)');
  if (prColumns.length && !prColumns.some(c => c.name === 'position')) {
    await d.execAsync(`
      DROP TABLE personal_records;
      CREATE TABLE personal_records (
        name     TEXT NOT NULL,
        position INTEGER NOT NULL,
        kg       REAL NOT NULL,
        reps     INTEGER NOT NULL,
        at       INTEGER NOT NULL,
        PRIMARY KEY (name, position)
      );
    `);
  }

  // Migrate: add position/note columns to exercise_sets if missing (safe no-op if already present)
  const esColumns = await d.getAllAsync<{ name: string }>('PRAGMA table_info(exercise_sets)');
  if (!esColumns.some(c => c.name === 'position')) {
    await d.execAsync('ALTER TABLE exercise_sets ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
  }
  if (!esColumns.some(c => c.name === 'note')) {
    await d.execAsync("ALTER TABLE exercise_sets ADD COLUMN note TEXT NOT NULL DEFAULT ''");
  }

  // Migrate: calories columns, added with the backend calorie estimator.
  const sColumns = await d.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  if (!sColumns.some(c => c.name === 'calories')) {
    await d.execAsync('ALTER TABLE sessions ADD COLUMN calories REAL');
  }
  if (!sColumns.some(c => c.name === 'calories_summary')) {
    await d.execAsync("ALTER TABLE sessions ADD COLUMN calories_summary TEXT NOT NULL DEFAULT ''");
  }
  const sexColumns = await d.getAllAsync<{ name: string }>('PRAGMA table_info(session_exercises)');
  if (!sexColumns.some(c => c.name === 'calories')) {
    await d.execAsync('ALTER TABLE session_exercises ADD COLUMN calories REAL');
  }
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
  todayDay: number;
  accent: string;
  pop: string;
  override: Override | null;
  gymSchedule: GymSchedule | null;
}

export async function loadSettings(): Promise<AppSettings> {
  return {
    profile: JSON.parse(await getSetting('profile', JSON.stringify(SEED.profile))),
    unit: (await getSetting('unit', 'kg')) as 'kg' | 'lbs',
    theme: await getSetting('theme', 'dark'),
    todayDay: parseInt(await getSetting('todayDay', String(new Date().getDay())), 10),
    accent: await getSetting('accent', '#FF5A2C'),
    pop: await getSetting('pop', '#C6FF3A'),
    override: JSON.parse(await getSetting('override', 'null')),
    gymSchedule: JSON.parse(await getSetting('gymSchedule', 'null')),
  };
}

export async function saveSettings(s: Partial<AppSettings>): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    if (s.profile !== undefined) await setSetting('profile', JSON.stringify(s.profile));
    if (s.unit !== undefined) await setSetting('unit', s.unit);
    if (s.theme !== undefined) await setSetting('theme', s.theme);
    if (s.todayDay !== undefined) await setSetting('todayDay', String(s.todayDay));
    if (s.accent !== undefined) await setSetting('accent', s.accent);
    if (s.pop !== undefined) await setSetting('pop', s.pop);
    if (s.override !== undefined) await setSetting('override', JSON.stringify(s.override));
    if (s.gymSchedule !== undefined) await setSetting('gymSchedule', JSON.stringify(s.gymSchedule));
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
        (id, routine_id, routine_name, started_at, ended_at, duration_sec, notes, volume, calories, calories_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.routineId ?? null, s.routineName, s.startedAt, s.endedAt, s.durationSec, s.notes, s.volume,
       s.calories ?? null, s.caloriesSummary ?? '']
    );
    for (let ei = 0; ei < s.exercises.length; ei++) {
      const ex = s.exercises[ei];
      const sexId = ex.id || uid();
      await d.runAsync(
        'INSERT INTO session_exercises (id, session_id, name, position, calories) VALUES (?, ?, ?, ?, ?)',
        [sexId, s.id, ex.name, ei, ex.calories ?? null]
      );
      for (let si = 0; si < ex.sets.length; si++) {
        const set = ex.sets[si];
        await d.runAsync(
          'INSERT INTO exercise_sets (id, session_exercise_id, reps, kg, position, note) VALUES (?, ?, ?, ?, ?, ?)',
          [uid(), sexId, set.reps, set.kg, si, set.note ?? '']
        );
      }
    }
  });
}

/**
 * Attach a calorie estimate to an already-saved session. Per-exercise rows are
 * matched by their `session_exercises.id`, so an exercise the estimator did not
 * cover simply keeps a null.
 */
export async function saveSessionCaloriesDb(
  sessionId: string,
  totalCalories: number,
  summary: string,
  perExercise: { id: string; calories: number }[],
): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    await d.runAsync(
      'UPDATE sessions SET calories = ?, calories_summary = ? WHERE id = ?',
      [totalCalories, summary, sessionId]
    );
    for (const ex of perExercise) {
      await d.runAsync(
        'UPDATE session_exercises SET calories = ? WHERE id = ? AND session_id = ?',
        [ex.calories, ex.id, sessionId]
      );
    }
  });
}

/** How many saved sessions still have no calorie estimate. */
export async function countSessionsMissingCalories(): Promise<number> {
  const d = await db();
  const row = await d.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sessions WHERE calories IS NULL'
  );
  return row?.n ?? 0;
}

/**
 * Sessions still missing a calorie estimate, newest-first. Successful estimates
 * drop out of this query, so a backfill walking it in order only needs to skip
 * past the ones it has already failed on.
 */
export async function loadSessionsMissingCalories(limit: number, offset = 0): Promise<Session[]> {
  const d = await db();
  const rows = await d.getAllAsync<SessionRow>(
    'SELECT * FROM sessions WHERE calories IS NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return Promise.all(rows.map(r => hydrateSession(d, r)));
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

/** Count sessions in the current calendar week (Monday-based). */
export async function thisWeekSessionCount(): Promise<number> {
  const d = await db();
  const cutoff = startOfWeekMs();
  const row = await d.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sessions WHERE started_at >= ?', [cutoff]
  );
  return row?.n ?? 0;
}

/** Weekdays (0=Sun … 6=Sat) that have a session in the current calendar week. */
export async function thisWeekSessionDays(): Promise<Set<number>> {
  const d = await db();
  const cutoff = startOfWeekMs();
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

/** All distinct exercise names from logged sessions, saved routines, and personal records. */
export async function loadAllExerciseNames(): Promise<string[]> {
  const d = await db();
  const rows = await d.getAllAsync<{ name: string }>(
    `SELECT name FROM session_exercises
     UNION
     SELECT name FROM routine_exercises
     UNION
     SELECT name FROM personal_records
     ORDER BY name ASC`
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

export async function deleteMeasurementDb(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM measurements WHERE id = ?', [id]);
}

// ── Body measurements ─────────────────────────────────────────
type BodyLogValueRow = { log_id: string; at: number; part: string; cm: number };

/** Body logs within a time range, oldest-first, each with its per-part values. */
export async function loadBodyLogs(cutoffMs = 0): Promise<BodyLog[]> {
  const d = await db();
  const rows = await d.getAllAsync<BodyLogValueRow>(
    `SELECT l.id AS log_id, l.at, v.part, v.cm
     FROM body_logs l
     JOIN body_log_values v ON v.log_id = l.id
     WHERE l.at >= ?
     ORDER BY l.at ASC`,
    [cutoffMs]
  );
  const byId = new Map<string, BodyLog>();
  for (const r of rows) {
    let log = byId.get(r.log_id);
    if (!log) { log = { id: r.log_id, at: r.at, values: {} }; byId.set(r.log_id, log); }
    log.values[r.part as BodyPart] = r.cm;
  }
  return [...byId.values()];
}

/** Insert or replace a body log and all of its values. */
export async function saveBodyLogDb(log: BodyLog): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    // Upsert, not INSERT OR REPLACE: REPLACE deletes the parent row, and whether
    // that cascades depends on SQLite trigger settings — keep the values explicit.
    await d.runAsync(
      'INSERT INTO body_logs (id, at) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET at = excluded.at',
      [log.id, log.at]
    );
    await d.runAsync('DELETE FROM body_log_values WHERE log_id = ?', [log.id]);
    for (const [part, cm] of Object.entries(log.values)) {
      if (cm == null) continue;
      await d.runAsync(
        'INSERT INTO body_log_values (log_id, part, cm) VALUES (?, ?, ?)',
        [log.id, part, cm]
      );
    }
  });
}

export async function deleteBodyLogDb(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM body_logs WHERE id = ?', [id]);
}

// ── Physique photos ───────────────────────────────────────────
type PhysiquePhotoRow = { id: string; at: number; file: string; pose: string; note: string; weight_kg: number | null };

function hydratePhoto(r: PhysiquePhotoRow): PhysiquePhoto {
  return {
    id: r.id, at: r.at, file: r.file, uri: photoUri(r.file),
    pose: r.pose as PhysiquePhoto['pose'], note: r.note, weightKg: r.weight_kg,
  };
}

/** All physique photos within a time range, newest-first. */
export async function loadPhysiquePhotos(cutoffMs = 0): Promise<PhysiquePhoto[]> {
  const d = await db();
  const rows = await d.getAllAsync<PhysiquePhotoRow>(
    'SELECT id, at, file, pose, note, weight_kg FROM physique_photos WHERE at >= ? ORDER BY at DESC', [cutoffMs]
  );
  return rows.map(hydratePhoto);
}

export async function addPhysiquePhotoDb(p: PhysiquePhoto): Promise<void> {
  const d = await db();
  await d.runAsync(
    'INSERT INTO physique_photos (id, at, file, pose, note, weight_kg) VALUES (?, ?, ?, ?, ?, ?)',
    [p.id, p.at, p.file, p.pose, p.note, p.weightKg ?? null]
  );
}

export async function deletePhysiquePhotoDb(id: string): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM physique_photos WHERE id = ?', [id]);
}

// ── In-progress session ────────────────────────────────────────
const IPS_KEY = 'in_progress_session';

export interface InProgressSession {
  startedAt: number;
  lastActiveAt: number;
  routineId: string | null;
  routineName: string;
  exercises: any[];
  /** Ids of the exercise cards left expanded, so resuming restores the same view. */
  openIds?: string[];
}

export async function saveInProgressSessionDb(data: InProgressSession): Promise<void> {
  await setSetting(IPS_KEY, JSON.stringify(data));
}

export async function loadInProgressSessionDb(): Promise<InProgressSession | null> {
  return JSON.parse(await getSetting(IPS_KEY, 'null'));
}

export async function clearInProgressSessionDb(): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM settings WHERE key = ?', [IPS_KEY]);
}

// ── Export / Import ───────────────────────────────────────────

export type FitLoopExport = {
  version: 1;
  exportedAt: number;
  profile: Profile;
  routines: Routine[];
  sessions: Session[];
  measurements: Measurement[];
  /** Absent in backups made before body measurements existed. */
  bodyLogs?: BodyLog[];
};

export async function exportAllData(profile: Profile): Promise<FitLoopExport> {
  const d = await db();
  const routines = await loadRoutines();
  const sessionRows = await d.getAllAsync<SessionRow>(
    'SELECT * FROM sessions ORDER BY started_at ASC'
  );
  const sessions = await Promise.all(sessionRows.map(r => hydrateSession(d, r)));
  const measurements = await loadMeasurements(0);
  const bodyLogs = await loadBodyLogs(0);
  return { version: 1, exportedAt: Date.now(), profile, routines, sessions, measurements, bodyLogs };
}

export type ImportResult = { routines: number; sessions: number; measurements: number; bodyLogs: number };

export async function importAllData(data: FitLoopExport): Promise<ImportResult> {
  const d = await db();
  let routines = 0, sessions = 0, measurements = 0, bodyLogs = 0;
  await d.withTransactionAsync(async () => {
    for (const r of data.routines) {
      const exists = await d.getFirstAsync<{ id: string }>('SELECT id FROM routines WHERE id = ?', [r.id]);
      if (!exists) {
        await d.runAsync(
          'INSERT INTO routines (id, name, color, days) VALUES (?, ?, ?, ?)',
          [r.id, r.name, r.color, JSON.stringify(r.days)]
        );
        for (let i = 0; i < r.exercises.length; i++) {
          await d.runAsync(
            'INSERT INTO routine_exercises (id, routine_id, name, position) VALUES (?, ?, ?, ?)',
            [uid(), r.id, r.exercises[i], i]
          );
        }
        routines++;
      }
    }
    for (const s of data.sessions) {
      const exists = await d.getFirstAsync<{ id: string }>('SELECT id FROM sessions WHERE id = ?', [s.id]);
      if (!exists) {
        await d.runAsync(
          `INSERT INTO sessions (id, routine_id, routine_name, started_at, ended_at, duration_sec, notes, volume, calories, calories_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.routineId ?? null, s.routineName, s.startedAt, s.endedAt, s.durationSec, s.notes, s.volume,
           s.calories ?? null, s.caloriesSummary ?? '']
        );
        for (let ei = 0; ei < s.exercises.length; ei++) {
          const ex = s.exercises[ei];
          const sexId = ex.id || uid();
          await d.runAsync(
            'INSERT INTO session_exercises (id, session_id, name, position, calories) VALUES (?, ?, ?, ?, ?)',
            [sexId, s.id, ex.name, ei, ex.calories ?? null]
          );
          for (let si = 0; si < ex.sets.length; si++) {
            const set = ex.sets[si];
            await d.runAsync(
              'INSERT INTO exercise_sets (id, session_exercise_id, reps, kg, position, note) VALUES (?, ?, ?, ?, ?, ?)',
              [uid(), sexId, set.reps, set.kg, si, set.note ?? '']
            );
          }
        }
        sessions++;
      }
    }
    for (const m of data.measurements) {
      const exists = await d.getFirstAsync<{ id: string }>('SELECT id FROM measurements WHERE id = ?', [m.id]);
      if (!exists) {
        await d.runAsync(
          'INSERT INTO measurements (id, at, weight_kg, body_fat) VALUES (?, ?, ?, ?)',
          [m.id, m.at, m.weightKg, m.bodyFat ?? null]
        );
        measurements++;
      }
    }
    for (const log of data.bodyLogs ?? []) {
      const exists = await d.getFirstAsync<{ id: string }>('SELECT id FROM body_logs WHERE id = ?', [log.id]);
      if (!exists) {
        await d.runAsync('INSERT INTO body_logs (id, at) VALUES (?, ?)', [log.id, log.at]);
        for (const [part, cm] of Object.entries(log.values)) {
          if (cm == null) continue;
          await d.runAsync('INSERT INTO body_log_values (log_id, part, cm) VALUES (?, ?, ?)', [log.id, part, cm]);
        }
        bodyLogs++;
      }
    }
  });
  return { routines, sessions, measurements, bodyLogs };
}


// ── Internal: hydrate a session row with exercises + sets ─────
async function hydrateSession(d: SQLite.SQLiteDatabase, row: SessionRow): Promise<Session> {
  const exRows = await d.getAllAsync<{ id: string; name: string; position: number; calories: number | null }>(
    'SELECT id, name, position, calories FROM session_exercises WHERE session_id = ? ORDER BY position ASC',
    [row.id]
  );
  const exercises: SessionExercise[] = [];
  for (const ex of exRows) {
    const sets = await d.getAllAsync<{ reps: number; kg: number; note: string }>(
      'SELECT reps, kg, note FROM exercise_sets WHERE session_exercise_id = ? ORDER BY rowid ASC',
      [ex.id]
    );
    exercises.push({ id: ex.id, name: ex.name, sets, calories: ex.calories });
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
    calories: row.calories,
    caloriesSummary: row.calories_summary ?? '',
    exercises,
  };
}

// ── Per-set bests ─────────────────────────────────────────────
export type SetBest = { position: number; reps: number; kg: number };

/**
 * For each exercise name, returns the all-time best set at each position
 * (highest kg, tiebroken by highest reps), then ordered lightest-first
 * (kg ascending, tiebroken by reps ascending) so the previous-best column
 * shown against an active session reads in increasing order. Uses a window
 * function so it's one round-trip regardless of how many names are passed.
 */
export async function loadAllSetBests(names: string[]): Promise<Record<string, SetBest[]>> {
  if (!names.length) return {};
  const d = await db();
  const ph = names.map(() => '?').join(', ');
  const rows = await d.getAllAsync<{ n: string; position: number; reps: number; kg: number }>(
    `SELECT best.n, best.position, best.reps, best.kg
     FROM (
       SELECT se.name AS n, es.position, es.kg, es.reps,
         ROW_NUMBER() OVER (PARTITION BY se.name, es.position ORDER BY es.kg DESC, es.reps DESC) AS rk
       FROM exercise_sets es
       JOIN session_exercises se ON se.id = es.session_exercise_id
       WHERE se.name IN (${ph})
     ) best
     WHERE best.rk = 1
     ORDER BY best.n ASC, best.kg ASC, best.reps ASC`,
    names
  );
  const result: Record<string, SetBest[]> = {};
  for (const row of rows) {
    if (!result[row.n]) result[row.n] = [];
    result[row.n].push({ position: row.position, reps: row.reps, kg: row.kg });
  }
  return result;
}

// ── Personal records ──────────────────────────────────────────
/**
 * User-set personal records: an ordered list of best sets per exercise, one
 * `SetBest` per set position. These override the values derived from logged
 * history (see `loadAllSetBests`); an exercise with no rows falls back to those
 * computed bests, and the single headline PB to SEED_PB (see context `pbFor`).
 */
export async function loadPersonalRecords(): Promise<Record<string, SetBest[]>> {
  const d = await db();
  const rows = await d.getAllAsync<{ name: string; position: number; reps: number; kg: number }>(
    'SELECT name, position, reps, kg FROM personal_records ORDER BY name ASC, position ASC'
  );
  const result: Record<string, SetBest[]> = {};
  for (const row of rows) {
    (result[row.name] ??= []).push({ position: row.position, reps: row.reps, kg: row.kg });
  }
  return result;
}

/** Replace all personal-record sets for an exercise. Passing an empty list clears them. */
export async function savePersonalRecordsDb(name: string, sets: { reps: number; kg: number }[]): Promise<void> {
  const d = await db();
  await d.withTransactionAsync(async () => {
    await d.runAsync('DELETE FROM personal_records WHERE name = ?', [name]);
    const at = Date.now();
    for (let i = 0; i < sets.length; i++) {
      await d.runAsync(
        'INSERT INTO personal_records (name, position, kg, reps, at) VALUES (?, ?, ?, ?, ?)',
        [name, i, sets[i].kg, sets[i].reps, at]
      );
    }
  });
}

type REAL = number;
