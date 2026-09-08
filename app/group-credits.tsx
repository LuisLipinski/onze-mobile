import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  listGroupCredits,
  PlayerCredit,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import { formatCurrency } from '../src/lib/payment';

export default function GroupCreditsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId?: string;
    groupName?: string;
    canManage?: string;
  }>();
  const [credits, setCredits] = useState<PlayerCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManage = params.canManage === 'true';

  useFocusEffect(
    useCallback(() => {
      void loadCredits();
    }, [params.groupId]),
  );

  async function loadCredits() {
    if (!params.groupId) {
      setError('Não foi possível identificar o grupo.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setCredits(await listGroupCredits(token, params.groupId));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar os créditos.');
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else if (params.groupId) router.replace({ pathname: '/group', params: { groupId: params.groupId } });
    else router.replace('/groups');
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando créditos..." message="Conferindo os saldos dos jogadores." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={goBack}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </Button>

          <YStack gap="$2">
            <Text color="$onzeMuted" fontSize={12} fontWeight="900">
              {(params.groupName ?? 'GRUPO').toUpperCase()}
            </Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">
              {canManage ? 'Créditos dos jogadores' : 'Meu crédito'}
            </Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
              O saldo é reservado automaticamente no próximo jogo pago. Ele só é consumido quando a presença é confirmada.
            </Text>
          </YStack>

          {error ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$5" borderWidth={1} gap="$3" padding="$4">
              <Text color="$onzeDanger" fontSize={13}>{error}</Text>
              <Button backgroundColor="$onzeGreen" onPress={() => void loadCredits()}>
                <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
              </Button>
            </YStack>
          ) : null}

          {!error && !credits.length ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$2" padding="$5">
              <Text color="$onzeInk" fontSize={17} fontWeight="900">Nenhum crédito ativo</Text>
              <Text color="$onzeMuted" fontSize={13} lineHeight={20}>
                Quando um pagamento for mantido para a próxima partida, ele aparecerá aqui.
              </Text>
            </YStack>
          ) : null}

          {credits.map((credit) => (
            <YStack
              key={credit.userId}
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$6"
              borderWidth={1}
              gap="$4"
              padding="$5"
            >
              <XStack alignItems="center" justifyContent="space-between" gap="$3">
                <YStack flex={1} gap="$1">
                  <Text color="$onzeInk" fontSize={17} fontWeight="900">{credit.displayName}</Text>
                  {credit.currentUser ? (
                    <Text color="$onzeGreen" fontSize={11} fontWeight="900">SEU SALDO</Text>
                  ) : null}
                </YStack>
                {credit.availableAmount > 0 ? (
                  <Text color="$onzeGreen" fontSize={18} fontWeight="900">
                    {formatCurrency(credit.availableAmount)}
                  </Text>
                ) : null}
              </XStack>

              {credit.availableAmount > 0 ? (
                <CreditStatusRow
                  label="Disponível"
                  detail="Será reservado na próxima partida paga deste grupo."
                  color="$onzeGreen"
                />
              ) : null}

              {credit.allocatedAmount > 0 ? (
                <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$3" padding="$4">
                  <XStack alignItems="center" justifyContent="space-between" gap="$3">
                    <Text color="$onzeInk" fontSize={13} fontWeight="900">
                      {credit.allocationStatus === 'APPLIED' ? 'PAGO COM CRÉDITO' : 'CRÉDITO RESERVADO'}
                    </Text>
                    <Text color="$onzeGreen" fontSize={14} fontWeight="900">
                      {formatCurrency(credit.allocatedAmount)}
                    </Text>
                  </XStack>
                  <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                    {credit.allocationStatus === 'APPLIED'
                      ? 'A presença foi confirmada e o valor já quitou esta partida.'
                      : 'Aguardando a resposta de presença. Se a pessoa não for, o saldo será liberado novamente.'}
                  </Text>
                  {credit.allocatedMatchId ? (
                    <Button
                      backgroundColor="$onzeSurface"
                      borderColor="$onzeGreen"
                      borderWidth={1}
                      onPress={() => router.push({
                        pathname: '/match',
                        params: { matchId: credit.allocatedMatchId ?? '' },
                      })}
                    >
                      <Text color="$onzeGreen" fontWeight="900">Ver partida</Text>
                    </Button>
                  ) : null}
                </YStack>
              ) : null}
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function CreditStatusRow({
  label,
  detail,
  color,
}: {
  label: string;
  detail: string;
  color: '$onzeGreen';
}) {
  return (
    <YStack gap="$1">
      <Text color={color} fontSize={12} fontWeight="900">{label.toUpperCase()}</Text>
      <Text color="$onzeMuted" fontSize={12} lineHeight={18}>{detail}</Text>
    </YStack>
  );
}
