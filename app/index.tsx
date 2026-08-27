import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { Button, Input, Text, YStack } from 'tamagui';

import { ApiRequestError, getCurrentUser, login } from '../src/lib/api';
import { clearAccessToken, getAccessToken, saveAccessToken } from '../src/lib/auth-storage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);

  useEffect(() => {
    void restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await getAccessToken();
      if (!token) return;

      await getCurrentUser(token);
      router.replace('/home');
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearAccessToken();
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
      await saveAccessToken(response.accessToken);
      router.replace('/home');
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  if (restoringSession) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator color="#148A4A" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <YStack flex={1} justifyContent="center" padding="$5" gap="$7" backgroundColor="$onzeCanvas">
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
            <Text color="$onzeMuted" fontSize={14}>
              Entre para organizar sua próxima partida.
            </Text>
          </YStack>

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
            placeholder="Senha"
            placeholderTextColor="$onzeMuted"
            secureTextEntry
            value={password}
          />

          {error ? (
            <Text color="$onzeDanger" fontSize={14}>
              {error}
            </Text>
          ) : null}

          <Button
            backgroundColor="$onzeGreen"
            borderRadius="$4"
            disabled={loading}
            height={52}
            onPress={submit}
            pressStyle={{ backgroundColor: '$onzeGreenPress' }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                Entrar
              </Text>
            )}
          </Button>

          <Text color="$onzeMuted" fontSize={14} textAlign="center">
            Ainda não tem conta?{' '}
            <Link href="/register" style={{ color: '#148A4A', fontWeight: '700' }}>
              Criar conta
            </Link>
          </Text>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
