/**
 * FitLoop backend API client.
 *
 * The app stays offline-first (SQLite is the source of truth). This client is
 * the optional sync/backup layer used only when the user is signed in. All
 * responses share the envelope `{ success, message, data, errors }`; `request`
 * unwraps `data` and throws `ApiError` on any failure.
 */
import { Platform } from 'react-native';
import { Routine, Session, Measurement } from './data';

// Deployed backend. Set API_BASE_OVERRIDE to null to fall back to a local dev
// server (localhost on iOS simulator, 10.0.2.2 on Android emulator).
const API_BASE_OVERRIDE: string | null = 'https://fitloop-backend-production.up.railway.app';
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const API_BASE = `${API_BASE_OVERRIDE ?? DEFAULT_HOST}/api/v1`;

export interface AuthUser { id: string; email: string; name: string; createdAt: string }
export interface AuthResult { user: AuthUser; token: string }
export interface SessionPage { total: number; sessions: Session[] }

let authToken: string | null = null;
/** Set (or clear) the bearer token attached to every authenticated request. */
export function setAuthToken(token: string | null): void { authToken = token; }

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw new ApiError('Network error — is the server reachable?', 0);
  }
  clearTimeout(timer);

  let json: Envelope<T> | null = null;
  try { json = (await res.json()) as Envelope<T>; } catch { /* non-JSON body */ }

  if (!res.ok || !json || !json.success) {
    const msg = json?.errors?.length ? json.errors[0].message : json?.message || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return json.data as T;
}

// ── Auth ──────────────────────────────────────────────────────
export const apiSignup = (email: string, password: string, name: string) =>
  request<AuthResult>('POST', '/auth/signup', { email, password, name });
export const apiLogin = (email: string, password: string) =>
  request<AuthResult>('POST', '/auth/login', { email, password });
export const apiMe = () => request<AuthUser>('GET', '/auth/me');

// ── Routines ──────────────────────────────────────────────────
export const apiGetRoutines = () => request<Routine[]>('GET', '/routines');
export const apiSaveRoutine = (r: Routine) => request<Routine>('POST', '/routines', r);
export const apiDeleteRoutine = (id: string) => request<{ id: string }>('DELETE', `/routines/${encodeURIComponent(id)}`);

// ── Sessions ──────────────────────────────────────────────────
export const apiGetSessions = (limit = 100, offset = 0) =>
  request<SessionPage>('GET', `/sessions?limit=${limit}&offset=${offset}`);
export const apiSaveSession = (s: Session) => request<Session>('POST', '/sessions', s);
export const apiDeleteSession = (id: string) => request<{ id: string }>('DELETE', `/sessions/${encodeURIComponent(id)}`);

// ── Measurements ──────────────────────────────────────────────
export const apiGetMeasurements = (since = 0) => request<Measurement[]>('GET', `/measurements?since=${since}`);
export const apiSaveMeasurement = (m: Measurement) => request<Measurement>('POST', '/measurements', m);
export const apiDeleteMeasurement = (id: string) =>
  request<{ id: string }>('DELETE', `/measurements/${encodeURIComponent(id)}`);

// ── Settings ──────────────────────────────────────────────────
export const apiGetSettings = () => request<Record<string, unknown>>('GET', '/settings');
export const apiSaveSettings = (partial: Record<string, unknown>) =>
  request<Record<string, unknown>>('PUT', '/settings', partial);
