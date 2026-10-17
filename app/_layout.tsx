import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';

import { AppOpening } from '../src/components/app-opening';
import { StartupReadinessContext } from '../src/lib/startup-readiness';
import { GlobalLoadingOverlay } from '../src/components/global-loading-overlay';
import { BottomNavigation } from '../src/components/bottom-navigation';
import { GroupDeletionNotices } from '../src/components/group-deletion-notices';
import { mainTabForPath } from '../src/lib/main-navigation';
import { matchNotificationDestination } from '../src/lib/notification-navigation';
import { ONZE_COLORS } from '../src/theme/colors';
import { tamaguiConfig } from '../tamagui.config';

// Hold the native launch screen until the branded React view has laid out.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = mainTabForPath(pathname);
  const [openingVisible, setOpeningVisible] = useState(true);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const [loginReady, setLoginReady] = useState(false);
  const markLoginReady = useCallback(() => setLoginReady(true), []);
  const handleOpeningReady = useCallback(() => SplashScreen.hide(), []);
  const handleSequenceComplete = useCallback(() => setSequenceComplete(true), []);
  const handleOpeningFinished = useCallback(() => setOpeningVisible(false), []);
  const contentReady = loginReady || !['', '/', '/index'].includes(pathname);
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
    if (destination.pathname === '/groups') {
      router.push('/groups');
    } else {
      router.push({ pathname: destination.pathname, params: { matchId: destination.matchId } });
    }
  }, [lastNotificationResponse, router]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <TamaguiProvider
        config={tamaguiConfig}
        defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
      >
        <StartupReadinessContext.Provider value={markLoginReady}>
          <StatusBar style={openingVisible ? 'light' : 'dark'} />
          <View style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
            <View
              accessibilityElementsHidden={openingVisible}
              importantForAccessibility={openingVisible ? 'no-hide-descendants' : 'auto'}
              style={{ flex: 1 }}
            >
              <Stack screenOptions={{ headerShown: false }} />
            </View>
            {!openingVisible && activeTab ? <BottomNavigation active={activeTab} /> : null}
            {openingVisible ? (
              <AppOpening
                ready={contentReady}
                onReady={handleOpeningReady}
                onSequenceComplete={handleSequenceComplete}
                onFinished={handleOpeningFinished}
              />
            ) : null}
          </View>
          <GlobalLoadingOverlay suspended={openingVisible && !sequenceComplete} />
          {!openingVisible && activeTab ? <GroupDeletionNotices /> : null}
        </StartupReadinessContext.Provider>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
