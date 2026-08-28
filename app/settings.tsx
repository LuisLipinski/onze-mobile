import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Switch } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { BottomNavigation } from '../src/components/bottom-navigation';
import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import {
  clearSession,
  disableBiometricLogin,
  enableBiometricLogin,
  getStoredCurrentUser,
  isBiometricLoginEnabled,
} from '../src/lib/auth-storage';
import { isBiometricAvailable } from '../src/lib/biometrics';

export default function SettingsScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [saving, setSaving] = useState(false);

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

  function onBiometricToggle(value: boolean) {
    setMessage(null);
    if (!value) {
      void disableBiometrics();
      return;
    }

    if (!biometricAvailable) {
      setMessage('Não encontramos biometria cadastrada neste aparelho.');
      return;
    }

    setShowEnableModal(true);
  }

  async function disableBiometrics() {
    await disableBiometricLogin();
    setBiometricEnabled(false);
    setMessage('Login com biometria desativado neste aparelho.');
  }

  async function startBiometricSetup() {
    if (saving) return;
    setSaving(true);
    try {
      await enableBiometricLogin();
      setBiometricEnabled(true);
      setShowEnableModal(false);
      await clearSession();
      router.replace({ pathname: '/', params: { biometricSetup: '1' } });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await clearSession();
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
                      : 'Ative e confirme sua senha uma vez para usar a biometria nos próximos acessos.'}
                  </Text>
                </YStack>
                <Switch
                  accessibilityLabel="Login com biometria"
                  disabled={!biometricAvailable && !biometricEnabled}
                  onValueChange={onBiometricToggle}
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
                Sair remove sua sessão atual, mas não desativa sua preferência de biometria.
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

      <ConfirmActionModal
        visible={showEnableModal}
        title="Ativar login com biometria?"
        message="Para proteger sua conta, vamos pedir sua senha uma única vez agora. Depois disso, a biometria continuará disponível até você desligar esta opção em Configurações."
        confirmLabel="Continuar"
        loading={saving}
        onCancel={() => setShowEnableModal(false)}
        onConfirm={() => void startBiometricSetup()}
      />
    </SafeAreaView>
  );
}
