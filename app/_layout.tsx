import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { TamaguiProvider } from 'tamagui';

import { GlobalLoadingOverlay } from '../src/components/global-loading-overlay';
import { matchNotificationDestination } from '../src/lib/notification-navigation';
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
    const data = response.notification.request.content.data;
    const destination = matchNotificationDestination(data);
    if (handledNotificationId.current === notificationId || !destination) return;

    handledNotificationId.current = notificationId;
    router.push({ pathname: destination.pathname, params: { matchId: destination.matchId } });
  }, [lastNotificationResponse, router]);

  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
    >
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalLoadingOverlay />
    </TamaguiProvider>
  );
}
