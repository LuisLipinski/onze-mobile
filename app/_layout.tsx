import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { TamaguiProvider } from 'tamagui';

import { tamaguiConfig } from '../tamagui.config';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const handledNotificationId = useRef<string | null>(null);

  useEffect(() => {
    const response = lastNotificationResponse;
    if (!response) return;

    const notificationId = response.notification.request.identifier;
    const matchId = response.notification.request.content.data?.matchId;
    if (handledNotificationId.current === notificationId || typeof matchId !== 'string') return;

    handledNotificationId.current = notificationId;
    router.push({ pathname: '/match', params: { matchId } });
  }, [lastNotificationResponse, router]);

  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </TamaguiProvider>
  );
}
