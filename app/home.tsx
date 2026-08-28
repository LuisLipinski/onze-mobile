import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Text, YStack } from 'tamagui';

import { BottomNavigation } from '../src/components/bottom-navigation';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, getCurrentUser, User } from '../src/lib/api';
import {
  clearSession,
  getAccessToken,
  getStoredCurrentUser,
  saveCurrentUser,
} from '../src/lib/auth-storage';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadUser();
    }, []),
  );

  async function loadUser() {
    setLoading(true);
    setError(null);
    try {
      const stored = await getStoredCurrentUser();
      if (stored) {
        setUser(stored);
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const current = await getCurrentUser(token);
      await saveCurrentUser(current);
      setUser(current);
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
                Veja o que está marcado e acompanhe suas próximas partidas.
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
              </YStack>
            ) : null}

            <YStack gap="$3">
              <Text color="$onzeInk" fontSize={20} fontWeight="900">Próximos jogos</Text>

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
                  Você não tem jogo marcado
                </Text>
                <Text color="$onzeMuted" fontSize={14} lineHeight={21} textAlign="center">
                  Quando uma partida for marcada em um dos seus grupos, ela aparecerá aqui.
                </Text>
              </YStack>
            </YStack>
          </YStack>
        </ScrollView>
        <BottomNavigation active="home" />
      </YStack>
    </SafeAreaView>
  );
}
