import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { WidgetExercise, WidgetSnapshot } from './data';

type SessionWidgetNative = {
  sync: (payloadJson: string, baseRev: number) => Promise<string>;
  end: () => Promise<void>;
  getSnapshot: () => Promise<string | null>;
  addListener: (event: string) => void;
  removeListeners: (count: number) => void;
};

// Absent on builds that predate the widget (JS can arrive there over the air),
// so every call below degrades to a no-op instead of throwing.
const native: SessionWidgetNative | undefined = NativeModules.SessionWidget;

const CHANGE_EVENT = 'SessionWidgetChanged';
const CHANNEL_ID = 'workout-session';

export type WidgetPayload = {
  startedAt: number;
  lastActiveAt: number;
  routineName: string;
  unit: string;
  exercises: WidgetExercise[];
  /** Exercise the widget should jump to, when the user just worked on one in the app. */
  focusId?: string | null;
};

export type WidgetSyncResult =
  | { ok: true; rev: number }
  /** The widget changed since `baseRev`; merge `snapshot` and sync again. */
  | { ok: false; snapshot: WidgetSnapshot };

export const sessionWidgetAvailable = !!native;

export async function syncSessionWidget(payload: WidgetPayload, baseRev: number): Promise<WidgetSyncResult | null> {
  if (!native) return null;
  try {
    return JSON.parse(await native.sync(JSON.stringify(payload), baseRev));
  } catch {
    return null;
  }
}

export async function endSessionWidget(): Promise<void> {
  if (!native) return;
  try { await native.end(); } catch { /* nothing to clean up */ }
}

export async function getSessionWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  if (!native) return null;
  try {
    const json = await native.getSnapshot();
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function onSessionWidgetChange(cb: (snapshot: WidgetSnapshot) => void): () => void {
  if (!native) return () => {};
  const sub = new NativeEventEmitter(NativeModules.SessionWidget).addListener(CHANGE_EVENT, (json: string) => {
    try { cb(JSON.parse(json)); } catch { /* malformed payload — ignore */ }
  });
  return () => sub.remove();
}

/**
 * Android shows the widget as a notification, which needs the runtime
 * permission on 13+. iOS Live Activities need no prompt.
 */
export async function ensureSessionWidgetPermission(): Promise<void> {
  if (!native || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout in progress',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
    });
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && canAskAgain) await Notifications.requestPermissionsAsync();
  } catch { /* the workout itself must never depend on this */ }
}
