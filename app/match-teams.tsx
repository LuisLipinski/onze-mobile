import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
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
import { buildTeamFormation, sortTeamAssignments } from '../src/lib/team-formation';
import { teamAssignmentReasonText } from '../src/lib/technical-ratings';
import { calculateTeamLineStrengths } from '../src/lib/team-line-strength';

const FUTSAL_ROLE_LABELS: Record<string, string> = {
  GOALKEEPER: 'Goleiro',
  FIXO: 'Fixo',
  RIGHT_WINGER_FUTSAL: 'Ala direita',
  LEFT_WINGER_FUTSAL: 'Ala esquerda',
  PIVOT: 'Pivô',
};

type MatchTeamsView = MatchTeams & {
  generationNotice?: string | null;
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

function FormationPitch({
  assignments,
  modality,
}: {
  assignments: TeamAssignment[];
  modality: MatchTeams['modality'];
}) {
  const formation = buildTeamFormation(assignments, modality);

  return (
    <YStack gap="$2">
      <Text color="$onzeMuted" fontSize={11} fontWeight="800">FORMAÇÃO EM CAMPO</Text>
      <XStack alignItems="stretch" gap="$3">
        <View style={styles.pitch}>
          <View style={styles.halfwayLine} />
          <View style={styles.centerCircle} />
          <View style={styles.topArea} />
          <View style={styles.bottomArea} />
          {formation.fieldPlayers.map((player) => (
            <View
              key={player.assignment.id}
              style={[
                styles.playerChip,
                {
                  left: `${player.x}%`,
                  top: `${player.y}%`,
                  transform: [{ translateX: -34 }, { translateY: -19 }],
                },
              ]}
            >
              <Text color="#123B2A" fontSize={9} fontWeight="900" numberOfLines={1} textAlign="center">
                {player.assignment.displayName}
              </Text>
              <Text color="#2F6B50" fontSize={8} fontWeight="800" numberOfLines={1} textAlign="center">
                {roleLabel(player.assignment.assignedRole)}
              </Text>
            </View>
          ))}
        </View>

        {formation.reserves.length ? (
          <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$2" padding="$2" width={104}>
            <Text color="$onzeMuted" fontSize={10} fontWeight="900">RESERVAS</Text>
            {formation.reserves.map((assignment) => (
              <YStack key={assignment.id} backgroundColor="$onzeSurface" borderRadius="$3" gap={2} padding="$2">
                <Text color="$onzeInk" fontSize={10} fontWeight="900" numberOfLines={2}>
                  {assignment.displayName}
                </Text>
                <Text color="$onzeGreen" fontSize={9} fontWeight="800" numberOfLines={2}>
                  {roleLabel(assignment.assignedRole)}
                </Text>
              </YStack>
            ))}
          </YStack>
        ) : null}
      </XStack>
    </YStack>
  );
}

export default function MatchTeamsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [data, setData] = useState<MatchTeamsView | null>(null);
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

          {data?.generationNotice ? (
            <YStack backgroundColor="#FFF7E6" borderColor="#D8A331" borderRadius="$5" borderWidth={1} padding="$4">
              <Text color="#8A6414" fontSize={13} lineHeight={19}>{data.generationNotice}</Text>
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
            const sortedAssignments = sortTeamAssignments(team.assignments, data.modality);
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

                {team.assignments.length ? (
                  <FormationPitch assignments={team.assignments} modality={data.modality} />
                ) : null}

                <YStack gap="$1">
                  <Text color="$onzeMuted" fontSize={11} fontWeight="800">LISTA DA ESCALAÇÃO</Text>
                  {sortedAssignments.map((assignment) => (
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
              </YStack>
            );
          })}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pitch: {
    aspectRatio: 0.64,
    backgroundColor: '#DDEFE4',
    borderColor: '#79A98D',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  halfwayLine: {
    borderTopColor: 'rgba(63, 122, 88, 0.45)',
    borderTopWidth: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  centerCircle: {
    borderColor: 'rgba(63, 122, 88, 0.45)',
    borderRadius: 42,
    borderWidth: 1,
    height: 84,
    left: '50%',
    marginLeft: -42,
    marginTop: -42,
    position: 'absolute',
    top: '50%',
    width: 84,
  },
  topArea: {
    borderBottomColor: 'rgba(63, 122, 88, 0.45)',
    borderBottomWidth: 1,
    borderLeftColor: 'rgba(63, 122, 88, 0.45)',
    borderLeftWidth: 1,
    borderRightColor: 'rgba(63, 122, 88, 0.45)',
    borderRightWidth: 1,
    height: '14%',
    left: '25%',
    position: 'absolute',
    top: 0,
    width: '50%',
  },
  bottomArea: {
    borderLeftColor: 'rgba(63, 122, 88, 0.45)',
    borderLeftWidth: 1,
    borderRightColor: 'rgba(63, 122, 88, 0.45)',
    borderRightWidth: 1,
    borderTopColor: 'rgba(63, 122, 88, 0.45)',
    borderTopWidth: 1,
    bottom: 0,
    height: '14%',
    left: '25%',
    position: 'absolute',
    width: '50%',
  },
  playerChip: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: '#8EB79D',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 4,
    paddingVertical: 4,
    position: 'absolute',
    width: 68,
  },
});
