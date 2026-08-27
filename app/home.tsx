import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, getCurrentUser, Group, listGroups, User } from '../src/lib/api';
import {
  clearSession,
  disableBiometricLogin,
  enableBiometricLogin,
  getAccessToken,
  getStoredCurrentUser,
  isBiometricLoginEnabled,
  saveCurrentUser,
} from '../src/lib/auth-storage';
import { authenticateWithBiometrics, isBiometricAvailable } from '../src/lib/biometrics';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    void loadUser();
    void loadBiometricState();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void loadGroups();
      }
    }, [user]),
  );

  async function loadBiometricState() {
    try {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      setBiometricEnabled(available && (await isBiometricLoginEnabled()));
    } catch {
      setBiometricAvailable(false);
      setBiometricEnabled(false);
    }
  }

  async function loadUser() {
    setError(null);

    try {
      const storedUser = await getStoredCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }

      const currentUser = await getCurrentUser(token);
      await saveCurrentUser(currentUser);
      setUser(currentUser);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }

      setError(
        exception instanceof Error ? exception.message : 'Sua sessão não pôde ser carregada.',
      );
    }
  }

  async function loadGroups() {
    if (groupsLoading) return;
    setGroupsLoading(true);
    setGroupsError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setGroups(await listGroups(token));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setGroupsError(
        exception instanceof Error ? exception.message : 'Não foi possível carregar seus grupos.',
      );
    } finally {
      setGroupsLoading(false);
    }
  }

  async function activateBiometricLogin() {
    if (biometricLoading) return;
    setBiometricMessage(null);
    setBiometricLoading(true);

    try {
      if (!(await isBiometricAvailable())) {
        setBiometricAvailable(false);
        setBiometricMessage('Não encontramos uma biometria cadastrada neste aparelho.');
        return;
      }

      if (!(await authenticateWithBiometrics())) {
        setBiometricMessage('Biometria não confirmada. A opção continua desativada.');
        return;
      }

      await enableBiometricLogin();
      setBiometricEnabled(true);
      setBiometricMessage('Login com biometria ativado.');
    } catch (exception) {
      setBiometricMessage(
        exception instanceof Error
          ? exception.message
          : 'Não foi possível ativar o login com biometria.',
      );
    } finally {
      setBiometricLoading(false);
    }
  }

  async function deactivateBiometricLogin() {
    await disableBiometricLogin();
    setBiometricEnabled(false);
    setBiometricMessage('Login com biometria desativado.');
  }

  async function logout() {
    await clearSession();
    router.replace('/');
  }

  if (!user && !error) {
    return (
      <ServerLoadingScreen
        title="Carregando o Onze..."
        message="Estamos preparando sua sessão."
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <YStack gap="$5" paddingVertical="$3">
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={18} fontWeight="900">
              ONZE
            </Text>
            {user ? (
              <>
                <Text color="$onzeInk" fontSize={30} fontWeight="800">
                  Olá, {user.displayName}
                </Text>
                <Text color="$onzeMuted" fontSize={15}>
                  Organize suas peladas em um só lugar.
                </Text>
              </>
            ) : (
              <>
                <Text color="$onzeInk" fontSize={26} fontWeight="800">
                  Não foi possível carregar sua sessão
                </Text>
                <Text color="$onzeMuted" fontSize={14}>
                  {error}
                </Text>
                <Button backgroundColor="$onzeGreen" onPress={() => void loadUser()}>
                  <Text color="$onzeSurface" fontWeight="800">
                    Tentar novamente
                  </Text>
                </Button>
              </>
            )}
          </YStack>

          {user ? (
            <YStack gap="$3">
              <XStack alignItems="center" justifyContent="space-between">
                <Text color="$onzeInk" fontSize={20} fontWeight="800">
                  Seus grupos
                </Text>
                <Button
                  backgroundColor="$onzeGreen"
                  size="$3"
                  onPress={() => router.push('/create-group')}
                >
                  <Text color="$onzeSurface" fontWeight="800">
                    + Criar grupo
                  </Text>
                </Button>
              </XStack>

              {groupsLoading ? (
                <Text color="$onzeMuted">Carregando grupos...</Text>
              ) : groupsError ? (
                <YStack
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderRadius="$5"
                  borderWidth={1}
                  gap="$3"
                  padding="$4"
                >
                  <Text color="$onzeDanger" fontSize={14}>
                    {groupsError}
                  </Text>
                  <Button onPress={() => void loadGroups()}>
                    <Text fontWeight="700">Tentar novamente</Text>
                  </Button>
                </YStack>
              ) : groups.length === 0 ? (
                <YStack
                  alignItems="center"
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderRadius="$6"
                  borderWidth={1}
                  gap="$3"
                  padding="$6"
                >
                  <Image
                    source={require('../assets/icon.png')}
                    style={{ width: 82, height: 82, borderRadius: 20 }}
                  />
                  <Text color="$onzeInk" fontSize={18} fontWeight="800" textAlign="center">
                    Crie sua primeira pelada
                  </Text>
                  <Text color="$onzeMuted" fontSize={14} lineHeight={20} textAlign="center">
                    Dê um nome ao grupo, configure os dias e depois convide seus jogadores.
                  </Text>
                  <Button
                    alignSelf="stretch"
                    backgroundColor="$onzeGreen"
                    height={50}
                    onPress={() => router.push('/create-group')}
                  >
                    <Text color="$onzeSurface" fontWeight="800">
                      Criar meu primeiro grupo
                    </Text>
                  </Button>
                </YStack>
              ) : (
                groups.map((group) => <GroupCard key={group.id} group={group} />)
              )}
            </YStack>
          ) : null}

          {user && biometricAvailable ? (
            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$5"
              borderWidth={1}
              gap="$2"
              padding="$4"
            >
              <Text color="$onzeInk" fontSize={16} fontWeight="800">
                Login com biometria
              </Text>
              <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                {biometricEnabled
                  ? 'Ativado neste aparelho. Na próxima abertura você poderá entrar com sua biometria.'
                  : 'Use a biometria cadastrada no aparelho para entrar sem digitar sua senha.'}
              </Text>
              <Button
                backgroundColor="$onzeSurface"
                borderColor="$onzeGreen"
                borderWidth={1}
                marginTop="$2"
                onPress={() =>
                  void (biometricEnabled ? deactivateBiometricLogin() : activateBiometricLogin())
                }
              >
                <Text color="$onzeGreen" fontWeight="700">
                  {biometricLoading
                    ? 'Validando...'
                    : biometricEnabled
                      ? 'Desativar biometria'
                      : 'Ativar login com biometria'}
                </Text>
              </Button>
              {biometricMessage ? (
                <Text color="$onzeMuted" fontSize={12}>
                  {biometricMessage}
                </Text>
              ) : null}
            </YStack>
          ) : null}

          {user ? (
            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderWidth={1}
              onPress={() => void logout()}
            >
              <Text color="$onzeInk" fontWeight="700">
                Sair
              </Text>
            </Button>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupCard({ group }: { group: Group }) {
  const scheduleLabel = group.schedules.length
    ? `${group.schedules.length} horário${group.schedules.length > 1 ? 's' : ''} configurado${group.schedules.length > 1 ? 's' : ''}`
    : 'Horários ainda não configurados';

  return (
    <XStack
      alignItems="center"
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderRadius="$5"
      borderWidth={1}
      gap="$3"
      padding="$4"
    >
      <Image
        source={group.photoUrl ? { uri: group.photoUrl } : require('../assets/icon.png')}
        style={{ width: 58, height: 58, borderRadius: 15 }}
      />
      <YStack flex={1} gap="$1">
        <Text color="$onzeInk" fontSize={17} fontWeight="800">
          {group.name}
        </Text>
        <Text color="$onzeMuted" fontSize={13} numberOfLines={1}>
          {group.city || group.venue || 'Local ainda não configurado'}
        </Text>
        <Text color="$onzeMuted" fontSize={12}>
          {scheduleLabel}
        </Text>
      </YStack>
      {group.role === 'ADMIN' ? (
        <Text color="$onzeGreen" fontSize={11} fontWeight="800">
          ADMIN
        </Text>
      ) : null}
    </XStack>
  );
}
