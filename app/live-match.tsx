import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { ONZE_COLORS } from '../src/theme/colors';

import { getErrorMessage } from '../src/lib/errors';

import { AppButton } from '../src/components/app-button';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { CardEventModal } from '../src/components/card-event-modal';
import { GoalEventModal } from '../src/components/goal-event-modal';
import { LiveScoreboard } from '../src/components/live-scoreboard';
import { GoalTimeline } from '../src/components/goal-timeline';
import { MatchPeriodControls } from '../src/components/match-period-controls';
import { PenaltyShootoutPanel } from '../src/components/penalty-shootout-panel';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  confirmPenaltyWinner,
  createCardEvent,
  createGoalEvent,
  deleteCardEvent,
  deleteGoalEvent,
  finishCurrentPeriod,
  finishLiveMatch,
  FootballMatch,
  getLiveMatch,
  getMatch,
  getMatchTeams,
  MatchTeams,
  LiveMatchState,
  LiveMatchStreamEvent,
  MatchCardType,
  PenaltyLineupInput,
  recordPenaltyAttempt,
  resetLiveMatch,
  setPenaltyLineup,
  startNextPeriod,
  updatePeriodAddedTime,
  updateLiveMatchScore,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import {
  activeMatchPeriod,
  mergeLiveMatchStreamEvent,
  sentOffPlayerAssignmentIds,
} from '../src/lib/live-match';
import {
  LiveMatchStreamConnection,
  openLiveMatchStream,
} from '../src/lib/live-match-stream';

type LiveManagementAction = 'finish' | 'reset' | null;
type TimelineEventKind = 'GOAL' | 'CARD';
type PendingTimelineDeletion = { kind: TimelineEventKind; eventId: string } | null;

export default function LiveMatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [liveState, setLiveState] = useState<LiveMatchState | null>(null);
  const [matchTeams, setMatchTeams] = useState<MatchTeams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const desiredScoresRef = useRef(new Map<number, number>());
  const confirmedScoresRef = useRef(new Map<number, number>());
  const scoreRequestRunningRef = useRef(new Set<number>());
  const [managementAction, setManagementAction] = useState<LiveManagementAction>(null);
  const [managing, setManaging] = useState(false);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalTeamNumber, setGoalTeamNumber] = useState<number | null>(null);
  const [scorerAssignmentId, setScorerAssignmentId] = useState<string | null>(null);
  const [assistAssignmentId, setAssistAssignmentId] = useState<string | null>(null);
  const [penaltyGoal, setPenaltyGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [cardTeamNumber, setCardTeamNumber] = useState<number | null>(null);
  const [cardPlayerAssignmentId, setCardPlayerAssignmentId] = useState<string | null>(null);
  const [cardType, setCardType] = useState<MatchCardType>('YELLOW');
  const [savingCard, setSavingCard] = useState(false);
  const [deletingEventKey, setDeletingEventKey] = useState<string | null>(null);
  const [pendingTimelineDeletion, setPendingTimelineDeletion] = useState<PendingTimelineDeletion>(null);
  const [periodManaging, setPeriodManaging] = useState(false);
  const [penaltyManaging, setPenaltyManaging] = useState(false);
  const liveStateRef = useRef<LiveMatchState | null>(null);

  function goToLogin() {
    router.replace({
      pathname: '/',
      params: params.matchId ? { matchId: params.matchId, destination: 'live' } : {},
    });
  }

  const loadLiveMatch = useCallback(async (silent = false) => {
    if (!params.matchId) {
      setError('Não foi possível identificar o jogo.');
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      const loadedMatch = await getMatch(token, params.matchId);
      const [loadedLiveState, loadedTeams] = await Promise.all([
        getLiveMatch(token, params.matchId),
        loadedMatch.matchType === 'INTERNAL' ? getMatchTeams(token, params.matchId) : Promise.resolve(null),
      ]);
      setMatch(loadedMatch);
      liveStateRef.current = loadedLiveState;
      setLiveState(loadedLiveState);
      desiredScoresRef.current = new Map(loadedLiveState.scores.map((side) => [side.sideNumber, side.score]));
      confirmedScoresRef.current = new Map(loadedLiveState.scores.map((side) => [side.sideNumber, side.score]));
      scoreRequestRunningRef.current.clear();
      setMatchTeams(loadedTeams);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        goToLogin();
        return;
      }
      setError(getErrorMessage(exception, 'Não foi possível carregar o jogo.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [params.matchId]);

  const applyLiveMatchEvent = useCallback((event: LiveMatchStreamEvent) => {
    const current = liveStateRef.current;
    if (!params.matchId || !current) return;
    const authoritative = mergeLiveMatchStreamEvent(current, event);
    if (authoritative === current) return;

    const desiredScores = new Map(
      authoritative.scores.map((side) => [side.sideNumber, side.score]),
    );
    for (const sideNumber of scoreRequestRunningRef.current) {
      const pendingScore = desiredScoresRef.current.get(sideNumber);
      if (pendingScore != null) desiredScores.set(sideNumber, pendingScore);
    }
    desiredScoresRef.current = desiredScores;
    confirmedScoresRef.current = new Map(
      authoritative.scores.map((side) => [side.sideNumber, side.score]),
    );
    const updated: LiveMatchState = applyDesiredScores(authoritative);
    liveStateRef.current = updated;
    setLiveState(updated);
    setMatch((storedMatch) => storedMatch ? {
        ...storedMatch,
        status: updated.status,
        startedAt: updated.startedAt,
        finishedAt: updated.finishedAt,
      } : storedMatch);
  }, [params.matchId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    let stream: LiveMatchStreamConnection | null = null;
    let openedBefore = false;

    const connect = async () => {
      if (!active || stream || AppState.currentState !== 'active' || !params.matchId) return;
      const token = await getAccessToken();
      if (!token || !active) return;
      const connection = openLiveMatchStream(token, params.matchId, {
        onEvent: applyLiveMatchEvent,
        onOpen: () => {
          if (openedBefore) void loadLiveMatch(true);
          openedBefore = true;
        },
        onUnauthorized: () => {
          void clearSession().finally(goToLogin);
        },
      });
      if (!active) connection.close();
      else stream = connection;
    };

    void loadLiveMatch();
    void connect();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stream?.close();
        stream = null;
        openedBefore = false;
        return;
      }
      void loadLiveMatch(true);
      void connect();
    });

    return () => {
      active = false;
      stream?.close();
      subscription.remove();
    };
  }, [applyLiveMatchEvent, loadLiveMatch, params.matchId]));

  useEffect(() => {
    if (match?.periodsEnabled || liveState?.status !== 'IN_PROGRESS' || !liveState.startedAt) return;
    const remainingMs = Math.max(0, Date.parse(liveState.startedAt) + 10_800_000 - Date.now());
    const timeout = setTimeout(() => void loadLiveMatch(), remainingMs + 250);
    return () => clearTimeout(timeout);
  }, [liveState?.startedAt, liveState?.status, loadLiveMatch, match?.periodsEnabled]);

  const sentOffAssignmentIds = useMemo(
    () => sentOffPlayerAssignmentIds(liveState?.cardEvents ?? []),
    [liveState?.cardEvents],
  );

  const canRegisterMatchEvents = Boolean(
    match
      && liveState
      && liveState.status === 'IN_PROGRESS'
      && (liveState.phase === 'LEGACY' || activeMatchPeriod(liveState) != null),
  );

  const penaltyWinnerName = useMemo(() => {
    const winner = liveState?.penaltyShootout?.winnerTeamNumber;
    if (!winner) return null;
    return liveState?.scores.find((side) => side.sideNumber === winner)?.name
      ?? `Time ${winner}`;
  }, [liveState?.penaltyShootout?.winnerTeamNumber, liveState?.scores]);

  function applyDesiredScores(state: LiveMatchState) {
    return {
      ...state,
      scores: state.scores.map((side) => ({
        ...side,
        score: desiredScoresRef.current.get(side.sideNumber) ?? side.score,
      })),
    };
  }

  function storeLiveState(state: LiveMatchState) {
    desiredScoresRef.current = new Map(
      state.scores.map((side) => [side.sideNumber, side.score]),
    );
    confirmedScoresRef.current = new Map(
      state.scores.map((side) => [side.sideNumber, side.score]),
    );
    scoreRequestRunningRef.current.clear();
    liveStateRef.current = state;
    setLiveState(state);
    setMatch((current) => current ? {
      ...current,
      status: state.status,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
    } : current);
  }

  async function flushScoreUpdates(sideNumber: number) {
    if (!match || scoreRequestRunningRef.current.has(sideNumber)) return;
    scoreRequestRunningRef.current.add(sideNumber);
    setScoreSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }

      while (true) {
        const targetScore = desiredScoresRef.current.get(sideNumber);
        if (targetScore == null) break;

        const updatedState = await updateLiveMatchScore(token, match.id, sideNumber, targetScore);
        liveStateRef.current = updatedState;
        updatedState.scores.forEach((side) => {
          confirmedScoresRef.current.set(side.sideNumber, side.score);
        });
        setLiveState(applyDesiredScores(updatedState));

        if (desiredScoresRef.current.get(sideNumber) === targetScore) break;
      }
    } catch (exception) {
      const confirmedScore = confirmedScoresRef.current.get(sideNumber);
      if (confirmedScore != null) {
        desiredScoresRef.current.set(sideNumber, confirmedScore);
        setLiveState((current) => {
          const restored = current ? {
            ...current,
            scores: current.scores.map((side) => side.sideNumber === sideNumber
              ? { ...side, score: confirmedScore }
              : side),
          } : current;
          liveStateRef.current = restored;
          return restored;
        });
      }
      setError(getErrorMessage(exception, 'Não foi possível atualizar o placar.'));
    } finally {
      scoreRequestRunningRef.current.delete(sideNumber);
      setScoreSaving(scoreRequestRunningRef.current.size > 0);
    }
  }

  function openGoalModal(sideNumber: number) {
    if (!canRegisterMatchEvents) return;
    const selectedTeam = matchTeams?.teams.find(
      (team) => team.teamNumber === sideNumber && team.assignments.length > 0,
    );
    if (!selectedTeam) {
      setError('Gere os times e adicione os jogadores antes de registrar um gol.');
      return;
    }
    setGoalTeamNumber(selectedTeam.teamNumber);
    setScorerAssignmentId(null);
    setAssistAssignmentId(null);
    setPenaltyGoal(false);
    setGoalModalVisible(true);
  }

  async function saveGoal() {
    if (!match || !scorerAssignmentId || savingGoal || scoreSaving) return;
    setSavingGoal(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      const result = await createGoalEvent(
        token,
        match.id,
        scorerAssignmentId,
        penaltyGoal ? null : assistAssignmentId,
        penaltyGoal,
      );
      desiredScoresRef.current = new Map(result.liveMatch.scores.map((side) => [side.sideNumber, side.score]));
      confirmedScoresRef.current = new Map(result.liveMatch.scores.map((side) => [side.sideNumber, side.score]));
      liveStateRef.current = result.liveMatch;
      setLiveState(result.liveMatch);
      setGoalModalVisible(false);
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível registrar o gol.'));
    } finally {
      setSavingGoal(false);
    }
  }

  function openCardModal() {
    if (!canRegisterMatchEvents) return;
    const teams = matchTeams?.teams.filter((team) => team.assignments.length > 0) ?? [];
    if (teams.length === 0) {
      setError('Gere os times e adicione os jogadores antes de registrar um cartão.');
      return;
    }
    setCardTeamNumber(teams[0].teamNumber);
    setCardPlayerAssignmentId(null);
    setCardType('YELLOW');
    setCardModalVisible(true);
  }

  async function saveCard() {
    if (!match || !cardPlayerAssignmentId || savingCard) return;
    setSavingCard(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      const result = await createCardEvent(token, match.id, cardPlayerAssignmentId, cardType);
      liveStateRef.current = result.liveMatch;
      setLiveState(result.liveMatch);
      setCardModalVisible(false);
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível registrar o cartão.'));
    } finally {
      setSavingCard(false);
    }
  }

  async function removeTimelineEvent(kind: TimelineEventKind, eventId: string) {
    if (!match || deletingEventKey || scoreSaving
      || !liveState?.canManage || liveState.status !== 'IN_PROGRESS') return;
    const eventKey = `${kind}:${eventId}`;
    setDeletingEventKey(eventKey);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      const updatedState = kind === 'GOAL'
        ? await deleteGoalEvent(token, match.id, eventId)
        : await deleteCardEvent(token, match.id, eventId);
      desiredScoresRef.current = new Map(
        updatedState.scores.map((side) => [side.sideNumber, side.score]),
      );
      confirmedScoresRef.current = new Map(
        updatedState.scores.map((side) => [side.sideNumber, side.score]),
      );
      scoreRequestRunningRef.current.clear();
      liveStateRef.current = updatedState;
      setLiveState(updatedState);
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível remover o evento.'));
    } finally {
      setDeletingEventKey(null);
      setPendingTimelineDeletion(null);
    }
  }

  function confirmTimelineEventDeletion(kind: TimelineEventKind, eventId: string) {
    if (deletingEventKey || scoreSaving
      || !liveState?.canManage || liveState.status !== 'IN_PROGRESS') return;
    setPendingTimelineDeletion({ kind, eventId });
  }

  function changeScore(sideNumber: number, delta: number) {
    if (!match || !liveState || !canRegisterMatchEvents) return;
    const displayedScore = liveState.scores.find((side) => side.sideNumber === sideNumber)?.score ?? 0;
    const currentScore = desiredScoresRef.current.get(sideNumber) ?? displayedScore;
    const nextScore = Math.max(0, currentScore + delta);
    if (nextScore === currentScore) return;

    desiredScoresRef.current.set(sideNumber, nextScore);
    setLiveState((current) => {
      const optimistic = current ? {
        ...current,
        scores: current.scores.map((side) => side.sideNumber === sideNumber
          ? { ...side, score: nextScore }
          : side),
      } : current;
      liveStateRef.current = optimistic;
      return optimistic;
    });
    void flushScoreUpdates(sideNumber);
  }

  async function confirmManagementAction() {
    if (!match || !managementAction || managing) return;
    setManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      if (managementAction === 'reset') {
        await resetLiveMatch(token, match.id);
        setManagementAction(null);
        router.replace({ pathname: '/match', params: { matchId: match.id } });
        return;
      }
      const updatedMatch = await finishLiveMatch(token, match.id);
      setMatch(updatedMatch);
      const updatedLiveState = await getLiveMatch(token, match.id);
      liveStateRef.current = updatedLiveState;
      setLiveState(updatedLiveState);
      setManagementAction(null);
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível atualizar o jogo.'));
    } finally {
      setManaging(false);
    }
  }

  async function savePeriodAddedTime(minutes: number) {
    if (!match || periodManaging || scoreSaving) return false;
    setPeriodManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return false; }
      storeLiveState(await updatePeriodAddedTime(token, match.id, minutes));
      return true;
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível salvar os acréscimos.'));
      return false;
    } finally {
      setPeriodManaging(false);
    }
  }

  async function endCurrentPeriod() {
    if (!match || periodManaging || scoreSaving) return;
    setPeriodManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      storeLiveState(await finishCurrentPeriod(token, match.id));
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível encerrar este tempo.'));
    } finally {
      setPeriodManaging(false);
    }
  }

  async function beginNextPeriod() {
    if (!match || periodManaging || scoreSaving) return;
    setPeriodManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      storeLiveState(await startNextPeriod(token, match.id));
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível iniciar o próximo tempo.'));
    } finally {
      setPeriodManaging(false);
    }
  }

  async function savePenaltyLineup(takers: PenaltyLineupInput[]) {
    if (!match || penaltyManaging || scoreSaving) return;
    setPenaltyManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      storeLiveState(await setPenaltyLineup(token, match.id, takers));
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível iniciar a disputa por pênaltis.'));
    } finally {
      setPenaltyManaging(false);
    }
  }

  async function savePenaltyAttempt(
    scored: boolean,
    takerAssignmentId?: string,
    takerDisplayName?: string,
  ) {
    if (!match || penaltyManaging) return;
    setPenaltyManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      storeLiveState(await recordPenaltyAttempt(
        token,
        match.id,
        scored,
        takerAssignmentId,
        takerDisplayName,
      ));
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível registrar a cobrança.'));
    } finally {
      setPenaltyManaging(false);
    }
  }

  async function finishPenaltyShootout() {
    if (!match || penaltyManaging) return;
    setPenaltyManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      storeLiveState(await confirmPenaltyWinner(token, match.id));
    } catch (exception) {
      setError(getErrorMessage(exception, 'Não foi possível encerrar o jogo.'));
    } finally {
      setPenaltyManaging(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando o jogo..." message="Estamos buscando o placar e o cronômetro." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5">
          <XStack alignItems="center" gap="$3">
            <AppButton variant="secondary" onPress={() => router.back()}>Voltar</AppButton>
            <YStack flex={1}>
              <Text color="$onzeInk" fontSize={24} fontWeight="900">Jogo ao vivo</Text>
              <Text color="$onzeMuted">{match?.groupName ?? 'Onze'}</Text>
            </YStack>
          </XStack>

          {error ? (
            <YStack backgroundColor="$onzeDangerBg" borderRadius="$5" padding="$4">
              <Text color="$onzeDanger">{error}</Text>
            </YStack>
          ) : null}

          {match && liveState ? (
            <>
              <LiveScoreboard
                match={match}
                state={liveState}
                onChangeScore={changeScore}
                onRegisterGoal={openGoalModal}
              />

              <MatchPeriodControls
                match={match}
                state={liveState}
                busy={periodManaging || penaltyManaging || scoreSaving}
                onSetAddedTime={savePeriodAddedTime}
                onFinishPeriod={endCurrentPeriod}
                onStartNextPeriod={beginNextPeriod}
              />

              <PenaltyShootoutPanel
                state={liveState}
                teams={matchTeams}
                busy={penaltyManaging || periodManaging || scoreSaving}
                onSetLineup={savePenaltyLineup}
                onRecordAttempt={savePenaltyAttempt}
              />

              <GoalTimeline
                events={liveState.goalEvents ?? []}
                cardEvents={liveState.cardEvents ?? []}
                match={match}
                sides={liveState.scores}
                canDelete={liveState.canManage
                  && liveState.status === 'IN_PROGRESS'
                  && (liveState.phase === 'LEGACY' || activeMatchPeriod(liveState) != null)}
                deletingEventKey={deletingEventKey ?? (scoreSaving ? 'SCORE' : null)}
                onDelete={confirmTimelineEventDeletion}
              />

              {!liveState.canManage && liveState.status === 'IN_PROGRESS' ? (
                <YStack
                  backgroundColor="$onzeSuccessBg"
                  borderColor="$onzeGreen"
                  borderRadius="$5"
                  borderWidth={1}
                  gap="$1"
                  padding="$4"
                >
                  <Text color="$onzeGreen" fontWeight="900">Você está acompanhando ao vivo</Text>
                  <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                    O placar e a linha do tempo são atualizados automaticamente. Somente administradores autorizados podem registrar informações.
                  </Text>
                </YStack>
              ) : null}

              {liveState.canManage && liveState.status === 'IN_PROGRESS' ? (
                <YStack gap="$3">
                  {canRegisterMatchEvents ? (
                    <AppButton
                      variant="warning"
                      onPress={openCardModal}
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <Text color="$onzeSurface" fontWeight="900">Registrar cartão</Text>
                    </AppButton>
                  ) : null}
                  {!match.periodsEnabled ? (
                    <AppButton
                      variant="primary"
                      onPress={() => setManagementAction('finish')}
                      pressStyle={{ backgroundColor: '$onzeGreenPress', opacity: 0.85 }}
                    >
                      <Text color="$onzeSurface" fontWeight="900">Finalizar jogo</Text>
                    </AppButton>
                  ) : null}
                  <AppButton
                    variant="destructiveOutline"



                    onPress={() => setManagementAction('reset')}
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Text color="$onzeDanger" fontWeight="900">Resetar jogo</Text>
                  </AppButton>
                </YStack>
              ) : null}
            </>
          ) : (
            <AppButton variant="primary" onPress={() => void loadLiveMatch()}>
              <Text color="$onzeSurface" fontWeight="900">Tentar novamente</Text>
            </AppButton>
          )}
        </YStack>
      </ScrollView>

      <ConfirmActionModal
        visible={managementAction != null}
        title={managementAction === 'reset' ? 'Resetar este jogo?' : 'Finalizar este jogo?'}
        message={managementAction === 'reset'
          ? 'O jogo voltará para Agendado. O cronômetro e todo o placar atual serão apagados.'
          : 'O jogo será encerrado, o cronômetro ficará congelado e o placar será salvo.'}
        confirmLabel={managementAction === 'reset' ? 'Resetar jogo' : 'Finalizar jogo'}
        destructive={managementAction === 'reset'}
        loading={managing}
        onCancel={() => setManagementAction(null)}
        onConfirm={() => void confirmManagementAction()}
      />
      <ConfirmActionModal
        visible={Boolean(
          liveState?.canManage
            && liveState.penaltyShootout?.status === 'AWAITING_CONFIRMATION'
            && penaltyWinnerName,
        )}
        title={`${penaltyWinnerName ?? 'O time vencedor'} venceu nos pênaltis!`}
        message="O resultado da disputa foi salvo separadamente. Confirme para encerrar o jogo."
        confirmLabel="OK e encerrar jogo"
        cancelLabel={null}
        loading={penaltyManaging}
        loadingLabel="Encerrando..."
        onCancel={() => {}}
        onConfirm={() => void finishPenaltyShootout()}
      />
      <ConfirmActionModal
        visible={pendingTimelineDeletion != null}
        title={`Remover ${pendingTimelineDeletion?.kind === 'GOAL' ? 'gol' : 'cartão'}?`}
        message={pendingTimelineDeletion?.kind === 'GOAL'
          ? 'O gol será removido e o placar do time diminuirá em um ponto.'
          : 'O cartão será removido e a situação do jogador será recalculada.'}
        confirmLabel="Remover"
        destructive
        loading={deletingEventKey != null}
        loadingLabel="Removendo..."
        onCancel={() => setPendingTimelineDeletion(null)}
        onConfirm={() => {
          if (pendingTimelineDeletion) {
            void removeTimelineEvent(
              pendingTimelineDeletion.kind,
              pendingTimelineDeletion.eventId,
            );
          }
        }}
      />
      <GoalEventModal
        visible={goalModalVisible}
        teams={matchTeams?.teams.filter((team) => team.assignments.length > 0) ?? []}
        sentOffAssignmentIds={sentOffAssignmentIds}
        selectedTeamNumber={goalTeamNumber}
        scorerAssignmentId={scorerAssignmentId}
        assistAssignmentId={assistAssignmentId}
        penalty={penaltyGoal}
        saving={savingGoal}
        onSelectScorer={(assignmentId) => {
          setScorerAssignmentId(assignmentId);
          if (assistAssignmentId === assignmentId) setAssistAssignmentId(null);
        }}
        onSelectAssist={setAssistAssignmentId}
        onChangePenalty={(penalty) => {
          setPenaltyGoal(penalty);
          if (penalty) setAssistAssignmentId(null);
        }}
        onCancel={() => { if (!savingGoal) setGoalModalVisible(false); }}
        onSave={() => void saveGoal()}
      />
      <CardEventModal
        visible={cardModalVisible}
        teams={matchTeams?.teams.filter((team) => team.assignments.length > 0) ?? []}
        sentOffAssignmentIds={sentOffAssignmentIds}
        teamNumber={cardTeamNumber}
        playerAssignmentId={cardPlayerAssignmentId}
        cardType={cardType}
        saving={savingCard}
        onSelectTeam={(teamNumber) => {
          setCardTeamNumber(teamNumber);
          setCardPlayerAssignmentId(null);
        }}
        onSelectPlayer={setCardPlayerAssignmentId}
        onSelectCardType={setCardType}
        onCancel={() => { if (!savingCard) setCardModalVisible(false); }}
        onSave={() => void saveCard()}
      />
    </SafeAreaView>
  );
}
