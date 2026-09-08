import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, getCurrentUser, login } from '../src/lib/api';
import {
  clearSession,
  disableBiometricLogin,
  getAccessToken,
  getBiometricCredential,
  getLastLoginEmail,
  getStoredCurrentUser,
  refreshBiometricCredentialAfterPassword,
  saveBiometricAccountProfile,
  saveSession,
} from '../src/lib/auth-storage';
import type { BiometricCredential } from '../src/lib/auth-storage';
import { authenticateWithBiometrics, isBiometricAvailable } from '../src/lib/biometrics';

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
  const router = useRouter();
  const params = useLocalSearchParams<{
    registered?: string;
    passwordReset?: string;
    joinCode?: string;
    matchId?: string;
  }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [biometricCredential, setBiometricCredential] = useState<BiometricCredential | null>(null);
  const [biometricHardwareAvailable, setBiometricHardwareAvailable] = useState(false);
  const [passwordLoginMode, setPasswordLoginMode] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const biometricAccountMatchesEmail = Boolean(
    biometricCredential &&
      normalizeEmail(biometricCredential.email) === normalizeEmail(email),
  );
  const biometricLoginAvailable = Boolean(
    biometricHardwareAvailable && biometricAccountMatchesEmail && !passwordLoginMode,
  );

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    const credential = biometricCredential;
    if (!credential || credential.displayName) return;

    let active = true;
    void (async () => {
      try {
        const user = await getCurrentUser(credential.accessToken);
        if (normalizeEmail(user.email) !== normalizeEmail(credential.email)) return;

        const updatedCredential = await saveBiometricAccountProfile(user);
        if (active && updatedCredential) setBiometricCredential(updatedCredential);
      } catch {
        // A conta continua disponível; o nome será atualizado no próximo login válido.
      }
    })();

    return () => {
      active = false;
    };
  }, [biometricCredential?.accessToken, biometricCredential?.displayName]);

  function goAfterAuthentication() {
    if (typeof params.joinCode === 'string' && params.joinCode.trim()) {
      router.replace({
        pathname: '/join-group',
        params: { code: params.joinCode.trim().toUpperCase() },
      });
      return;
    }
    if (typeof params.matchId === 'string' && params.matchId.trim()) {
      router.replace({
        pathname: '/match',
        params: { matchId: params.matchId.trim() },
      });
      return;
    }
    router.replace('/home');
  }

  async function restoreSession() {
    try {
      const [token, lastLoginEmail, storedUser, credential, biometricAvailable] = await Promise.all([
        getAccessToken(),
        getLastLoginEmail(),
        getStoredCurrentUser(),
        getBiometricCredential(),
        isBiometricAvailable().catch(() => false),
      ]);
      const initialEmail = storedUser?.email ?? lastLoginEmail ?? credential?.email ?? '';
      setEmail(initialEmail);
      setBiometricCredential(credential);
      setBiometricHardwareAvailable(biometricAvailable);

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
          exception instanceof Error
            ? exception.message
            : 'Não foi possível restaurar sua sessão. Tente entrar novamente.',
        );
      }
    } finally {
      setRestoringSession(false);
    }
  }

  async function submit() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      await saveSession(response.accessToken, response.user);
      await refreshBiometricCredentialAfterPassword(response.accessToken, response.user);
      goAfterAuthentication();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível entrar.');
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

      if (!(await isBiometricAvailable())) {
        await clearSession();
        setBiometricHardwareAvailable(false);
        setPasswordLoginMode(true);
        setError('A biometria não está disponível. Entre com e-mail e senha.');
        return;
      }

      const authenticated = await authenticateWithBiometrics();
      if (!authenticated) {
        setPasswordLoginMode(true);
        setError('Biometria não confirmada. Você também pode entrar com e-mail e senha.');
        return;
      }

      const user = await getCurrentUser(credential.accessToken);
      if (normalizeEmail(user.email) !== normalizeEmail(credential.email)) {
        await Promise.all([disableBiometricLogin(), clearSession()]);
        setBiometricCredential(null);
        setPasswordLoginMode(true);
        setError('O vínculo da biometria não corresponde a esta conta. Entre novamente com sua senha.');
        return;
      }

      await saveSession(credential.accessToken, user);
      await saveBiometricAccountProfile(user);
      goAfterAuthentication();
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        setPasswordLoginMode(true);
        setError('Sua sessão expirou. Entre novamente com e-mail e senha.');
        return;
      }

      setPasswordLoginMode(true);
      setError(
        exception instanceof Error
          ? exception.message
          : 'Não foi possível entrar com biometria. Use e-mail e senha.',
      );
    } finally {
      setBiometricLoading(false);
    }
  }

  function usePasswordLogin(clearAccount: boolean) {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
            <YStack alignItems="center" gap="$2">
              <Text color="$onzeGreen" fontSize={44} fontWeight="900" letterSpacing={2}>
                ONZE
              </Text>
              <Text color="$onzeMuted" fontSize={16} fontWeight="600">
                Organizador de Pelada
              </Text>
            </YStack>

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
                    : 'Entre para organizar sua próxima partida.'}
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

              {biometricLoginAvailable ? (
                <YStack gap="$3">
                  <Button
                    accessibilityHint="Solicita sua digital para entrar nesta conta"
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
                            ? 'Validando sua digital...'
                            : 'Toque para entrar com sua digital'}
                        </Text>
                      </YStack>
                      <Text color="$onzeGreen" fontSize={24} fontWeight="800">›</Text>
                    </XStack>
                  </Button>
                  <Button
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeBorder"
                    borderRadius="$4"
                    borderWidth={1}
                    height={46}
                    onPress={() => usePasswordLogin(false)}
                  >
                    <Text color="$onzeInk" fontSize={14} fontWeight="800">
                      Entrar com senha
                    </Text>
                  </Button>
                  <Button
                    backgroundColor="transparent"
                    height={42}
                    onPress={() => usePasswordLogin(true)}
                  >
                    <Text color="$onzeGreen" fontSize={14} fontWeight="800">
                      Entrar com outra conta
                    </Text>
                  </Button>
                </YStack>
              ) : (
                <>
                  {biometricCredential && biometricHardwareAvailable ? (
                    <Button backgroundColor="transparent" height={40} onPress={useBiometricAccount}>
                      <Text color="$onzeGreen" fontSize={13} fontWeight="700">
                        Voltar para {biometricCredential.displayName || biometricCredential.email}
                      </Text>
                    </Button>
                  ) : null}

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
                    <Link href="/forgot-password" style={{ color: '#148A4A', fontWeight: '700' }}>
                      Esqueci minha senha
                    </Link>
                  </Text>

                  {error ? (
                    <Text color="$onzeDanger" fontSize={14}>
                      {error}
                    </Text>
                  ) : null}

                  <Button
                    backgroundColor="$onzeGreen"
                    borderRadius="$4"
                    height={52}
                    onPress={submit}
                    pressStyle={{ backgroundColor: '$onzeGreenPress' }}
                  >
                    <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                      Entrar
                    </Text>
                  </Button>

                  <Text color="$onzeMuted" fontSize={14} textAlign="center">
                    Ainda não tem conta?{' '}
                    <Link
                      href={
                        params.joinCode
                          ? { pathname: '/register', params: { joinCode: params.joinCode } }
                          : '/register'
                      }
                      style={{ color: '#148A4A', fontWeight: '700' }}
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
