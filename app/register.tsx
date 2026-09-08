import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Button, Input, Text, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { register } from '../src/lib/api';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ joinCode?: string }>();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      await register(displayName, email, password);
      router.replace({
        pathname: '/',
        params: {
          registered: '1',
          ...(params.joinCode ? { joinCode: params.joinCode } : {}),
        },
      });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível criar a conta.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Criando sua conta..."
        message="Assim que a API confirmar o cadastro, você volta automaticamente para o login."
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
          <YStack backgroundColor="$onzeCanvas">
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
                  Criar conta
                </Text>
                <Text color="$onzeMuted" fontSize={14}>
                  {params.joinCode
                    ? 'Crie seu acesso para aceitar o convite da pelada.'
                    : 'Crie seu acesso para começar a organizar suas partidas.'}
                </Text>
              </YStack>

              <Input
                autoCapitalize="words"
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderRadius="$4"
                color="$onzeInk"
                focusStyle={{ borderColor: '$onzeGreen' }}
                height={52}
                onChangeText={setDisplayName}
                placeholder="Seu nome"
                placeholderTextColor="$onzeMuted"
                returnKeyType="next"
                value={displayName}
              />
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
                autoComplete="new-password"
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderRadius="$4"
                color="$onzeInk"
                focusStyle={{ borderColor: '$onzeGreen' }}
                height={52}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder="Senha (mínimo 8 caracteres)"
                placeholderTextColor="$onzeMuted"
                returnKeyType="done"
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
                height={52}
                onPress={submit}
                pressStyle={{ backgroundColor: '$onzeGreenPress' }}
              >
                <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                  Criar conta
                </Text>
              </Button>

              <Text color="$onzeMuted" fontSize={14} textAlign="center">
                Já tem conta?{' '}
                <Link
                  href={
                    params.joinCode
                      ? { pathname: '/', params: { joinCode: params.joinCode } }
                      : '/'
                  }
                  style={{ color: '#148A4A', fontWeight: '700' }}
                >
                  Entrar
                </Link>
              </Text>
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
