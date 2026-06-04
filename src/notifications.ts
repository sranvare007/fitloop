import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { GymSchedule } from './data';

const CHANNEL_ID = 'gym-reminders';
const GYM_NOTIF_PREFIX = 'gym-reminder-day-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Gym Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      enableVibrate: false,
    });
  }
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  if (!canAskAgain) return false;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

export async function scheduleGymNotifications(schedule: GymSchedule): Promise<void> {
  await cancelGymNotifications();
  if (!schedule.days.length) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  for (const day of schedule.days) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${GYM_NOTIF_PREFIX}${day}`,
      content: {
        title: "Time to lift! 💪",
        body: "Log your workout progress in FitLoop.",
        data: { type: 'gym-reminder' },
        sticky: true,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // expo-notifications: weekday 1=Sunday, 2=Monday, ..., 7=Saturday
        // JS day: 0=Sunday, 1=Monday, ..., 6=Saturday → add 1
        weekday: day + 1,
        hour: schedule.startHour,
        minute: schedule.startMin,
      },
    });
  }
}

export async function cancelGymNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.identifier.startsWith(GYM_NOTIF_PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
