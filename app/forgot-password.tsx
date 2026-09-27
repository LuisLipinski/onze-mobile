import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Input, Text, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { requestPasswordReset } from '../src/lib/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset(email);
      router.push({ pathname: '/reset-password', params: { email: email.trim() } });
    } catch (exception) {
      setError(
        getErrorMessage(exception, 'Não foi possível solicitar a recuperação de senha.'),
      );
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Solicitando recuperação..."
        message="Estamos conectando ao servidor para solicitar seu código."
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
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
                Esqueci minha senha
              </Text>
              <Text color="$onzeMuted" fontSize={14} lineHeight={20}>
                Informe seu e-mail. Se existir uma conta, enviaremos um código de 6 dígitos.
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
              onSubmitEditing={submit}
              placeholder="E-mail"
              placeholderTextColor="$onzeMuted"
              returnKeyType="done"
              value={email}
            />

            {error ? (
              <Text color="$onzeDanger" fontSize={14}>
                {error}
              </Text>
            ) : null}

            <AppButton
              variant="primary"
              borderRadius="$4"

              onPress={submit}
              pressStyle={{ backgroundColor: '$onzeGreenPress' }}
            >
              <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                Enviar código
              </Text>
            </AppButton>

            <Text color="$onzeMuted" fontSize={14} textAlign="center">
              <Link href="/" style={{ color: ONZE_COLORS.green, fontWeight: '700' }}>
                Voltar para o login
              </Link>
            </Text>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
