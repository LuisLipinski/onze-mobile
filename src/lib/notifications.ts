import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { FootballMatch } from './api';
import { registerPushToken, unregisterPushToken } from './api';
import { formatCurrency } from './payment';

const PUSH_TOKEN_KEY = 'onze.expoPushToken';
const MATCHES_CHANNEL_ID = 'matches';
const LOCAL_REMINDER_SOURCE = 'onze-match-reminder';
const DAILY_REMINDER_HOUR = 9;
const MAX_LOCAL_REMINDER_DAYS = 30;

type DateOnly = {
  year: number;
  month: number;
  day: number;
};

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
      name: 'Jogos, presença e pagamentos',
      description: 'Avisos de jogos, confirmações de presença e pagamentos pendentes.',
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
  const managed = scheduled.filter(
    (item) => item.content.data?.source === LOCAL_REMINDER_SOURCE,
  );
  await Promise.all(
    managed.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  await Promise.all(matches.map((match) => scheduleMatchReminders(match, registration)));
}

export async function syncSingleMatchNotifications(
  match: FootballMatch,
  registration: NotificationRegistration,
) {
  if (Platform.OS === 'web' || !registration.permissionGranted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const managedForMatch = scheduled.filter((item) => (
    item.content.data?.source === LOCAL_REMINDER_SOURCE
    && item.content.data?.matchId === match.id
  ));
  await Promise.all(
    managedForMatch.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  await scheduleMatchReminders(match, registration);
}

async function scheduleMatchReminders(
  match: FootballMatch,
  registration: NotificationRegistration,
) {
  const now = new Date();
  const startsAt = new Date(match.startsAt);
  const signupDeadline = new Date(match.signupDeadline);
  const paymentDeadline = match.paymentDeadline ? new Date(match.paymentDeadline) : null;
  if (match.status !== 'SCHEDULED' || startsAt.getTime() <= now.getTime()) return;

  if (!registration.remoteEnabled
      && match.recurrence === 'WEEKLY'
      && !match.attendanceOpen
      && new Date(match.attendanceOpensAt).getTime() > now.getTime()
      && new Date(match.attendanceOpensAt).getTime() <= signupDeadline.getTime()) {
    await scheduleNotification(
      match,
      'attendance-opened',
      new Date(match.attendanceOpensAt),
      'Presença liberada ⚽',
      `Confirme sua presença no próximo jogo de ${match.groupName}.`,
    );
  }

  if (registration.remoteEnabled) return;

  const today = zonedDate(now, match.timeZone);
  const matchDay = zonedDate(startsAt, match.timeZone);
  let cursor = addDays(today, 1);
  let daysScheduled = 0;

  while (compareDate(cursor, matchDay) < 0 && daysScheduled < MAX_LOCAL_REMINDER_DAYS) {
    const triggerDate = zonedDateAtHour(cursor, DAILY_REMINDER_HOUR, match.timeZone);
    if (triggerDate.getTime() > now.getTime() && triggerDate.getTime() < startsAt.getTime()) {
      const isDayBefore = compareDate(addDays(cursor, 1), matchDay) === 0;
      if (match.myAttendance === 'GOING') {
        const pendingPaymentAfterDeadline = match.myPaymentStatus === 'PENDING'
          && paymentDeadline != null
          && triggerDate.getTime() > paymentDeadline.getTime();
        if (isDayBefore && !pendingPaymentAfterDeadline) {
          const copy = tomorrowNotificationCopy(match);
          await scheduleNotification(
            match,
            `tomorrow-${dateKey(cursor)}`,
            triggerDate,
            copy.title,
            copy.body,
          );
        } else if (match.myPaymentStatus === 'PENDING'
            && (paymentDeadline == null || triggerDate.getTime() <= paymentDeadline.getTime())) {
          await scheduleNotification(
            match,
            `payment-${dateKey(cursor)}`,
            triggerDate,
            'Pagamento pendente 💳',
            `Sua vaga em ${match.groupName} está reservada. O pagamento de ${formatCurrency(match.myRemainingPaymentAmount ?? match.paymentAmount ?? 0)} continua pendente.`,
          );
        }
      } else if (match.attendanceOpen
          && triggerDate.getTime() <= signupDeadline.getTime()
          && (match.myAttendance == null || match.myAttendance === 'PENDING')) {
        await scheduleNotification(
          match,
          `attendance-${dateKey(cursor)}`,
          triggerDate,
          'Você vai jogar? ⚽',
          `Você ainda não respondeu sobre o jogo de ${match.groupName}.`,
        );
      }
    }

    cursor = addDays(cursor, 1);
    daysScheduled++;
  }
}

function tomorrowNotificationCopy(match: FootballMatch) {
  if (match.myPaymentStatus === 'PENDING') {
    return {
      title: 'Jogo amanhã — pagamento pendente 💳',
      body: `Pague ${formatCurrency(match.myRemainingPaymentAmount ?? match.paymentAmount ?? 0)} e prepare-se para o jogo de ${match.groupName}.`,
    };
  }
  if (match.myPaymentStatus === 'REPORTED') {
    return {
      title: 'Jogo amanhã ⚽',
      body: `Seu pagamento foi informado e aguarda validação. Prepare-se para ${match.groupName}.`,
    };
  }
  return {
    title: 'Jogo amanhã ⚽',
    body: `Sua presença está confirmada. Prepare-se para o jogo de ${match.groupName}.`,
  };
}

async function scheduleNotification(
  match: FootballMatch,
  suffix: string,
  date: Date,
  title: string,
  body: string,
) {
  await Notifications.scheduleNotificationAsync({
    identifier: `onze-${match.id}-${suffix}`,
    content: {
      title,
      body,
      sound: 'default',
      data: {
        source: LOCAL_REMINDER_SOURCE,
        route: '/match',
        matchId: match.id,
        groupId: match.groupId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: MATCHES_CHANNEL_ID,
    },
  });
}

function zonedDate(date: Date, timeZone: string): DateOnly {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  );
  return { year: values.year, month: values.month, day: values.day };
}

function zonedDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

function zonedDateAtHour(date: DateOnly, hour: number, timeZone: string) {
  const desiredAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, 0, 0);
  let instant = desiredAsUtc;
  for (let attempt = 0; attempt < 3; attempt++) {
    const actual = zonedDateTimeParts(new Date(instant), timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    instant += desiredAsUtc - actualAsUtc;
  }
  return new Date(instant);
}

function addDays(date: DateOnly, days: number): DateOnly {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

function compareDate(left: DateOnly, right: DateOnly) {
  return Date.UTC(left.year, left.month - 1, left.day)
    - Date.UTC(right.year, right.month - 1, right.day);
}

function dateKey(date: DateOnly) {
  return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
}
