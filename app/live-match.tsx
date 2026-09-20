import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { LiveScoreboard } from '../src/components/live-scoreboard';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  finishLiveMatch,
  FootballMatch,
  getLiveMatch,
  getMatch,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingScoreSides, setUpdatingScoreSides] = useState<number[]>([]);
  const updatingScoreSidesRef = useRef(new Set<number>());
  const [managementAction, setManagementAction] = useState<LiveManagementAction>(null);
  const [managing, setManaging] = useState(false);

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
      const [loadedMatch, loadedLiveState, groups] = await Promise.all([
        getMatch(token, params.matchId),
        getLiveMatch(token, params.matchId),
        listGroups(token),
      ]);
      setMatch(loadedMatch);
      setLiveState(loadedLiveState);
      setTeamImageUrl(groups.find((group) => group.id === loadedMatch.groupId)?.photoUrl ?? null);
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

  async function changeScore(sideNumber: number, score: number) {
    if (!match || !liveState || updatingScoreSidesRef.current.has(sideNumber)) return;
    const previousState = liveState;
    updatingScoreSidesRef.current.add(sideNumber);
    setUpdatingScoreSides((current) => [...current, sideNumber]);
    setError(null);
    setLiveState({
      ...liveState,
      scores: liveState.scores.map((side) => side.sideNumber === sideNumber ? { ...side, score } : side),
    });
    try {
      const token = await getAccessToken();
      if (!token) { goToLogin(); return; }
      setLiveState(await updateLiveMatchScore(token, match.id, sideNumber, score));
    } catch (exception) {
      setLiveState(previousState);
      setError(exception instanceof Error ? exception.message : 'Não foi possível atualizar o placar.');
    } finally {
      updatingScoreSidesRef.current.delete(sideNumber);
      setUpdatingScoreSides((current) => current.filter((side) => side !== sideNumber));
    }
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
                updatingSides={updatingScoreSides}
                onChangeScore={(sideNumber, score) => void changeScore(sideNumber, score)}
              />

              {liveState.canManage && liveState.status === 'IN_PROGRESS' ? (
                <YStack gap="$3">
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
    </SafeAreaView>
  );
}
