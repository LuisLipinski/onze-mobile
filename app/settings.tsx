import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Switch } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { BottomNavigation } from '../src/components/bottom-navigation';
import {
  clearSession,
  disableBiometricLogin,
  enableBiometricLogin,
  getStoredCurrentUser,
  isBiometricLoginEnabled,
  isBiometricLoginReady,
  lockSessionForBiometricLogin,
} from '../src/lib/auth-storage';
import { isBiometricAvailable } from '../src/lib/biometrics';

export default function SettingsScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingBiometric, setUpdatingBiometric] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, []),
  );

  async function loadSettings() {
    const [user, available, enabled] = await Promise.all([
      getStoredCurrentUser(),
      isBiometricAvailable().catch(() => false),
      isBiometricLoginEnabled(),
    ]);
    setDisplayName(user?.displayName ?? '');
    setBiometricAvailable(available);
    setBiometricEnabled(enabled);
  }

  async function onBiometricToggle(value: boolean) {
    if (updatingBiometric) return;
    setMessage(null);
    if (!value) {
      await disableBiometrics();
      return;
    }

    if (!biometricAvailable) {
      setMessage('Não encontramos biometria cadastrada neste aparelho.');
      return;
    }

    setUpdatingBiometric(true);
    try {
      await enableBiometricLogin();
      setBiometricEnabled(true);
      setMessage('Login com biometria ativado. Você continua conectado.');
    } catch {
      setMessage('Não foi possível ativar a biometria. Tente novamente.');
    } finally {
      setUpdatingBiometric(false);
    }
  }

  async function disableBiometrics() {
    setUpdatingBiometric(true);
    try {
      await disableBiometricLogin();
      setBiometricEnabled(false);
      setMessage('Login com biometria desativado neste aparelho.');
    } catch {
      setMessage('Não foi possível desativar a biometria. Tente novamente.');
    } finally {
      setUpdatingBiometric(false);
    }
  }

  async function logout() {
    if (await isBiometricLoginReady()) {
      await lockSessionForBiometricLogin();
    } else {
      await clearSession();
    }
    router.replace('/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <YStack flex={1}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
          <YStack gap="$5" paddingVertical="$3">
            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={14} fontWeight="900">CONFIGURAÇÕES</Text>
              <Text color="$onzeInk" fontSize={30} fontWeight="900">Sua conta</Text>
              {displayName ? (
                <Text color="$onzeMuted" fontSize={14}>Olá, {displayName}.</Text>
              ) : null}
            </YStack>

            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$4"
              padding="$5"
            >
              <XStack alignItems="center" gap="$4" justifyContent="space-between">
                <YStack flex={1} gap="$1">
                  <Text color="$onzeInk" fontSize={17} fontWeight="800">Login com biometria</Text>
                  <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                    {biometricEnabled
                      ? 'Ativado. Ele continuará ativo até você desligar esta chave.'
                      : 'Ative para usar a biometria nos próximos acessos sem sair da sua conta.'}
                  </Text>
                </YStack>
                <Switch
                  accessibilityLabel="Login com biometria"
                  disabled={updatingBiometric || (!biometricAvailable && !biometricEnabled)}
                  onValueChange={(value) => void onBiometricToggle(value)}
                  thumbColor="#FFFFFF"
                  trackColor={{ false: '#C9D2CC', true: '#148A4A' }}
                  value={biometricEnabled}
                />
              </XStack>

              {!biometricAvailable ? (
                <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                  Este aparelho não informou uma biometria disponível no momento.
                </Text>
              ) : null}

              {message ? (
                <Text color="$onzeGreen" fontSize={12} fontWeight="700" lineHeight={18}>
                  {message}
                </Text>
              ) : null}
            </YStack>

            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$3"
              padding="$5"
            >
              <Text color="$onzeInk" fontSize={17} fontWeight="800">Sessão</Text>
              <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                Com a biometria ativa, sair bloqueia o aplicativo, mantém seu e-mail preenchido e permite entrar novamente pela biometria.
              </Text>
              <Button
                backgroundColor="$onzeSurface"
                borderColor="$onzeDanger"
                borderWidth={1}
                height={48}
                onPress={() => void logout()}
              >
                <Text color="$onzeDanger" fontWeight="800">Sair da conta</Text>
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
        <BottomNavigation active="settings" />
      </YStack>
    </SafeAreaView>
  );
}
