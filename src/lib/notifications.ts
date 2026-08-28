import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { FootballMatch } from './api';
import { registerPushToken, unregisterPushToken } from './api';

const PUSH_TOKEN_KEY = 'onze.expoPushToken';
const MATCHES_CHANNEL_ID = 'matches';
const LOCAL_ATTENDANCE_SOURCE = 'onze-weekly-attendance';

export type NotificationRegistration = {
  remoteEnabled: boolean;
  permissionGranted: boolean;
  reason?: 'unsupported' | 'permission-denied' | 'project-not-configured' | 'registration-failed';
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

function getProjectId() {
  const configured = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  if (configured) return configured;

  return Constants.easConfig?.projectId
    ?? (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
    ?? null;
}

async function prepareNotificationPermission() {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MATCHES_CHANNEL_ID, {
      name: 'Jogos e presença',
      description: 'Avisos de novos jogos e abertura da confirmação de presença.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: '#148A4A',
      sound: 'default',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function registerNotificationsForSession(
  accessToken: string,
): Promise<NotificationRegistration> {
  if (Platform.OS === 'web') {
    return { remoteEnabled: false, permissionGranted: false, reason: 'unsupported' };
  }

  try {
    const permissionGranted = await prepareNotificationPermission();
    if (!permissionGranted) {
      return { remoteEnabled: false, permissionGranted: false, reason: 'permission-denied' };
    }

    const projectId = getProjectId();
    if (!projectId) {
      return {
        remoteEnabled: false,
        permissionGranted: true,
        reason: 'project-not-configured',
      };
    }

    const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await registerPushToken(accessToken, expoToken);
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoToken);
    return { remoteEnabled: true, permissionGranted: true };
  } catch {
    return {
      remoteEnabled: false,
      permissionGranted: true,
      reason: 'registration-failed',
    };
  }
}

export async function unregisterNotificationsForSession(accessToken: string) {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await unregisterPushToken(accessToken, token);
  } finally {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  }
}

export async function syncAttendanceOpeningNotifications(
  matches: FootballMatch[],
  registration: NotificationRegistration,
) {
  if (Platform.OS === 'web' || !registration.permissionGranted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const localBackups = scheduled.filter(
    (item) => item.content.data?.source === LOCAL_ATTENDANCE_SOURCE,
  );
  await Promise.all(
    localBackups.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  if (registration.remoteEnabled) return;

  const now = Date.now();
  const notifications = matches.filter((match) => (
    match.status === 'SCHEDULED'
    && match.recurrence === 'WEEKLY'
    && !match.attendanceOpen
    && new Date(match.attendanceOpensAt).getTime() > now
    && new Date(match.startsAt).getTime() > now
  ));

  await Promise.all(notifications.map((match) => Notifications.scheduleNotificationAsync({
    identifier: `onze-attendance-${match.id}`,
    content: {
      title: 'Presença liberada ⚽',
      body: `Confirme sua presença no próximo jogo de ${match.groupName}.`,
      sound: 'default',
      data: {
        source: LOCAL_ATTENDANCE_SOURCE,
        route: '/match',
        matchId: match.id,
        groupId: match.groupId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(match.attendanceOpensAt),
      channelId: MATCHES_CHANNEL_ID,
    },
  })));
}
