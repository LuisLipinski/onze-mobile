import * as Sharing from 'expo-sharing';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Button, Text, XStack, YStack } from 'tamagui';

import {
  ApiRequestError,
  generateMatchTeams,
  getMatchTeams,
  MatchModality,
  MatchTeams,
  TeamAssignment,
  updateMatchTeamAssignment,
} from '../src/lib/api';
import { getAccessToken } from '../src/lib/auth-storage';
import { modalityLabel } from '../src/lib/match-modality';
import { positionLabel } from '../src/lib/sports-profile';
import { buildTeamFormation, sortTeamAssignments } from '../src/lib/team-formation';
import {
  autoAssignMatchTeamReserves,
  getMatchTeamReserves,
  updateMatchTeamReserves,
} from '../src/lib/team-lineup-api';
import { teamAssignmentReasonText } from '../src/lib/technical-ratings';
import { calculateTeamLineStrengths, calculateTeamStrength } from '../src/lib/team-line-strength';

const FUTSAL_ROLE_LABELS: Record<string, string> = {
  GOALKEEPER: 'Goleiro',
  FIXO: 'Fixo',
  RIGHT_WINGER_FUTSAL: 'Ala direita',
  LEFT_WINGER_FUTSAL: 'Ala esquerda',
  PIVOT: 'Pivô',
};

const FIELD_EDIT_ROLES = [
  'GOALKEEPER',
  'RIGHT_BACK', 'CENTER_DEFENDER', 'LEFT_BACK', 'DEFENDER',
  'DEFENSIVE_MIDFIELDER', 'RIGHT_MIDFIELDER', 'CENTRAL_MIDFIELDER',
  'LEFT_MIDFIELDER', 'PLAYMAKER', 'MIDFIELDER',
  'RIGHT_WINGER', 'CENTER_FORWARD', 'LEFT_WINGER', 'ATTACKER',
] as const;

const FUT7_EDIT_ROLES = [
  'GOALKEEPER',
  'RIGHT_DEFENDER', 'LEFT_DEFENDER', 'CENTER_DEFENDER', 'DEFENDER',
  'RIGHT_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'LEFT_MIDFIELDER', 'MIDFIELDER',
  'RIGHT_WINGER', 'CENTER_FORWARD', 'LEFT_WINGER', 'ATTACKER',
] as const;

const FUTSAL_EDIT_ROLES = [
  'GOALKEEPER', 'FIXO', 'RIGHT_WINGER_FUTSAL', 'LEFT_WINGER_FUTSAL', 'PIVOT',
] as const;

type MatchTeamsView = MatchTeams & {
  generationNotice?: string | null;
};

function roleLabel(role: string) {
  return FUTSAL_ROLE_LABELS[role] ?? positionLabel(role as never);
}

function editableRoles(modality: MatchModality): readonly string[] {
  if (modality === 'FUTSAL') return FUTSAL_EDIT_ROLES;
  if (modality === 'FIELD') return FIELD_EDIT_ROLES;
  return FUT7_EDIT_ROLES;
}

function fieldCapacity(modality: MatchModality) {
  if (modality === 'FIELD') return 11;
  if (modality === 'FUTSAL') return 5;
  return 7;
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
  reserveIds,
  showLabel = true,
}: {
  assignments: TeamAssignment[];
  modality: MatchTeams['modality'];
  reserveIds: ReadonlySet<string>;
  showLabel?: boolean;
}) {
  const formation = buildTeamFormation(assignments, modality, reserveIds);

  return (
    <YStack gap="$2">
      {showLabel ? (
        <Text color="$onzeMuted" fontSize={11} fontWeight="800">FORMAÇÃO EM CAMPO</Text>
      ) : null}
      <View style={styles.pitch}>
        <View style={styles.halfwayLine} />
        <View style={styles.centerCircle} />
        <View style={styles.leftArea} />
        <View style={styles.rightArea} />
        {formation.fieldPlayers.map((player) => (
          <View
            key={player.assignment.id}
            style={[
              styles.playerChip,
              {
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: [{ translateX: -36 }, { translateY: -19 }],
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
        <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$2" padding="$2">
          <Text color="$onzeMuted" fontSize={10} fontWeight="900">RESERVAS</Text>
          <XStack flexWrap="wrap" gap="$2">
            {formation.reserves.map((assignment) => (
              <YStack
                key={assignment.id}
                backgroundColor="$onzeSurface"
                borderRadius="$3"
                gap={2}
                minWidth={98}
                padding="$2"
              >
                <Text color="$onzeInk" fontSize={10} fontWeight="900" numberOfLines={1}>
                  {assignment.displayName}
                </Text>
                <Text color="$onzeGreen" fontSize={9} fontWeight="800" numberOfLines={1}>
                  {roleLabel(assignment.assignedRole)}
                </Text>
              </YStack>
            ))}
          </XStack>
        </YStack>
      ) : null}
    </YStack>
  );
}

function ShareLineupCard({
  data,
  reserveIds,
}: {
  data: MatchTeamsView;
  reserveIds: ReadonlySet<string>;
}) {
  return (
    <View style={styles.shareCard}>
      <Text color="#176B45" fontSize={16} fontWeight="900">ONZE • ESCALAÇÃO</Text>
      <Text color="#183B2C" fontSize={28} fontWeight="900">Times da partida</Text>
      <Text color="#60746A" fontSize={14}>{modalityLabel(data.modality)}</Text>
      <YStack gap="$5" marginTop="$4">
        {data.teams.map((team) => (
          <YStack key={team.teamNumber} gap="$2">
            <Text color="#183B2C" fontSize={20} fontWeight="900">Time {team.teamNumber}</Text>
            <FormationPitch
              assignments={team.assignments}
              modality={data.modality}
              reserveIds={reserveIds}
              showLabel={false}
            />
          </YStack>
        ))}
      </YStack>
      <Text color="#60746A" fontSize={11} marginTop="$4">Onze – Organizador de Pelada</Text>
    </View>
  );
}

export default function MatchTeamsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const shareRef = useRef<View>(null);
  const [data, setData] = useState<MatchTeamsView | null>(null);
  const [reserveIds, setReserveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
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
      const [teams, reserves] = await Promise.all([
        getMatchTeams(token, params.matchId),
        getMatchTeamReserves(token, params.matchId),
      ]);
      setData(teams);
      setReserveIds(new Set(reserves.reserveAssignmentIds));
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
      const generated = await generateMatchTeams(token, params.matchId);
      setData(generated);
      const reserves = await autoAssignMatchTeamReserves(token, params.matchId);
      setReserveIds(new Set(reserves.reserveAssignmentIds));
      setEditingId(null);
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
    if (!params.matchId || !data || savingId) return;
    const nextTeam = currentTeam >= data.teamCount ? 1 : currentTeam + 1;
    setSavingId(assignment.id);
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
      setSavingId(null);
    }
  }

  async function changeRole(
    assignment: TeamAssignment,
    currentTeam: number,
    assignedRole: string,
  ) {
    if (!params.matchId || !data || savingId || assignedRole === assignment.assignedRole) return;
    setSavingId(assignment.id);
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
        currentTeam,
        assignedRole,
      ));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível alterar a posição do jogador.');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleReserve(
    assignment: TeamAssignment,
    teamAssignments: TeamAssignment[],
  ) {
    if (!params.matchId || !data || savingId) return;
    const isReserve = reserveIds.has(assignment.id);
    if (isReserve) {
      const playersOnField = teamAssignments.filter((item) => !reserveIds.has(item.id)).length;
      if (playersOnField >= fieldCapacity(data.modality)) {
        setError('O campo já está completo. Coloque outro jogador deste time na reserva antes de promover este jogador.');
        return;
      }
    }

    const nextReserveIds = new Set(reserveIds);
    if (isReserve) nextReserveIds.delete(assignment.id);
    else nextReserveIds.add(assignment.id);

    setSavingId(assignment.id);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const updated = await updateMatchTeamReserves(
        token,
        params.matchId,
        [...nextReserveIds],
      );
      setReserveIds(new Set(updated.reserveAssignmentIds));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível alterar a reserva.');
    } finally {
      setSavingId(null);
    }
  }

  async function shareLineup() {
    if (!data || !shareRef.current || sharing) return;
    setSharing(true);
    setError(null);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError('O compartilhamento não está disponível neste dispositivo.');
        return;
      }
      const uri = await captureRef(shareRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Compartilhar escalação',
        mimeType: 'image/png',
      });
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível compartilhar a escalação.');
    } finally {
      setSharing(false);
    }
  }

  const hasTeams = Boolean(data?.teams.some((team) => team.assignments.length));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      {data && hasTeams ? (
        <View pointerEvents="none" style={styles.shareCaptureHost}>
          <View ref={shareRef} collapsable={false}>
            <ShareLineupCard data={data} reserveIds={reserveIds} />
          </View>
        </View>
      ) : null}

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

          {hasTeams ? (
            <Button
              backgroundColor="#E7F3EC"
              borderColor="$onzeGreen"
              borderWidth={1}
              disabled={sharing}
              height={48}
              onPress={() => void shareLineup()}
            >
              <Text color="$onzeGreen" fontWeight="900">
                {sharing ? 'Preparando imagem...' : 'Compartilhar escalação'}
              </Text>
            </Button>
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
            const activeAssignments = team.assignments.filter((assignment) => !reserveIds.has(assignment.id));
            const lineStrengths = calculateTeamLineStrengths(activeAssignments, data.modality);
            const fieldStrength = calculateTeamStrength(activeAssignments, data.modality);
            const sortedAssignments = sortTeamAssignments(team.assignments, data.modality)
              .sort((left, right) => Number(reserveIds.has(left.id)) - Number(reserveIds.has(right.id)));
            const realEvaluations = activeAssignments.filter((assignment) => assignment.scoreSource === 'REAL').length;
            const estimatedEvaluations = activeAssignments.filter((assignment) => assignment.scoreSource === 'ESTIMATED').length;

            return (
              <YStack key={team.teamNumber} backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text color="$onzeInk" fontSize={20} fontWeight="900">Time {team.teamNumber}</Text>
                  {data.technicalDetailsVisible ? (
                    <Text color="$onzeGreen" fontSize={12} fontWeight="900">
                      Força {fieldStrength ?? '—'}/50
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
                      {realEvaluations} reais • {estimatedEvaluations} estimadas em campo
                    </Text>
                    <Text color="$onzeMuted" fontSize={10} lineHeight={15}>
                      A força considera a qualidade dos jogadores e a cobertura esperada da formação.
                    </Text>
                  </>
                ) : null}

                {team.assignments.length ? (
                  <FormationPitch
                    assignments={team.assignments}
                    modality={data.modality}
                    reserveIds={reserveIds}
                  />
                ) : null}

                <YStack gap="$1">
                  <Text color="$onzeMuted" fontSize={11} fontWeight="800">LISTA DA ESCALAÇÃO</Text>
                  {sortedAssignments.map((assignment) => {
                    const isReserve = reserveIds.has(assignment.id);
                    const editing = editingId === assignment.id;
                    return (
                      <YStack key={assignment.id} borderTopColor="$onzeBorder" borderTopWidth={1} gap="$2" paddingTop="$3">
                        <XStack alignItems="center" gap="$3" justifyContent="space-between">
                          <YStack flex={1} gap="$1">
                            <XStack alignItems="center" flexWrap="wrap" gap="$2">
                              <Text color="$onzeInk" fontSize={15} fontWeight="900">{assignment.displayName}</Text>
                              {isReserve ? (
                                <Text backgroundColor="#FFF1CC" borderRadius="$2" color="#8A6414" fontSize={9} fontWeight="900" paddingHorizontal="$2" paddingVertical={2}>
                                  RESERVA
                                </Text>
                              ) : null}
                            </XStack>
                            <Text color="$onzeGreen" fontSize={12} fontWeight="800">{roleLabel(assignment.assignedRole)}</Text>
                          </YStack>
                          {data.technicalDetailsVisible ? (
                            <Button
                              backgroundColor={editing ? '#DDEFE4' : '$onzeCanvas'}
                              disabled={Boolean(savingId)}
                              minHeight={38}
                              onPress={() => setEditingId(editing ? null : assignment.id)}
                              paddingHorizontal="$3"
                            >
                              <Text color="$onzeGreen" fontSize={11} fontWeight="900">
                                {editing ? 'Fechar' : 'Editar'}
                              </Text>
                            </Button>
                          ) : null}
                        </XStack>

                        {editing && data.technicalDetailsVisible ? (
                          <YStack backgroundColor="#F7FAF8" borderColor="$onzeBorder" borderRadius="$4" borderWidth={1} gap="$3" padding="$3">
                            <Text color="$onzeInk" fontSize={12} fontWeight="900">Posição nesta partida</Text>
                            <XStack flexWrap="wrap" gap="$2">
                              {editableRoles(data.modality).map((role) => (
                                <Button
                                  key={role}
                                  backgroundColor={assignment.assignedRole === role ? '$onzeGreen' : '$onzeCanvas'}
                                  disabled={Boolean(savingId)}
                                  minHeight={34}
                                  onPress={() => void changeRole(assignment, team.teamNumber, role)}
                                  paddingHorizontal="$2"
                                >
                                  <Text
                                    color={assignment.assignedRole === role ? '$onzeSurface' : '$onzeGreen'}
                                    fontSize={10}
                                    fontWeight="800"
                                  >
                                    {roleLabel(role)}
                                  </Text>
                                </Button>
                              ))}
                            </XStack>
                            <XStack flexWrap="wrap" gap="$2">
                              <Button
                                backgroundColor={isReserve ? '#DDEFE4' : '#FFF1CC'}
                                disabled={Boolean(savingId)}
                                minHeight={38}
                                onPress={() => void toggleReserve(assignment, team.assignments)}
                              >
                                <Text color={isReserve ? '$onzeGreen' : '#8A6414'} fontSize={11} fontWeight="900">
                                  {isReserve ? 'Colocar em campo' : 'Mandar para reserva'}
                                </Text>
                              </Button>
                              <Button
                                backgroundColor="$onzeCanvas"
                                disabled={Boolean(savingId)}
                                minHeight={38}
                                onPress={() => void move(assignment, team.teamNumber)}
                              >
                                <Text color="$onzeGreen" fontSize={11} fontWeight="900">
                                  {savingId === assignment.id ? 'Salvando...' : 'Próximo time'}
                                </Text>
                              </Button>
                            </XStack>
                            <Text color="$onzeMuted" fontSize={10} lineHeight={15}>
                              A posição vale apenas para esta partida. A força é recalculada usando a função escolhida.
                            </Text>
                          </YStack>
                        ) : null}

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
                    );
                  })}
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
    aspectRatio: 1.72,
    backgroundColor: '#DDEFE4',
    borderColor: '#79A98D',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  halfwayLine: {
    borderLeftColor: 'rgba(63, 122, 88, 0.45)',
    borderLeftWidth: 1,
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 0,
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
  leftArea: {
    borderBottomColor: 'rgba(63, 122, 88, 0.45)',
    borderBottomWidth: 1,
    borderRightColor: 'rgba(63, 122, 88, 0.45)',
    borderRightWidth: 1,
    borderTopColor: 'rgba(63, 122, 88, 0.45)',
    borderTopWidth: 1,
    height: '50%',
    left: 0,
    position: 'absolute',
    top: '25%',
    width: '14%',
  },
  rightArea: {
    borderBottomColor: 'rgba(63, 122, 88, 0.45)',
    borderBottomWidth: 1,
    borderLeftColor: 'rgba(63, 122, 88, 0.45)',
    borderLeftWidth: 1,
    borderTopColor: 'rgba(63, 122, 88, 0.45)',
    borderTopWidth: 1,
    height: '50%',
    position: 'absolute',
    right: 0,
    top: '25%',
    width: '14%',
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
    width: 72,
  },
  shareCaptureHost: {
    left: -2200,
    position: 'absolute',
    top: 0,
    width: 680,
  },
  shareCard: {
    backgroundColor: '#F4F7F5',
    padding: 28,
    width: 680,
  },
});
