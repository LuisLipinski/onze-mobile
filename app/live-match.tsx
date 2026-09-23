import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { CardEventModal } from '../src/components/card-event-modal';
import { GoalEventModal } from '../src/components/goal-event-modal';
import { LiveScoreboard } from '../src/components/live-scoreboard';
import { GoalTimeline } from '../src/components/goal-timeline';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  createCardEvent,
  createGoalEvent,
  deleteCardEvent,
  deleteGoalEvent,
  finishLiveMatch,
  FootballMatch,
  getLiveMatch,
  getMatch,
  getMatchTeams,
  MatchTeams,
  LiveMatchState,
  LiveMatchStreamEvent,
  MatchCardType,
  listGroups,
  resetLiveMatch,
  updateLiveMatchScore,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import { mergeLiveMatchStreamEvent, sentOffPlayerAssignmentIds } from '../src/lib/live-match';
import {
  LiveMatchStreamConnection,
  openLiveMatchStream,
} from '../src/lib/live-match-stream';

type LiveManagementAction = 'finish' | 'reset' | null;
type TimelineEventKind = 'GOAL' | 'CARD';

export default function LiveMatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [liveState, setLiveState] = useState<LiveMatchState | null>(null);
  const [teamImageUrl, setTeamImageUrl] = useState<string | null>(null);
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
      const [loadedLiveState, groups, loadedTeams] = await Promise.all([
        getLiveMatch(token, params.matchId),
        listGroups(token),
        loadedMatch.matchType === 'INTERNAL' ? getMatchTeams(token, params.matchId) : Promise.resolve(null),
      ]);
      setMatch(loadedMatch);
      liveStateRef.current = loadedLiveState;
      setLiveState(loadedLiveState);
      desiredScoresRef.current = new Map(loadedLiveState.scores.map((side) => [side.sideNumber, side.score]));
      confirmedScoresRef.current = new Map(loadedLiveState.scores.map((side) => [side.sideNumber, side.score]));
      scoreRequestRunningRef.current.clear();
      setTeamImageUrl(groups.find((group) => group.id === loadedMatch.groupId)?.photoUrl ?? null);
      setMatchTeams(loadedTeams);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        goToLogin();
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar a partida.');
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
    if (liveState?.status !== 'IN_PROGRESS' || !liveState.startedAt) return;
    const remainingMs = Math.max(0, Date.parse(liveState.startedAt) + 10_800_000 - Date.now());
    const timeout = setTimeout(() => void loadLiveMatch(), remainingMs + 250);
    return () => clearTimeout(timeout);
  }, [liveState?.startedAt, liveState?.status, loadLiveMatch]);

  const sentOffAssignmentIds = useMemo(
    () => sentOffPlayerAssignmentIds(liveState?.cardEvents ?? []),
    [liveState?.cardEvents],
  );

  function applyDesiredScores(state: LiveMatchState) {
    return {
      ...state,
      scores: state.scores.map((side) => ({
        ...side,
        score: desiredScoresRef.current.get(side.sideNumber) ?? side.score,
      })),
    };
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
      setError(exception instanceof Error ? exception.message : 'Não foi possível atualizar o placar.');
    } finally {
      scoreRequestRunningRef.current.delete(sideNumber);
      setScoreSaving(scoreRequestRunningRef.current.size > 0);
    }
  }

  function openGoalModal(sideNumber: number) {
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
      setError(exception instanceof Error ? exception.message : 'Não foi possível registrar o gol.');
    } finally {
      setSavingGoal(false);
    }
  }

  function openCardModal() {
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
      setError(exception instanceof Error ? exception.message : 'Não foi possível registrar o cartão.');
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
      setError(exception instanceof Error ? exception.message : 'Não foi possível remover o evento.');
    } finally {
      setDeletingEventKey(null);
    }
  }

  function confirmTimelineEventDeletion(kind: TimelineEventKind, eventId: string) {
    if (deletingEventKey || scoreSaving
      || !liveState?.canManage || liveState.status !== 'IN_PROGRESS') return;
    const eventName = kind === 'GOAL' ? 'gol' : 'cartão';
    Alert.alert(
      `Remover ${eventName}?`,
      kind === 'GOAL'
        ? 'O gol será removido e o placar do time diminuirá em um ponto.'
        : 'O cartão será removido e a situação do jogador será recalculada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => void removeTimelineEvent(kind, eventId),
        },
      ],
    );
  }

  function changeScore(sideNumber: number, delta: number) {
    if (!match || !liveState) return;
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
      setError(exception instanceof Error ? exception.message : 'Não foi possível atualizar a partida.');
    } finally {
      setManaging(false);
    }
  }

  if (loading) {
    return <ServerLoadingScreen title="Carregando a partida..." message="Estamos buscando o placar e o cronômetro." />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5">
          <XStack alignItems="center" gap="$3">
            <Button backgroundColor="$onzeSurface" onPress={() => router.back()}>Voltar</Button>
            <YStack flex={1}>
              <Text color="$onzeInk" fontSize={24} fontWeight="900">Partida ao vivo</Text>
              <Text color="$onzeMuted">{match?.groupName ?? 'Onze'}</Text>
            </YStack>
          </XStack>

          {error ? (
            <YStack backgroundColor="#FDECEC" borderRadius="$5" padding="$4">
              <Text color="$onzeDanger">{error}</Text>
            </YStack>
          ) : null}

          {match && liveState ? (
            <>
              <LiveScoreboard
                match={match}
                state={liveState}
                teamImageUrl={teamImageUrl}
                onChangeScore={changeScore}
                onRegisterGoal={openGoalModal}
              />

              <GoalTimeline
                events={liveState.goalEvents ?? []}
                cardEvents={liveState.cardEvents ?? []}
                match={match}
                canDelete={liveState.canManage && liveState.status === 'IN_PROGRESS'}
                deletingEventKey={deletingEventKey ?? (scoreSaving ? 'SCORE' : null)}
                onDelete={confirmTimelineEventDeletion}
              />

              {!liveState.canManage && liveState.status === 'IN_PROGRESS' ? (
                <YStack
                  backgroundColor="#E8F7EE"
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
                  <Button
                    backgroundColor="#D6A600"
                    height={54}
                    onPress={openCardModal}
                    pressStyle={{ opacity: 0.8 }}
                  >
                    <Text color="$onzeSurface" fontWeight="900">Registrar cartão</Text>
                  </Button>
                  <Button
                    backgroundColor="$onzeGreen"
                    height={54}
                    onPress={() => setManagementAction('finish')}
                    pressStyle={{ backgroundColor: '$onzeGreenPress', opacity: 0.85 }}
                  >
                    <Text color="$onzeSurface" fontWeight="900">Finalizar partida</Text>
                  </Button>
                  <Button
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeDanger"
                    borderWidth={1}
                    height={54}
                    onPress={() => setManagementAction('reset')}
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Text color="$onzeDanger" fontWeight="900">Resetar jogo</Text>
                  </Button>
                </YStack>
              ) : null}
            </>
          ) : (
            <Button backgroundColor="$onzeGreen" onPress={() => void loadLiveMatch()}>
              <Text color="$onzeSurface" fontWeight="900">Tentar novamente</Text>
            </Button>
          )}
        </YStack>
      </ScrollView>

      <ConfirmActionModal
        visible={managementAction != null}
        title={managementAction === 'reset' ? 'Resetar este jogo?' : 'Finalizar esta partida?'}
        message={managementAction === 'reset'
          ? 'O jogo voltará para Agendado. O cronômetro e todo o placar atual serão apagados.'
          : 'A partida será encerrada, o cronômetro ficará congelado e o placar será salvo.'}
        confirmLabel={managementAction === 'reset' ? 'Resetar jogo' : 'Finalizar partida'}
        destructive={managementAction === 'reset'}
        loading={managing}
        onCancel={() => setManagementAction(null)}
        onConfirm={() => void confirmManagementAction()}
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
