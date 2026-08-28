import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Button, Input, Text, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { ApiRequestError, getCurrentUser, login } from '../src/lib/api';
import {
  clearSession,
  confirmBiometricLoginAfterPassword,
  getAccessToken,
  getLastLoginEmail,
  isBiometricLoginReady,
  saveCurrentUser,
  saveSession,
} from '../src/lib/auth-storage';
import { authenticateWithBiometrics, isBiometricAvailable } from '../src/lib/biometrics';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    registered?: string;
    passwordReset?: string;
    joinCode?: string;
  }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [biometricLoginAvailable, setBiometricLoginAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    void restoreSession();
  }, []);

  function goAfterAuthentication() {
    if (typeof params.joinCode === 'string' && params.joinCode.trim()) {
      router.replace({
        pathname: '/join-group',
        params: { code: params.joinCode.trim().toUpperCase() },
      });
      return;
    }
    router.replace('/home');
  }

  async function restoreSession() {
    try {
      const [token, lastLoginEmail] = await Promise.all([
        getAccessToken(),
        getLastLoginEmail(),
      ]);
      if (lastLoginEmail) {
        setEmail(lastLoginEmail);
      }
      if (!token) return;

      if (await isBiometricLoginReady()) {
        if (await isBiometricAvailable()) {
          setBiometricLoginAvailable(true);
          return;
        }

        await clearSession();
        setError('A biometria não está disponível neste aparelho. Entre novamente com e-mail e senha.');
        return;
      }

      const user = await getCurrentUser(token);
      await saveCurrentUser(user);
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
      await confirmBiometricLoginAfterPassword();
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
      if (!(await isBiometricAvailable())) {
        await clearSession();
        setBiometricLoginAvailable(false);
        setError('A biometria não está disponível. Entre com e-mail e senha.');
        return;
      }

      const authenticated = await authenticateWithBiometrics();
      if (!authenticated) {
        setError('Biometria não confirmada. Você também pode entrar com e-mail e senha.');
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        await clearSession();
        setBiometricLoginAvailable(false);
        setError('Sua sessão expirou. Entre novamente com e-mail e senha.');
        return;
      }

      const user = await getCurrentUser(token);
      await saveCurrentUser(user);
      goAfterAuthentication();
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        setBiometricLoginAvailable(false);
        setError('Sua sessão expirou. Entre novamente com e-mail e senha.');
        return;
      }

      setError(
        exception instanceof Error
          ? exception.message
          : 'Não foi possível entrar com biometria. Use e-mail e senha.',
      );
    } finally {
      setBiometricLoading(false);
    }
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
                <Button
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeGreen"
                  borderRadius="$4"
                  borderWidth={1}
                  disabled={biometricLoading}
                  height={52}
                  onPress={submitBiometricLogin}
                >
                  <Text color="$onzeGreen" fontSize={16} fontWeight="800">
                    {biometricLoading ? 'Validando biometria...' : 'Entrar com biometria'}
                  </Text>
                </Button>
              ) : null}

              {biometricLoginAvailable ? (
                <Text color="$onzeMuted" fontSize={13} textAlign="center">
                  ou entre com e-mail e senha
                </Text>
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
                onChangeText={setEmail}
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
                onFocus={() => {
                  if (biometricLoginAvailable && !biometricLoading) {
                    void submitBiometricLogin();
                  }
                }}
                onSubmitEditing={submit}
                placeholder={biometricLoginAvailable ? 'Toque para entrar com biometria' : 'Senha'}
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
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
