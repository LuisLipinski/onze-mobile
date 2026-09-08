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
import { confirmPasswordReset, requestPasswordReset } from '../src/lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit() {
    if (loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await confirmPasswordReset(email, code, newPassword);
      router.replace({ pathname: '/', params: { passwordReset: '1' } });
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : 'Não foi possível alterar sua senha.',
      );
      setLoading(false);
    }
  }

  async function resend() {
    if (resending) return;
    setError(null);
    setMessage(null);
    setResending(true);

    try {
      await requestPasswordReset(email);
      setMessage('Se o reenvio estiver liberado, um novo código será enviado para seu e-mail.');
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : 'Não foi possível solicitar outro código.',
      );
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Alterando sua senha..."
        message="Estamos validando o código com o servidor."
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
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
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
                Criar nova senha
              </Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                Digite o código recebido por e-mail e escolha sua nova senha.
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
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$4"
              color="$onzeInk"
              focusStyle={{ borderColor: '$onzeGreen' }}
              height={52}
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
              placeholder="Código de 6 dígitos"
              placeholderTextColor="$onzeMuted"
              value={code}
            />

            <Input
              autoComplete="new-password"
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$4"
              color="$onzeInk"
              focusStyle={{ borderColor: '$onzeGreen' }}
              height={52}
              onChangeText={setNewPassword}
              onSubmitEditing={submit}
              placeholder="Nova senha (mínimo 8 caracteres)"
              placeholderTextColor="$onzeMuted"
              returnKeyType="done"
              secureTextEntry
              value={newPassword}
            />

            {message ? (
              <Text color="$onzeGreen" fontSize={14}>
                {message}
              </Text>
            ) : null}

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
                Alterar senha
              </Text>
            </Button>

            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$4"
              borderWidth={1}
              disabled={resending}
              height={48}
              onPress={resend}
            >
              <Text color="$onzeInk" fontSize={14} fontWeight="700">
                {resending ? 'Solicitando...' : 'Reenviar código'}
              </Text>
            </Button>

            <Text color="$onzeMuted" fontSize={14} textAlign="center">
              <Link href="/" style={{ color: '#148A4A', fontWeight: '700' }}>
                Voltar para o login
              </Link>
            </Text>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
