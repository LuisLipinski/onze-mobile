import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, XStack, YStack } from 'tamagui';

import type {
  LiveMatchState,
  MatchTeams,
  PenaltyLineupInput,
  TeamAssignment,
} from '../lib/api';
import { ONZE_COLORS } from '../theme/colors';
import { AppButton } from './app-button';

type SelectedTaker = {
  assignmentId?: string;
  displayName: string;
};

type PickerTarget = {
  teamNumber: number;
  slotIndex: number | null;
} | null;

type Props = {
  state: LiveMatchState;
  teams: MatchTeams | null;
  busy: boolean;
  onSetLineup: (takers: PenaltyLineupInput[]) => Promise<void>;
  onRecordAttempt: (
    scored: boolean,
    takerAssignmentId?: string,
    takerDisplayName?: string,
  ) => Promise<void>;
};

function emptyLineup(): SelectedTaker[] {
  return Array.from({ length: 5 }, () => ({ displayName: '' }));
}

function attemptsForTeam(state: LiveMatchState, teamNumber: number) {
  return state.penaltyShootout?.attempts.filter(
    (attempt) => attempt.teamNumber === teamNumber,
  ) ?? [];
}

function teamLabel(state: LiveMatchState, teamNumber: number) {
  return state.scores.find((side) => side.sideNumber === teamNumber)?.name
    ?? `Time ${teamNumber}`;
}

function TeamAttempts({ state, teamNumber }: { state: LiveMatchState; teamNumber: number }) {
  const attempts = attemptsForTeam(state, teamNumber);
  const score = teamNumber === 1
    ? state.penaltyShootout?.teamOneScore ?? 0
    : state.penaltyShootout?.teamTwoScore ?? 0;
  return (
    <YStack alignItems="center" flex={1} gap="$2">
      <Text color="$onzeInk" fontSize={14} fontWeight="900" numberOfLines={2} textAlign="center">
        {teamLabel(state, teamNumber)}
      </Text>
      <Text color="$onzeGreen" fontSize={38} fontVariant={['tabular-nums']} fontWeight="900">
        {score}
      </Text>
      <XStack flexWrap="wrap" gap="$1" justifyContent="center">
        {attempts.map((attempt) => (
          <YStack
            key={attempt.id}
            alignItems="center"
            backgroundColor={attempt.scored ? '$onzeSuccessBg' : '$onzeDangerBg'}
            borderColor={attempt.scored ? '$onzeGreen' : '$onzeDanger'}
            borderRadius={999}
            borderWidth={1}
            height={25}
            justifyContent="center"
            width={25}
          >
            <Text color={attempt.scored ? '$onzeGreen' : '$onzeDanger'} fontSize={12} fontWeight="900">
              {attempt.scored ? '✓' : '×'}
            </Text>
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}

export function PenaltyShootoutPanel({
  state,
  teams,
  busy,
  onSetLineup,
  onRecordAttempt,
}: Props) {
  const insets = useSafeAreaInsets();
  const shootout = state.penaltyShootout;
  const [lineups, setLineups] = useState<Record<number, SelectedTaker[]>>({
    1: emptyLineup(),
    2: emptyLineup(),
  });
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [suddenTaker, setSuddenTaker] = useState<SelectedTaker>({ displayName: '' });

  useEffect(() => {
    if (!shootout || shootout.status !== 'SETUP') return;
    const restored: Record<number, SelectedTaker[]> = { 1: emptyLineup(), 2: emptyLineup() };
    shootout.takers.forEach((taker) => {
      if (taker.teamNumber < 1 || taker.teamNumber > 2
          || taker.kickOrder < 1 || taker.kickOrder > 5) return;
      restored[taker.teamNumber][taker.kickOrder - 1] = {
        assignmentId: taker.assignmentId ?? undefined,
        displayName: taker.displayName,
      };
    });
    setLineups(restored);
  }, [shootout?.status]);

  useEffect(() => {
    setSuddenTaker({ displayName: '' });
    setPickerTarget(null);
  }, [shootout?.nextTeamNumber, shootout?.nextRoundNumber]);

  const assignmentsByTeam = useMemo(() => {
    const result = new Map<number, TeamAssignment[]>();
    teams?.teams.forEach((team) => result.set(team.teamNumber, team.assignments));
    return result;
  }, [teams]);

  if (!shootout || (state.phase !== 'PENALTY_SHOOTOUT'
      && shootout.status !== 'COMPLETED')) return null;

  const selectedPickerAssignments = pickerTarget
    ? assignmentsByTeam.get(pickerTarget.teamNumber) ?? []
    : [];

  const updateLineupText = (teamNumber: number, slotIndex: number, displayName: string) => {
    setLineups((current) => ({
      ...current,
      [teamNumber]: current[teamNumber].map((taker, index) => (
        index === slotIndex ? { displayName } : taker
      )),
    }));
  };

  const selectAssignment = (assignment: TeamAssignment) => {
    if (!pickerTarget) return;
    const selected = { assignmentId: assignment.id, displayName: assignment.displayName };
    if (pickerTarget.slotIndex == null) {
      setSuddenTaker(selected);
    } else {
      setLineups((current) => ({
        ...current,
        [pickerTarget.teamNumber]: current[pickerTarget.teamNumber].map((taker, index) => (
          index === pickerTarget.slotIndex ? selected : taker
        )),
      }));
    }
    setPickerTarget(null);
  };

  const canStart = [1, 2].every((teamNumber) => (
    lineups[teamNumber].every((taker) => taker.displayName.trim().length > 0)
  ));

  const startShootout = async () => {
    const takers = [1, 2].flatMap((teamNumber) => (
      lineups[teamNumber].map((taker, index) => ({
        teamNumber,
        kickOrder: index + 1,
        ...(taker.assignmentId
          ? { assignmentId: taker.assignmentId }
          : { displayName: taker.displayName.trim() }),
      }))
    ));
    await onSetLineup(takers);
  };

  const recordAttempt = async (scored: boolean) => {
    if (shootout.nextTakerSelectionRequired) {
      await onRecordAttempt(
        scored,
        suddenTaker.assignmentId,
        suddenTaker.assignmentId ? undefined : suddenTaker.displayName.trim(),
      );
      return;
    }
    await onRecordAttempt(scored);
  };

  return (
    <>
      <YStack
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        borderRadius="$6"
        borderWidth={1}
        gap="$4"
        padding="$4"
      >
        <YStack gap="$1">
          <Text color="$onzeInk" fontSize={18} fontWeight="900">Disputa por pênaltis</Text>
          <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
            Os gols desta disputa ficam separados do placar e das estatísticas do jogo.
          </Text>
        </YStack>

        {shootout.status === 'SETUP' ? (
          <YStack gap="$5">
            {state.canManage ? [1, 2].map((teamNumber) => {
              const assignments = assignmentsByTeam.get(teamNumber) ?? [];
              return (
                <YStack key={teamNumber} gap="$2">
                  <Text color="$onzeGreen" fontWeight="900">
                    {teamLabel(state, teamNumber)} — primeiros 5 batedores
                  </Text>
                  {lineups[teamNumber].map((taker, slotIndex) => (
                    assignments.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        key={`${teamNumber}:${slotIndex}`}
                        onPress={() => setPickerTarget({ teamNumber, slotIndex })}
                        style={({ pressed }) => ({
                          backgroundColor: ONZE_COLORS.infoBg,
                          borderColor: taker.displayName ? ONZE_COLORS.green : ONZE_COLORS.border,
                          borderRadius: 12,
                          borderWidth: 1,
                          opacity: pressed ? 0.72 : 1,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        })}
                      >
                        <Text color={taker.displayName ? '$onzeInk' : '$onzeMuted'} fontWeight="800">
                          {slotIndex + 1}º — {taker.displayName || 'Selecionar jogador'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Input
                        accessibilityLabel={`${slotIndex + 1}º batedor de ${teamLabel(state, teamNumber)}`}
                        backgroundColor="$onzeSurface"
                        borderColor="$onzeBorder"
                        key={`${teamNumber}:${slotIndex}`}
                        maxLength={120}
                        onChangeText={(value) => updateLineupText(teamNumber, slotIndex, value)}
                        placeholder={`${slotIndex + 1}º batedor`}
                        value={taker.displayName}
                      />
                    )
                  ))}
                </YStack>
              );
            }) : null}
            {state.canManage ? (
              <AppButton
                variant="primary"
                disabled={!canStart || busy}
                opacity={!canStart || busy ? 0.55 : 1}
                onPress={() => void startShootout()}
              >
                <Text color="$onzeSurface" fontWeight="900">
                  {busy ? 'Salvando...' : 'Iniciar disputa por pênaltis'}
                </Text>
              </AppButton>
            ) : (
              <Text color="$onzeMuted" fontSize={13} textAlign="center">
                Aguardando o administrador definir os batedores.
              </Text>
            )}
          </YStack>
        ) : (
          <YStack gap="$4">
            <XStack alignItems="flex-start" gap="$3">
              <TeamAttempts state={state} teamNumber={1} />
              <Text color="$onzeMuted" fontSize={28} fontWeight="900">×</Text>
              <TeamAttempts state={state} teamNumber={2} />
            </XStack>

            {shootout.status === 'IN_PROGRESS' && shootout.nextTeamNumber ? (
              <YStack backgroundColor="$onzeInfoBg" borderRadius="$4" gap="$3" padding="$3">
                <YStack alignItems="center" gap="$1">
                  <Text color="$onzeMuted" fontSize={11} fontWeight="900">
                    {shootout.nextRoundNumber && shootout.nextRoundNumber > 5
                      ? `MORTE SÚBITA — RODADA ${shootout.nextRoundNumber}`
                      : `${shootout.nextRoundNumber}ª COBRANÇA`}
                  </Text>
                  <Text color="$onzeInk" fontSize={16} fontWeight="900" textAlign="center">
                    {teamLabel(state, shootout.nextTeamNumber)}
                  </Text>
                </YStack>

                {shootout.nextTaker ? (
                  <Text color="$onzeGreen" fontSize={16} fontWeight="900" textAlign="center">
                    {shootout.nextTaker.displayName}
                  </Text>
                ) : shootout.nextTakerSelectionRequired && state.canManage ? (
                  (assignmentsByTeam.get(shootout.nextTeamNumber)?.length ?? 0) > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setPickerTarget({
                        teamNumber: shootout.nextTeamNumber!,
                        slotIndex: null,
                      })}
                      style={({ pressed }) => ({
                        backgroundColor: ONZE_COLORS.surface,
                        borderColor: suddenTaker.displayName ? ONZE_COLORS.green : ONZE_COLORS.border,
                        borderRadius: 12,
                        borderWidth: 1,
                        opacity: pressed ? 0.72 : 1,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      })}
                    >
                      <Text color={suddenTaker.displayName ? '$onzeInk' : '$onzeMuted'} fontWeight="800" textAlign="center">
                        {suddenTaker.displayName || 'Selecionar o batedor'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Input
                      accessibilityLabel="Batedor da morte súbita"
                      backgroundColor="$onzeSurface"
                      borderColor="$onzeBorder"
                      maxLength={120}
                      onChangeText={(displayName) => setSuddenTaker({ displayName })}
                      placeholder="Nome do batedor"
                      value={suddenTaker.displayName}
                    />
                  )
                ) : null}

                {state.canManage ? (
                  <XStack gap="$3">
                    <AppButton
                      variant="destructive"
                      disabled={busy || (shootout.nextTakerSelectionRequired && !suddenTaker.displayName.trim())}
                      flex={1}
                      onPress={() => void recordAttempt(false)}
                    >
                      <Text color="$onzeSurface" fontWeight="900">Perdeu</Text>
                    </AppButton>
                    <AppButton
                      variant="primary"
                      disabled={busy || (shootout.nextTakerSelectionRequired && !suddenTaker.displayName.trim())}
                      flex={1}
                      onPress={() => void recordAttempt(true)}
                    >
                      <Text color="$onzeSurface" fontWeight="900">Gol</Text>
                    </AppButton>
                  </XStack>
                ) : null}
              </YStack>
            ) : shootout.status === 'AWAITING_CONFIRMATION' ? (
              <Text color="$onzeGreen" fontWeight="900" textAlign="center">
                Vencedor definido. Aguardando a confirmação para encerrar o jogo.
              </Text>
            ) : shootout.status === 'COMPLETED' && shootout.winnerTeamNumber ? (
              <Text color="$onzeGreen" fontSize={15} fontWeight="900" textAlign="center">
                {teamLabel(state, shootout.winnerTeamNumber)} venceu nos pênaltis por{' '}
                {shootout.teamOneScore} × {shootout.teamTwoScore}.
              </Text>
            ) : null}
          </YStack>
        )}
      </YStack>

      <Modal
        animationType="slide"
        transparent
        visible={pickerTarget != null}
        onRequestClose={() => setPickerTarget(null)}
      >
        <YStack backgroundColor="rgba(15, 23, 42, 0.48)" flex={1} justifyContent="flex-end">
          <YStack
            backgroundColor="$onzeSurface"
            borderTopLeftRadius="$7"
            borderTopRightRadius="$7"
            maxHeight="80%"
            padding="$5"
            paddingBottom={insets.bottom + 20}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack gap="$3">
                <Text color="$onzeInk" fontSize={20} fontWeight="900">Selecionar batedor</Text>
                {selectedPickerAssignments.map((assignment) => (
                  <Pressable
                    accessibilityRole="button"
                    key={assignment.id}
                    onPress={() => selectAssignment(assignment)}
                    style={({ pressed }) => ({
                      backgroundColor: ONZE_COLORS.infoBg,
                      borderColor: ONZE_COLORS.border,
                      borderRadius: 12,
                      borderWidth: 1,
                      opacity: pressed ? 0.72 : 1,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                    })}
                  >
                    <Text color="$onzeInk" fontWeight="800">{assignment.displayName}</Text>
                  </Pressable>
                ))}
                <AppButton variant="secondary" onPress={() => setPickerTarget(null)}>
                  <Text color="$onzeInk" fontWeight="800">Cancelar</Text>
                </AppButton>
              </YStack>
            </ScrollView>
          </YStack>
        </YStack>
      </Modal>
    </>
  );
}
