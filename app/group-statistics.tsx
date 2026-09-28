import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { AppButton } from '../src/components/app-button';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import { StatisticsMatchCard } from '../src/components/statistics-match-card';
import {
  ApiRequestError,
  getGroupStatistics,
  GroupStatistics,
  StatisticsPlayer,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import { getErrorMessage } from '../src/lib/errors';
import {
  rankingForMetric,
  rankingValueLabel,
  STATISTICS_RANKING_OPTIONS,
  StatisticsRankingMetric,
} from '../src/lib/statistics';
import { ONZE_COLORS } from '../src/theme/colors';

export default function GroupStatisticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string; groupName?: string }>();
  const [statistics, setStatistics] = useState<GroupStatistics | null>(null);
  const [rankingMetric, setRankingMetric] = useState<StatisticsRankingMetric>('goals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void loadStatistics();
  }, [params.groupId]));

  async function loadStatistics() {
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
      setStatistics(await getGroupStatistics(token, params.groupId));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        router.replace('/');
        return;
      }
      setError(getErrorMessage(exception, 'Não foi possível carregar as estatísticas.'));
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else if (params.groupId) router.replace({ pathname: '/group', params: { groupId: params.groupId } });
    else router.replace('/groups');
  }

  function openPlayer(player: Pick<StatisticsPlayer, 'userId' | 'displayName'>) {
    if (!params.groupId) return;
    router.push({
      pathname: '/player-statistics',
      params: {
        groupId: params.groupId,
        groupName: params.groupName ?? '',
        userId: player.userId,
        displayName: player.displayName,
      },
    });
  }

  const playersById = useMemo(
    () => new Map(statistics?.players.map((player) => [player.userId, player]) ?? []),
    [statistics?.players],
  );
  const ranking = statistics ? rankingForMetric(statistics.rankings, rankingMetric) : [];
  const rankingUnit = rankingValueLabel(rankingMetric);

  if (loading) {
    return (
      <ServerLoadingScreen
        title="Carregando estatísticas..."
        message="Calculando o histórico a partir dos jogos encerrados."
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <AppButton alignSelf="flex-start" variant="ghost" onPress={goBack}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </AppButton>

          <YStack gap="$2">
            <Text color="$onzeMuted" fontSize={12} fontWeight="900">
              {(params.groupName ?? 'GRUPO').toUpperCase()}
            </Text>
            <Text color="$onzeInk" fontSize={30} fontWeight="900">Estatísticas</Text>
            <Text color="$onzeMuted" fontSize={14} lineHeight={21}>
              Números calculados pelos placares, escalações e eventos dos jogos encerrados.
            </Text>
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
              <XStack flexWrap="wrap" gap="$3">
                <SummaryCard label="Jogos encerrados" value={statistics.finishedMatches} />
                <SummaryCard label="Gols registrados" value={statistics.registeredGoals} />
                <SummaryCard label="Jogadores em campo" value={statistics.playersWithMatches} />
              </XStack>

              <YStack
                backgroundColor="$onzeSurface"
                borderColor="$onzeSuccessBorder"
                borderRadius="$6"
                borderWidth={1}
                gap="$4"
                padding="$5"
              >
                <XStack alignItems="center" gap="$3" justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text color="$onzeGreen" fontSize={11} fontWeight="900">MEU DESEMPENHO</Text>
                    <Text color="$onzeInk" fontSize={20} fontWeight="900">
                      {statistics.currentPlayer.displayName}
                    </Text>
                  </YStack>
                  <AppButton
                    buttonSize="sm"
                    variant="outline"
                    onPress={() => openPlayer(statistics.currentPlayer)}
                  >
                    <Text color="$onzeGreen" fontSize={12} fontWeight="900">Ver histórico</Text>
                  </AppButton>
                </XStack>
                <PlayerTotals player={statistics.currentPlayer} />
              </YStack>

              {statistics.finishedMatches === 0 ? (
                <YStack
                  alignItems="center"
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderRadius="$6"
                  borderWidth={1}
                  gap="$3"
                  padding="$6"
                >
                  <Text fontSize={38}>📊</Text>
                  <Text color="$onzeInk" fontSize={18} fontWeight="900" textAlign="center">
                    O primeiro ranking começa no apito final
                  </Text>
                  <Text color="$onzeMuted" fontSize={13} lineHeight={20} textAlign="center">
                    Quando um jogo com times formados for encerrado, os resultados aparecerão aqui automaticamente.
                  </Text>
                </YStack>
              ) : (
                <>
                  <YStack gap="$3">
                    <YStack gap="$1">
                      <Text color="$onzeInk" fontSize={21} fontWeight="900">Ranking do grupo</Text>
                      <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                        Empates na mesma quantidade compartilham a colocação.
                      </Text>
                    </YStack>
                    <XStack flexWrap="wrap" gap="$2">
                      {STATISTICS_RANKING_OPTIONS.map((option) => {
                        const selected = option.key === rankingMetric;
                        return (
                          <Pressable
                            key={option.key}
                            onPress={() => setRankingMetric(option.key)}
                            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                          >
                            <YStack
                              backgroundColor={selected ? '$onzeGreen' : '$onzeSurface'}
                              borderColor={selected ? '$onzeGreen' : '$onzeBorder'}
                              borderRadius={999}
                              borderWidth={1}
                              paddingHorizontal="$4"
                              paddingVertical="$2"
                            >
                              <Text
                                color={selected ? '$onzeSurface' : '$onzeInk'}
                                fontSize={12}
                                fontWeight="900"
                              >
                                {option.label}
                              </Text>
                            </YStack>
                          </Pressable>
                        );
                      })}
                    </XStack>

                    <YStack
                      backgroundColor="$onzeSurface"
                      borderColor="$onzeBorder"
                      borderRadius="$6"
                      borderWidth={1}
                      overflow="hidden"
                    >
                      {ranking.map((entry, index) => {
                        const player = playersById.get(entry.userId);
                        return (
                          <Pressable
                            key={entry.userId}
                            onPress={() => openPlayer(entry)}
                            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                          >
                            <XStack
                              alignItems="center"
                              backgroundColor={entry.currentUser ? '$onzeSuccessBg' : '$onzeSurface'}
                              borderTopColor="$onzeBorder"
                              borderTopWidth={index === 0 ? 0 : 1}
                              gap="$3"
                              padding="$4"
                            >
                              <Text color="$onzeGreen" fontSize={17} fontWeight="900" minWidth={38}>
                                #{entry.rank}
                              </Text>
                              <YStack flex={1} gap={1}>
                                <Text color="$onzeInk" fontSize={15} fontWeight="900">
                                  {entry.displayName}
                                </Text>
                                <Text color="$onzeMuted" fontSize={10} fontWeight="800">
                                  {entry.currentUser
                                    ? 'VOCÊ'
                                    : player && !player.currentMember
                                      ? 'EX-MEMBRO'
                                      : 'JOGADOR'}
                                </Text>
                              </YStack>
                              <YStack alignItems="flex-end" gap={1}>
                                <Text color="$onzeInk" fontSize={20} fontWeight="900">{entry.value}</Text>
                                <Text color="$onzeMuted" fontSize={10} fontWeight="800">
                                  {rankingUnit.toUpperCase()}
                                </Text>
                              </YStack>
                              <Text color="$onzeMuted" fontSize={20}>›</Text>
                            </XStack>
                          </Pressable>
                        );
                      })}
                    </YStack>
                  </YStack>

                  <YStack gap="$3">
                    <Text color="$onzeInk" fontSize={21} fontWeight="900">Histórico do grupo</Text>
                    {statistics.matchHistory.map((match) => (
                      <StatisticsMatchCard
                        key={match.matchId}
                        startsAt={match.startsAt}
                        timeZone={match.timeZone}
                        venue={match.venue}
                        teams={match.teams}
                        detail={`${match.registeredGoals} ${match.registeredGoals === 1 ? 'gol registrado' : 'gols registrados'}`}
                        onPress={() => router.push({
                          pathname: '/live-match',
                          params: { matchId: match.matchId },
                        })}
                      />
                    ))}
                  </YStack>
                </>
              )}
            </>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <YStack
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderRadius="$5"
      borderWidth={1}
      flexBasis="30%"
      flexGrow={1}
      gap="$1"
      minWidth={96}
      padding="$4"
    >
      <Text color="$onzeGreen" fontSize={24} fontWeight="900">{value}</Text>
      <Text color="$onzeMuted" fontSize={11} fontWeight="800" lineHeight={15}>{label}</Text>
    </YStack>
  );
}

function PlayerTotals({ player }: { player: StatisticsPlayer }) {
  const items = [
    ['Jogos', player.totals.gamesPlayed],
    ['Vitórias', player.totals.wins],
    ['Empates', player.totals.draws],
    ['Derrotas', player.totals.losses],
    ['Gols', player.totals.goals],
    ['Assistências', player.totals.assists],
  ] as const;
  return (
    <XStack flexWrap="wrap" gap="$2">
      {items.map(([label, value]) => (
        <YStack
          key={label}
          alignItems="center"
          backgroundColor="$onzeCanvas"
          borderRadius="$4"
          flexBasis="29%"
          flexGrow={1}
          gap={2}
          minWidth={82}
          padding="$3"
        >
          <Text color="$onzeInk" fontSize={19} fontWeight="900">{value}</Text>
          <Text color="$onzeMuted" fontSize={10} fontWeight="800" textAlign="center">{label}</Text>
        </YStack>
      ))}
    </XStack>
  );
}
