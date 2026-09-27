import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '../src/components/app-button';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { StatisticsMatchCard } from '../src/components/statistics-match-card';
import {
  ApiRequestError,
  getGroupPlayerStatistics,
  PlayerStatistics,
  StatisticsTotals,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import { getErrorMessage } from '../src/lib/errors';
import { ONZE_COLORS } from '../src/theme/colors';

export default function PlayerStatisticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    groupId?: string;
    groupName?: string;
    userId?: string;
    displayName?: string;
  }>();
  const [statistics, setStatistics] = useState<PlayerStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void loadStatistics();
  }, [params.groupId, params.userId]));

  async function loadStatistics() {
    if (!params.groupId || !params.userId) {
      setError('Não foi possível identificar o jogador.');
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
      setStatistics(await getGroupPlayerStatistics(token, params.groupId, params.userId));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(getErrorMessage(exception, 'Não foi possível carregar o histórico do jogador.'));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else if (params.groupId) {
      router.replace({
        pathname: '/group-statistics',
        params: { groupId: params.groupId, groupName: params.groupName ?? '' },
      });
    } else router.replace('/groups');
  }

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Carregando jogador..."
        message="Reunindo os resultados, gols e assistências."
      />
    );
  }

  const playerName = statistics?.player.displayName ?? params.displayName ?? 'Jogador';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <AppButton alignSelf="flex-start" variant="ghost" onPress={goBack}>
            <Text color="$onzeGreen" fontWeight="800">← Estatísticas</Text>
          </AppButton>

          <YStack gap="$2">
            <Text color="$onzeMuted" fontSize={12} fontWeight="900">
              {(params.groupName ?? 'GRUPO').toUpperCase()}
            </Text>
            <Text color="$onzeInk" fontSize={30} fontWeight="900">{playerName}</Text>
            {statistics ? (
              <Text
                color={statistics.player.currentMember ? '$onzeGreen' : '$onzeMuted'}
                fontSize={11}
                fontWeight="900"
              >
                {statistics.player.currentUser
                  ? 'SEU HISTÓRICO'
                  : statistics.player.currentMember
                    ? 'MEMBRO DO GRUPO'
                    : 'EX-MEMBRO • HISTÓRICO PRESERVADO'}
              </Text>
            ) : null}
          </YStack>

          {error ? (
            <YStack
              backgroundColor="$onzeSurface"
              borderColor="$onzeDanger"
              borderRadius="$5"
              borderWidth={1}
              gap="$3"
              padding="$4"
            >
              <Text color="$onzeDanger" fontSize={13}>{error}</Text>
              <AppButton variant="primary" onPress={() => void loadStatistics()}>
                <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
              </AppButton>
            </YStack>
          ) : null}

          {statistics ? (
            <>
              <TotalsGrid totals={statistics.player.totals} />

              <YStack gap="$3">
                <XStack alignItems="flex-end" justifyContent="space-between" gap="$3">
                  <YStack flex={1} gap="$1">
                    <Text color="$onzeInk" fontSize={21} fontWeight="900">Jogos</Text>
                    <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                      A equipe destacada é a escalação do jogador naquele jogo.
                    </Text>
                  </YStack>
                  <Text color="$onzeGreen" fontSize={13} fontWeight="900">
                    {statistics.matchHistory.length}
                  </Text>
                </XStack>

                {statistics.matchHistory.length === 0 ? (
                  <YStack
                    alignItems="center"
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeBorder"
                    borderRadius="$6"
                    borderWidth={1}
                    gap="$2"
                    padding="$6"
                  >
                    <Text fontSize={36}>⚽</Text>
                    <Text color="$onzeInk" fontSize={17} fontWeight="900" textAlign="center">
                      Nenhum jogo encerrado
                    </Text>
                    <Text color="$onzeMuted" fontSize={13} lineHeight={20} textAlign="center">
                      O histórico começa quando o jogador é escalado e o jogo é finalizado.
                    </Text>
                  </YStack>
                ) : (
                  statistics.matchHistory.map((match) => {
                    const eventDetails = [
                      match.goals ? `${match.goals} ${match.goals === 1 ? 'gol' : 'gols'}` : null,
                      match.assists ? `${match.assists} ${match.assists === 1 ? 'assistência' : 'assistências'}` : null,
                    ].filter(Boolean).join(' • ') || 'Sem gol ou assistência registrada';
                    return (
                      <StatisticsMatchCard
                        key={match.matchId}
                        startsAt={match.startsAt}
                        timeZone={match.timeZone}
                        venue={match.venue}
                        teams={match.teams}
                        highlightTeamNumber={match.teamNumber}
                        result={match.result}
                        detail={eventDetails}
                        onPress={() => router.push({
                          pathname: '/live-match',
                          params: { matchId: match.matchId },
                        })}
                      />
                    );
                  })
                )}
              </YStack>
            </>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function TotalsGrid({ totals }: { totals: StatisticsTotals }) {
  const items = [
    { label: 'Jogos', value: totals.gamesPlayed, accent: true },
    { label: 'Vitórias', value: totals.wins, accent: true },
    { label: 'Empates', value: totals.draws, accent: false },
    { label: 'Derrotas', value: totals.losses, accent: false },
    { label: 'Gols', value: totals.goals, accent: true },
    { label: 'Assistências', value: totals.assists, accent: true },
  ];
  return (
    <XStack flexWrap="wrap" gap="$3">
      {items.map((item) => (
        <YStack
          key={item.label}
          backgroundColor={item.accent ? '$onzeSuccessBg' : '$onzeSurface'}
          borderColor={item.accent ? '$onzeSuccessBorder' : '$onzeBorder'}
          borderRadius="$5"
          borderWidth={1}
          flexBasis="29%"
          flexGrow={1}
          gap="$1"
          minWidth={92}
          padding="$4"
        >
          <Text color={item.accent ? '$onzeGreen' : '$onzeInk'} fontSize={25} fontWeight="900">
            {item.value}
          </Text>
          <Text color="$onzeMuted" fontSize={11} fontWeight="800">{item.label}</Text>
        </YStack>
      ))}
    </XStack>
  );
}
