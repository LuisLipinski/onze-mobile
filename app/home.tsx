import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

import { BottomNavigation } from '../src/components/bottom-navigation';
import { MatchCard } from '../src/components/match-card';
import { LiveMatchCard } from '../src/components/live-match-card';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  FootballMatch,
  getCurrentUser,
  listLiveMatches,
  listUpcomingMatches,
  LiveMatchSummary,
  LiveMatchStreamEvent,
  User,
} from '../src/lib/api';
import {
  clearSession,
  getAccessToken,
  getStoredCurrentUser,
  saveCurrentUser,
} from '../src/lib/auth-storage';
import {
  registerNotificationsForSession,
  syncAttendanceOpeningNotifications,
} from '../src/lib/notifications';
import { applyLiveMatchSummaryEvent, scheduledHomeMatches } from '../src/lib/live-match';
import {
  LiveMatchStreamConnection,
  openLiveMatchStream,
} from '../src/lib/live-match-stream';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const liveRefreshRunningRef = useRef(false);

  const refreshLiveMatches = useCallback(async () => {
    if (liveRefreshRunningRef.current || AppState.currentState !== 'active') return;
    liveRefreshRunningRef.current = true;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const live = await listLiveMatches(token);
      setLiveMatches(live);
      setMatches((current) => scheduledHomeMatches(current, live));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
      }
    } finally {
      liveRefreshRunningRef.current = false;
    }
  }, [router]);

  const applyLiveMatchEvent = useCallback((event: LiveMatchStreamEvent) => {
    const summary = event.summary;
    setLiveMatches((current) => applyLiveMatchSummaryEvent(current, event));
    if (summary?.status === 'IN_PROGRESS') {
      setMatches((current) => current.filter((match) => match.id !== event.matchId));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let stream: LiveMatchStreamConnection | null = null;
      let openedBefore = false;

      const connect = async () => {
        if (!active || stream || AppState.currentState !== 'active') return;
        const token = await getAccessToken();
        if (!token || !active) return;
        const connection = openLiveMatchStream(token, undefined, {
          onEvent: applyLiveMatchEvent,
          onOpen: () => {
            if (openedBefore) void refreshLiveMatches();
            openedBefore = true;
          },
          onUnauthorized: () => {
            void clearSession().finally(() => router.replace('/'));
          },
        });
        if (!active) connection.close();
        else stream = connection;
      };

      void loadHome();
      void connect();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state !== 'active') {
          stream?.close();
          stream = null;
          openedBefore = false;
          return;
        }
        void refreshLiveMatches();
        void connect();
      });
      return () => {
        active = false;
        stream?.close();
        subscription.remove();
      };
    }, [applyLiveMatchEvent, refreshLiveMatches, router]),
  );

  async function loadHome() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const stored = await getStoredCurrentUser();
      let currentUser = stored;
      if (stored) {
        setUser(stored);
      } else {
        currentUser = await getCurrentUser(token);
        await saveCurrentUser(currentUser);
        setUser(currentUser);
      }

      const [upcoming, live] = await Promise.all([
        listUpcomingMatches(token),
        listLiveMatches(token),
      ]);
      setLiveMatches(live);
      setMatches(scheduledHomeMatches(upcoming, live));

      void registerNotificationsForSession(token)
        .then((registration) => syncAttendanceOpeningNotifications(upcoming, registration))
        .catch(() => undefined);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar sua conta.');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !user) {
    return <ServerLoadingScreen title="Carregando o Onze..." message="Preparando sua página inicial." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <YStack flex={1}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
          <YStack gap="$6" paddingVertical="$3">
            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={18} fontWeight="900">ONZE</Text>
              <Text color="$onzeInk" fontSize={30} fontWeight="900">
                {user ? `Olá, ${user.displayName}` : 'Sua próxima pelada'}
              </Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                Veja o que está marcado, confirme sua presença e não perca o próximo jogo.
              </Text>
            </YStack>

            {error ? (
              <YStack
                backgroundColor="$onzeSurface"
                borderColor="$onzeDanger"
                borderRadius="$5"
                borderWidth={1}
                padding="$4"
              >
                <Text color="$onzeDanger" fontSize={13}>{error}</Text>
                <Button backgroundColor="$onzeGreen" marginTop="$3" onPress={() => void loadHome()}>
                  <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
                </Button>
              </YStack>
            ) : null}

            <YStack gap="$3">
              <YStack gap="$1">
                <Text color="$onzeInk" fontSize={20} fontWeight="900">Jogos ao vivo</Text>
                <Text color="$onzeMuted" fontSize={13}>
                  Acompanhe o placar e os acontecimentos das partidas em andamento.
                </Text>
              </YStack>

              {!error && liveMatches.length === 0 ? (
                <YStack
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderRadius="$6"
                  borderWidth={1}
                  padding="$4"
                >
                  <Text color="$onzeMuted" fontSize={13} textAlign="center">
                    Nenhuma partida ao vivo agora.
                  </Text>
                </YStack>
              ) : (
                liveMatches.map((match) => (
                  <LiveMatchCard
                    key={match.matchId}
                    match={match}
                    onPress={() => router.push({
                      pathname: '/live-match',
                      params: { matchId: match.matchId },
                    })}
                  />
                ))
              )}
            </YStack>

            <YStack gap="$3">
              <Text color="$onzeInk" fontSize={20} fontWeight="900">Próximos jogos</Text>

              {!error && matches.length === 0 ? (
                <YStack
                  alignItems="center"
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderRadius="$7"
                  borderWidth={1}
                  gap="$3"
                  padding="$7"
                >
                  <Text fontSize={42}>⚽</Text>
                  <Text color="$onzeInk" fontSize={19} fontWeight="900" textAlign="center">
                    Você não tem nenhum próximo jogo agendado.
                  </Text>
                  <Text color="$onzeMuted" fontSize={14} lineHeight={21} textAlign="center">
                    Quando uma partida for marcada em um dos seus grupos, ela aparecerá aqui.
                  </Text>
                </YStack>
              ) : (
                matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPress={() => router.push({ pathname: '/match', params: { matchId: match.id } })}
                  />
                ))
              )}
            </YStack>
          </YStack>
        </ScrollView>
        <BottomNavigation active="home" />
      </YStack>
    </SafeAreaView>
  );
}
