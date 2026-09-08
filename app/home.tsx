import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, YStack } from 'tamagui';

import { BottomNavigation } from '../src/components/bottom-navigation';
import { MatchCard } from '../src/components/match-card';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  FootballMatch,
  getCurrentUser,
  listUpcomingMatches,
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

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, []),
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

      const upcoming = await listUpcomingMatches(token);
      setMatches(upcoming);

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
                    Você não tem nenhum jogo marcado.
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
