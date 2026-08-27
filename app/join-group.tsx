import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Button, Input, Text, YStack } from 'tamagui';

import { ApiRequestError, joinGroup, JoinGroupResponse } from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

export default function JoinGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = typeof params.code === 'string' ? params.code.toUpperCase() : '';
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JoinGroupResponse | null>(null);

  useEffect(() => {
    if (typeof params.code === 'string') {
      setCode(params.code.toUpperCase());
    }
  }, [params.code]);

  async function submit() {
    if (loading) return;

    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length !== 8) {
      setError('Digite o código de convite com 8 caracteres.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace({ pathname: '/', params: { joinCode: normalizedCode } });
        return;
      }

      const response = await joinGroup(token, normalizedCode);
      setResult(response);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace({ pathname: '/', params: { joinCode: normalizedCode } });
        return;
      }

      setError(
        exception instanceof Error ? exception.message : 'Não foi possível entrar neste grupo.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
        <YStack flex={1} justifyContent="center" gap="$4" padding="$5">
          <Text color="$onzeGreen" fontSize={18} fontWeight="900">
            ONZE
          </Text>
          <YStack
            backgroundColor="$onzeSurface"
            borderColor="$onzeBorder"
            borderRadius="$6"
            borderWidth={1}
            gap="$3"
            padding="$5"
          >
            <Text color="$onzeInk" fontSize={27} fontWeight="800">
              {result.alreadyMember ? 'Você já faz parte do grupo' : 'Você entrou no grupo!'}
            </Text>
            <Text color="$onzeInk" fontSize={19} fontWeight="700">
              {result.groupName}
            </Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
              {result.alreadyMember
                ? 'Esse grupo já estava vinculado à sua conta.'
                : 'O grupo foi adicionado à sua conta. Agora ele aparecerá junto das suas peladas.'}
            </Text>
            <Button backgroundColor="$onzeGreen" height={50} onPress={() => router.replace('/home')}>
              <Text color="$onzeSurface" fontWeight="800">
                Ir para meus grupos
              </Text>
            </Button>
          </YStack>
        </YStack>
      </SafeAreaView>
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
          <YStack gap="$5">
            <YStack gap="$1">
              <Text color="$onzeGreen" fontSize={18} fontWeight="900">
                ONZE
              </Text>
              <Text color="$onzeInk" fontSize={30} fontWeight="800">
                Entrar em um grupo
              </Text>
              <Text color="$onzeMuted" fontSize={15} lineHeight={22}>
                Digite o código que o administrador da pelada compartilhou com você.
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
              <Input
                autoCapitalize="characters"
                autoCorrect={false}
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderRadius="$4"
                color="$onzeInk"
                fontSize={20}
                fontWeight="800"
                height={54}
                maxLength={8}
                onChangeText={(value) => setCode(value.toUpperCase())}
                onSubmitEditing={submit}
                placeholder="Ex.: A7K9M2Q4"
                placeholderTextColor="$onzeMuted"
                returnKeyType="done"
                textAlign="center"
                value={code}
              />

              {error ? (
                <Text color="$onzeDanger" fontSize={14}>
                  {error}
                </Text>
              ) : null}

              <Button
                backgroundColor="$onzeGreen"
                disabled={loading}
                height={52}
                onPress={() => void submit()}
              >
                <Text color="$onzeSurface" fontSize={16} fontWeight="800">
                  {loading ? 'Entrando...' : 'Entrar no grupo'}
                </Text>
              </Button>

              <Button
                backgroundColor="$onzeSurface"
                borderColor="$onzeBorder"
                borderWidth={1}
                onPress={() => router.replace('/home')}
              >
                <Text color="$onzeInk" fontWeight="700">
                  Voltar
                </Text>
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
