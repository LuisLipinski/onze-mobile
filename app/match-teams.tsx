import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import {
  ApiRequestError,
  generateMatchTeams,
  getMatchTeams,
  MatchTeams,
  TeamAssignment,
  updateMatchTeamAssignment,
} from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';
import { modalityLabel } from '../src/lib/match-modality';
import { positionLabel } from '../src/lib/sports-profile';
import { teamAssignmentReasonText } from '../src/lib/technical-ratings';
import { calculateTeamLineStrengths } from '../src/lib/team-line-strength';

const FUTSAL_ROLE_LABELS: Record<string, string> = {
  GOALKEEPER: 'Goleiro',
  FIXO: 'Fixo',
  RIGHT_WINGER_FUTSAL: 'Ala direita',
  LEFT_WINGER_FUTSAL: 'Ala esquerda',
  PIVOT: 'Pivô',
};

function roleLabel(role: string) {
  return FUTSAL_ROLE_LABELS[role] ?? positionLabel(role as never);
}

function originLabel(origin: TeamAssignment['positionOrigin']) {
  switch (origin) {
    case 'PRIMARY': return 'Posição principal';
    case 'SECONDARY': return 'Posição secundária';
    case 'ALTERNATIVE': return 'Posição alternativa';
    case 'GOALKEEPER': return 'Goleiro definido na partida';
    case 'MANUAL': return 'Alterado pelo administrador';
    default: return '';
  }
}

function StrengthMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <YStack
      backgroundColor="$onzeCanvas"
      borderRadius="$4"
      flex={1}
      gap="$1"
      minWidth={0}
      padding="$3"
    >
      <Text color="$onzeMuted" fontSize={10} fontWeight="800">{label}</Text>
      <Text color="$onzeInk" fontSize={15} fontWeight="900">{value ?? '—'}/50</Text>
    </YStack>
  );
}

export default function MatchTeamsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [data, setData] = useState<MatchTeams | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void load();
  }, [params.matchId]));

  async function load() {
    if (!params.matchId) {
      setError('Não foi possível identificar a partida.');
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
      setData(await getMatchTeams(token, params.matchId));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar os times.');
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!params.matchId || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setData(await generateMatchTeams(token, params.matchId));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.code === 'MINIMUM_PLAYERS_NOT_REACHED') {
        setError(exception.message);
      } else {
        setError(exception instanceof Error ? exception.message : 'Não foi possível formar os times.');
      }
    } finally {
      setGenerating(false);
    }
  }

  async function move(assignment: TeamAssignment, currentTeam: number) {
    if (!params.matchId || !data || movingId) return;
    const nextTeam = currentTeam >= data.teamCount ? 1 : currentTeam + 1;
    setMovingId(assignment.id);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      setData(await updateMatchTeamAssignment(
        token,
        params.matchId,
        assignment.id,
        nextTeam,
        assignment.assignedRole,
      ));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível mover o jogador.');
    } finally {
      setMovingId(null);
    }
  }

  const hasTeams = Boolean(data?.teams.some((team) => team.assignments.length));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={() => router.back()}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </Button>
          <YStack gap="$1">
            <Text color="$onzeGreen" fontSize={13} fontWeight="900">TIMES DA PARTIDA</Text>
            <Text color="$onzeInk" fontSize={28} fontWeight="900">Escalação</Text>
            {data ? (
              <Text color="$onzeMuted" fontSize={13}>
                {modalityLabel(data.modality)} • {data.confirmedPlayers} confirmados
              </Text>
            ) : null}
          </YStack>

          {error ? (
            <YStack backgroundColor="#FDECEC" borderRadius="$5" padding="$4">
              <Text color="$onzeDanger" fontSize={13} lineHeight={19}>{error}</Text>
            </YStack>
          ) : null}

          {loading ? <Text color="$onzeMuted">Carregando...</Text> : null}

          {data && data.confirmedPlayers < data.minimumPlayers ? (
            <YStack backgroundColor="#FFF7E6" borderColor="#D8A331" borderRadius="$5" borderWidth={1} gap="$1" padding="$4">
              <Text color="#8A6414" fontSize={13} fontWeight="900">Partida abaixo do mínimo</Text>
              <Text color="$onzeInk" fontSize={12} lineHeight={18}>
                Há {data.confirmedPlayers} de {data.minimumPlayers} jogadores mínimos. Se o administrador autorizou continuar, o formador tentará equilibrar os disponíveis, mas posições e força podem não ficar ideais. Revise os times antes de confirmar.
              </Text>
            </YStack>
          ) : data?.reducedTeams ? (
            <YStack backgroundColor="#FFF7E6" borderRadius="$5" padding="$4">
              <Text color="#8A6414" fontSize={13} fontWeight="800">
                Há menos jogadores que o ideal de {data.idealPlayers}. O formador usará os confirmados disponíveis.
              </Text>
            </YStack>
          ) : null}

          {data?.technicalDetailsVisible ? (
            <YStack gap="$2">
              <Button backgroundColor="$onzeGreen" disabled={generating} height={52} onPress={() => void generate()}>
                <Text color="$onzeSurface" fontWeight="900">
                  {generating ? 'Formando...' : hasTeams ? 'Gerar novamente' : 'Formar times automaticamente'}
                </Text>
              </Button>
              <Button
                backgroundColor="$onzeCanvas"
                height={46}
                onPress={() => {
                  if (!params.matchId) return;
                  router.push({ pathname: '/dev-test-data', params: { matchId: params.matchId } });
                }}
              >
                <Text color="$onzeGreen" fontWeight="900">🧪 Ferramentas de teste</Text>
              </Button>
            </YStack>
          ) : null}

          {!loading && data && !hasTeams ? (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$2" padding="$5">
              <Text color="$onzeInk" fontSize={17} fontWeight="900">Times ainda não formados</Text>
              <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                Um administrador autorizado precisa gerar a escalação quando o mínimo de jogadores e os goleiros estiverem completos.
              </Text>
            </YStack>
          ) : null}

          {data?.teams.map((team) => {
            const lineStrengths = calculateTeamLineStrengths(team.assignments);
            return (
              <YStack key={team.teamNumber} backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text color="$onzeInk" fontSize={20} fontWeight="900">Time {team.teamNumber}</Text>
                  {data.technicalDetailsVisible ? (
                    <Text color="$onzeGreen" fontSize={12} fontWeight="900">
                      Força {team.estimatedStrength ?? '—'}/50
                    </Text>
                  ) : null}
                </XStack>
                {data.technicalDetailsVisible ? (
                  <>
                    <XStack gap="$2">
                      <StrengthMetric label="DEFESA" value={lineStrengths.defense} />
                      <StrengthMetric label="MEIO" value={lineStrengths.midfield} />
                      <StrengthMetric label="ATAQUE" value={lineStrengths.attack} />
                    </XStack>
                    <Text color="$onzeMuted" fontSize={11}>
                      {team.realEvaluations ?? 0} reais • {team.estimatedEvaluations ?? 0} estimadas
                    </Text>
                  </>
                ) : null}
                {team.assignments.map((assignment) => (
                  <YStack key={assignment.id} borderTopColor="$onzeBorder" borderTopWidth={1} gap="$2" paddingTop="$3">
                    <XStack alignItems="center" gap="$3" justifyContent="space-between">
                      <YStack flex={1} gap="$1">
                        <Text color="$onzeInk" fontSize={15} fontWeight="900">{assignment.displayName}</Text>
                        <Text color="$onzeGreen" fontSize={12} fontWeight="800">{roleLabel(assignment.assignedRole)}</Text>
                      </YStack>
                      {data.technicalDetailsVisible ? (
                        <Button
                          backgroundColor="$onzeCanvas"
                          disabled={Boolean(movingId)}
                          minHeight={38}
                          onPress={() => void move(assignment, team.teamNumber)}
                          paddingHorizontal="$3"
                        >
                          <Text color="$onzeGreen" fontSize={11} fontWeight="900">
                            {movingId === assignment.id ? 'Movendo...' : 'Próximo time'}
                          </Text>
                        </Button>
                      ) : null}
                    </XStack>
                    {data.technicalDetailsVisible ? (
                      <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$1" padding="$3">
                        <Text color="$onzeInk" fontSize={12} fontWeight="800">
                          Overall usado: {assignment.overallUsed ?? '—'}/50 • {assignment.scoreSource === 'REAL' ? 'Real' : 'Estimado'}
                        </Text>
                        <Text color="$onzeMuted" fontSize={12}>{originLabel(assignment.positionOrigin)}</Text>
                        <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                          Motivo: {teamAssignmentReasonText(assignment.reason)}
                        </Text>
                      </YStack>
                    ) : null}
                  </YStack>
                ))}
              </YStack>
            );
          })}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
