import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { GoalEventModal } from '../src/components/goal-event-modal';
import { LiveScoreboard } from '../src/components/live-scoreboard';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  createGoalEvent,
  finishLiveMatch,
  FootballMatch,
  getLiveMatch,
  getMatch,
  getMatchTeams,
  MatchTeams,
  LiveMatchState,
  listGroups,
  resetLiveMatch,
  updateLiveMatchScore,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

type LiveManagementAction = 'finish' | 'reset' | null;

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

  function goToLogin() {
    router.replace({ pathname: '/', params: params.matchId ? { matchId: params.matchId } : {} });
  }

  const loadLiveMatch = useCallback(async () => {
    if (!params.matchId) {
      setError('Não foi possível identificar o jogo.');
      setLoading(false);
      return;
    }
    setLoading(true);
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
      setLoading(false);
    }
  }, [params.matchId]);

  useFocusEffect(useCallback(() => { void loadLiveMatch(); }, [loadLiveMatch]));

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
        setLiveState((current) => current ? {
          ...current,
          scores: current.scores.map((side) => side.sideNumber === sideNumber
            ? { ...side, score: confirmedScore }
            : side),
        } : current);
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível atualizar o placar.');
    } finally {
      scoreRequestRunningRef.current.delete(sideNumber);
      setScoreSaving(scoreRequestRunningRef.current.size > 0);
    }
  }

  function openGoalModal() {
    const firstTeam = matchTeams?.teams.find((team) => team.assignments.length > 0);
    if (!firstTeam) {
      setError('Gere os times e adicione os jogadores antes de registrar um gol.');
      return;
    }
    setGoalTeamNumber(firstTeam.teamNumber);
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
      setLiveState(result.liveMatch);
      setGoalModalVisible(false);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível registrar o gol.');
    } finally {
      setSavingGoal(false);
    }
  }

  function changeScore(sideNumber: number, delta: number) {
    if (!match || !liveState) return;
    const displayedScore = liveState.scores.find((side) => side.sideNumber === sideNumber)?.score ?? 0;
    const currentScore = desiredScoresRef.current.get(sideNumber) ?? displayedScore;
    const nextScore = Math.max(0, currentScore + delta);
    if (nextScore === currentScore) return;

    desiredScoresRef.current.set(sideNumber, nextScore);
    setLiveState((current) => current ? {
      ...current,
      scores: current.scores.map((side) => side.sideNumber === sideNumber
        ? { ...side, score: nextScore }
        : side),
    } : current);
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
      setLiveState(await getLiveMatch(token, match.id));
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
              />

              {liveState.canManage && liveState.status === 'IN_PROGRESS' ? (
                <YStack gap="$3">
                  <Button
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeGreen"
                    borderWidth={2}
                    disabled={scoreSaving}
                    height={54}
                    onPress={openGoalModal}
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <Text color="$onzeGreen" fontWeight="900">⚽ Registrar gol</Text>
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
        selectedTeamNumber={goalTeamNumber}
        scorerAssignmentId={scorerAssignmentId}
        assistAssignmentId={assistAssignmentId}
        penalty={penaltyGoal}
        saving={savingGoal}
        onSelectTeam={(teamNumber) => {
          setGoalTeamNumber(teamNumber);
          setScorerAssignmentId(null);
          setAssistAssignmentId(null);
        }}
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
    </SafeAreaView>
  );
}
