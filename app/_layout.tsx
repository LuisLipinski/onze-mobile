import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useColorScheme, View } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import { GlobalLoadingOverlay } from '../src/components/global-loading-overlay';
import { BottomNavigation } from '../src/components/bottom-navigation';
import { mainTabForPath } from '../src/lib/main-navigation';
import { matchNotificationDestination } from '../src/lib/notification-navigation';
import { ONZE_COLORS } from '../src/theme/colors';
import { tamaguiConfig } from '../tamagui.config';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const activeTab = mainTabForPath(usePathname());
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
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <TamaguiProvider
        config={tamaguiConfig}
        defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
      >
        <View style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
          {activeTab ? <BottomNavigation active={activeTab} /> : null}
        </View>
        <GlobalLoadingOverlay />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
