import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useStartupReadiness } from '../src/lib/startup-readiness';
import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';
import { BackButton } from '../src/components/back-button';
import { OnzeWordmark } from '../src/components/onze-wordmark';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, getCurrentUser, login } from '../src/lib/api';
import {
  clearSession,
  getAccessToken,
  getBiometricAccount,
  getLastLoginEmail,
  getStoredCurrentUser,
  saveSession,
} from '../src/lib/auth-storage';
import type { BiometricAccount } from '../src/lib/auth-storage';
import { isBiometricAvailable } from '../src/lib/biometrics';
import { BiometricSessionError, signInWithBiometrics, updateBiometricSessionAfterPassword } from '../src/lib/auth-session';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAccountInitials(displayName: string, email: string) {
  const accountName = displayName.trim() || email.split('@')[0] || 'ON';
  const parts = accountName.split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.[0] ?? 'O';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

export default function LoginScreen() {
  const markStartupReady = useStartupReadiness();
  const router = useRouter();
  const params = useLocalSearchParams<{
    registered?: string;
    passwordReset?: string;
    joinCode?: string;
    matchId?: string;
    destination?: string;
  }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [biometricCredential, setBiometricCredential] = useState<BiometricAccount | null>(null);
  const [biometricHardwareAvailable, setBiometricHardwareAvailable] = useState(false);
  const [passwordLoginMode, setPasswordLoginMode] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const biometricAccountMatchesEmail = Boolean(
    biometricCredential &&
      normalizeEmail(biometricCredential.email) === normalizeEmail(email),
  );
  const biometricLoginAvailable = Boolean(
    biometricHardwareAvailable && biometricAccountMatchesEmail && biometricCredential?.ready && !passwordLoginMode,
  );

  const goAfterAuthentication = useCallback(() => {
    if (typeof params.joinCode === 'string' && params.joinCode.trim()) {
      router.replace({
        pathname: '/join-group',
        params: { code: params.joinCode.trim().toUpperCase() },
      });
      return;
    }
    if (typeof params.matchId === 'string' && params.matchId.trim()) {
      router.replace({
        pathname: params.destination === 'live' ? '/live-match' : '/match',
        params: { matchId: params.matchId.trim() },
      });
      return;
    }
    router.replace('/home');
  }, [params.joinCode, params.matchId, params.destination, router]);

  const restoreSession = useCallback(async () => {
    try {
      const [token, lastLoginEmail, storedUser, credential, biometricAvailable] = await Promise.all([
        getAccessToken(),
        getLastLoginEmail(),
        getStoredCurrentUser(),
        getBiometricAccount(),
        isBiometricAvailable().catch(() => false),
      ]);
      const initialEmail = storedUser?.email ?? lastLoginEmail ?? credential?.email ?? '';
      setEmail(initialEmail);
      setBiometricCredential(credential);
      setBiometricHardwareAvailable(biometricAvailable);
      if (credential && !credential.ready && normalizeEmail(initialEmail) === normalizeEmail(credential.email)) {
        setPasswordLoginMode(true);
      }

      if (!token) return;

      const sessionBelongsToBiometricAccount = Boolean(
        credential && normalizeEmail(initialEmail) === normalizeEmail(credential.email),
      );
      if (sessionBelongsToBiometricAccount && biometricAvailable) return;

      if (sessionBelongsToBiometricAccount && !biometricAvailable) {
        await clearSession();
        setPasswordLoginMode(true);
        setError('A biometria não está disponível neste aparelho. Entre novamente com e-mail e senha.');
        return;
      }

      const user = await getCurrentUser(token);
      await saveSession(token, user);
      goAfterAuthentication();
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
      } else {
        setError(
          getErrorMessage(exception, 'Não foi possível restaurar sua sessão. Tente entrar novamente.'),
        );
      }
    } finally {
      setRestoringSession(false);
      markStartupReady();
    }
  }, [goAfterAuthentication, markStartupReady]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  async function submit() {
    if (loading || biometricLoading) return;
    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      await saveSession(response.accessToken, response.user, response.refreshToken);
      await updateBiometricSessionAfterPassword(response);
      goAfterAuthentication();
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível entrar.'));
      setLoading(false);
    }
  }

  async function submitBiometricLogin() {
    if (biometricLoading) return;
    setError(null);
    setBiometricLoading(true);

    try {
      const credential = biometricCredential;
      if (
        !credential ||
        passwordLoginMode ||
        normalizeEmail(credential.email) !== normalizeEmail(email)
      ) {
        setError('A biometria só pode entrar na conta à qual foi vinculada. Use sua senha para outra conta.');
        return;
      }

      const user = await signInWithBiometrics(credential.email);
      if (!user) {
        setPasswordLoginMode(true);
        setError('Biometria não confirmada. Você também pode entrar com e-mail e senha.');
        return;
      }

      goAfterAuthentication();
    } catch (exception) {
      if (exception instanceof BiometricSessionError) {
        setPasswordLoginMode(exception.requiresPassword);
        setBiometricCredential(await getBiometricAccount().catch(() => null));
        if (exception.reason === 'unavailable') setBiometricHardwareAvailable(false);
      }
      setError(
        getErrorMessage(exception, 'Não foi possível conectar agora. Tente novamente com sua digital.'),
      );
    } finally {
      setBiometricLoading(false);
    }
  }

  function showPasswordLogin(clearAccount: boolean) {
    setError(null);
    setPassword('');
    setPasswordLoginMode(true);
    if (clearAccount) setEmail('');
  }

  function useBiometricAccount() {
    if (!biometricCredential) return;
    setError(null);
    setPassword('');
    setEmail(biometricCredential.email);
    setPasswordLoginMode(false);
  }

  if (restoringSession) {
    return (
      <ServerLoadingScreen
        title="Carregando sua sessão..."
        message="Estamos validando seu acesso com o servidor."
      />
    );
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Conectando ao Onze..."
        message="Assim que a API confirmar o login, você entra no aplicativo."
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {!biometricLoginAvailable && biometricCredential?.ready && biometricHardwareAvailable ? (
          <BackButton
            alignSelf="flex-start"
            marginHorizontal={20}
            marginTop={12}
            accessibilityLabel={`Voltar para ${biometricCredential.displayName || biometricCredential.email}`}
            onPress={useBiometricAccount}
          />
        ) : null}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 20,
          }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$7" backgroundColor="$onzeCanvas">
            <OnzeWordmark align="center" size="lg" subtitle />

            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$4"
              padding="$5"
            >
              <YStack gap="$1">
                <Text color="$onzeInk" fontSize={28} fontWeight="800">
                  Entrar
                </Text>
                <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                  {params.joinCode
                    ? 'Entre na sua conta para aceitar o convite da pelada.'
                    : 'Entre para organizar seu próximo jogo.'}
                </Text>
              </YStack>

              {params.registered === '1' ? (
                <Text color="$onzeGreen" fontSize={14} fontWeight="700">
                  Conta criada com sucesso. Faça login para continuar.
                </Text>
              ) : null}

              {params.passwordReset === '1' ? (
                <Text color="$onzeGreen" fontSize={14} fontWeight="700">
                  Senha alterada com sucesso. Entre com sua nova senha.
                </Text>
              ) : null}

              {error ? (
                <Text color="$onzeDanger" fontSize={14}>
                  {error}
                </Text>
              ) : null}

              {biometricLoginAvailable ? (
                <YStack gap="$3">
                  <AppButton
                    accessibilityHint="Solicita sua biometria para entrar nesta conta"
                    accessibilityLabel={`Entrar como ${biometricCredential?.displayName || biometricCredential?.email}`}
                    backgroundColor="$onzeCanvas"
                    borderColor="$onzeGreen"
                    borderRadius="$5"
                    borderWidth={1}
                    disabled={biometricLoading}
                    height="auto"
                    minHeight={96}
                    onPress={submitBiometricLogin}
                    padding="$4"
                    pressStyle={{ backgroundColor: '$onzeSurface' }}
                  >
                    <XStack alignItems="center" gap="$3" width="100%">
                      <YStack
                        alignItems="center"
                        backgroundColor="$onzeGreen"
                        borderRadius={999}
                        height={52}
                        justifyContent="center"
                        width={52}
                      >
                        <Text color="$onzeSurface" fontSize={17} fontWeight="900">
                          {getAccountInitials(
                            biometricCredential?.displayName ?? '',
                            biometricCredential?.email ?? '',
                          )}
                        </Text>
                      </YStack>
                      <YStack alignItems="flex-start" flex={1} gap="$1">
                        <Text color="$onzeInk" fontSize={17} fontWeight="900" numberOfLines={1}>
                          {biometricCredential?.displayName || 'Conta salva'}
                        </Text>
                        <Text color="$onzeMuted" fontSize={13} numberOfLines={1}>
                          {biometricCredential?.email}
                        </Text>
                        <Text color="$onzeGreen" fontSize={12} fontWeight="700">
                          {biometricLoading
                            ? 'Validando sua biometria...'
                            : 'Toque para entrar com biometria'}
                        </Text>
                      </YStack>
                      <Text color="$onzeGreen" fontSize={24} fontWeight="800">›</Text>
                    </XStack>
                  </AppButton>
                  <AppButton
                    variant="secondary"

                    borderRadius="$4"

                    buttonSize="sm"
                    onPress={() => showPasswordLogin(false)}
                  >
                    <Text color="$onzeInk" fontSize={14} fontWeight="800">
                      Entrar com senha
                    </Text>
                  </AppButton>
                  <AppButton
                    variant="ghost"
                    buttonSize="sm"
                    onPress={() => showPasswordLogin(true)}
                  >
                    <Text color="$onzeGreen" fontSize={14} fontWeight="800">
                      Entrar com outra conta
                    </Text>
                  </AppButton>
                </YStack>
              ) : (
                <>

                  <Input
                    autoCapitalize="none"
                    autoComplete="email"
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeBorder"
                    borderRadius="$4"
                    color="$onzeInk"
                    focusStyle={{ borderColor: '$onzeGreen' }}
                    height={52}
                    keyboardType="email-address"
                    onChangeText={(value) => {
                      setEmail(value);
                      setError(null);
                    }}
                    placeholder="E-mail"
                    placeholderTextColor="$onzeMuted"
                    returnKeyType="next"
                    value={email}
                  />
                  <Input
                    autoComplete="password"
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeBorder"
                    borderRadius="$4"
                    color="$onzeInk"
                    focusStyle={{ borderColor: '$onzeGreen' }}
                    height={52}
                    onChangeText={setPassword}
                    onSubmitEditing={submit}
                    placeholder="Senha"
                    placeholderTextColor="$onzeMuted"
                    returnKeyType="done"
                    secureTextEntry
                    value={password}
                  />

                  <Text color="$onzeMuted" fontSize={14} textAlign="right">
                    <Link href="/forgot-password" style={{ color: ONZE_COLORS.green, fontWeight: '700' }}>
                      Esqueci minha senha
                    </Link>
                  </Text>

                  <AppButton
                    variant="primary"
                    borderRadius="$4"

                    onPress={submit}
                    pressStyle={{ backgroundColor: '$onzeGreenPress' }}
                  >
                    <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                      Entrar
                    </Text>
                  </AppButton>

                  <Text color="$onzeMuted" fontSize={14} textAlign="center">
                    Ainda não tem conta?{' '}
                    <Link
                      href={
                        { pathname: '/register', params: {
                          ...(params.joinCode ? { joinCode: params.joinCode } : {}),
                          ...(params.matchId ? { matchId: params.matchId } : {}),
                          ...(params.destination ? { destination: params.destination } : {}),
                        } }
                      }
                      style={{ color: ONZE_COLORS.green, fontWeight: '700' }}
                    >
                      Criar conta
                    </Link>
                  </Text>
                </>
              )}
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
