import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  AttendanceStatus,
  cancelMatch,
  endMatchSeries,
  FootballMatch,
  getMatch,
  updateMatchAttendance,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';

type ManagementAction = 'cancel-occurrence' | 'end-series' | null;

function formatDateTime(match: FootballMatch) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: match.timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(match.startsAt));
}

function formatOpening(match: FootballMatch) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: match.timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(match.attendanceOpensAt));
}

export default function MatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAttendance, setUpdatingAttendance] = useState<AttendanceStatus | null>(null);
  const [managementAction, setManagementAction] = useState<ManagementAction>(null);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goToLogin() {
    router.replace({
      pathname: '/',
      params: params.matchId ? { matchId: params.matchId } : {},
    });
  }

  useFocusEffect(
    useCallback(() => {
      void loadMatch();
    }, [params.matchId]),
  );

  async function loadMatch() {
    if (!params.matchId) {
      setError('Não foi possível identificar o jogo.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      setMatch(await getMatch(token, params.matchId));
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession();
        goToLogin();
        return;
      }
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar o jogo.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmAttendance(status: AttendanceStatus) {
    if (!match || updatingAttendance) return;
    setUpdatingAttendance(status);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      setMatch(await updateMatchAttendance(token, match.id, status));
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível salvar sua presença.');
    } finally {
      setUpdatingAttendance(null);
    }
  }

  async function confirmManagementAction() {
    if (!match || !managementAction || managing) return;
    setManaging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      if (managementAction === 'end-series' && match.seriesId) {
        await endMatchSeries(token, match.seriesId);
      } else {
        await cancelMatch(token, match.id);
      }
      setManagementAction(null);
      setMatch(await getMatch(token, match.id));
    } catch (exception) {
      setManagementAction(null);
      setError(exception instanceof Error ? exception.message : 'Não foi possível alterar este jogo.');
    } finally {
      setManaging(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  if (loading && !match) {
    return <ServerLoadingScreen title="Carregando jogo..." message="Buscando a lista de presença." />;
  }

  const going = match?.attendances.filter((attendance) => attendance.status === 'GOING') ?? [];
  const notGoing = match?.attendances.filter((attendance) => attendance.status === 'NOT_GOING') ?? [];
  const actionIsEndSeries = managementAction === 'end-series';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <YStack gap="$5" paddingVertical="$3">
          <Button alignSelf="flex-start" backgroundColor="transparent" onPress={goBack}>
            <Text color="$onzeGreen" fontWeight="800">← Voltar</Text>
          </Button>

          {match ? (
            <>
              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Text color="$onzeGreen" fontSize={13} fontWeight="900">
                    {match.groupName.toUpperCase()}
                  </Text>
                  {match.recurrence === 'WEEKLY' ? (
                    <Text color="$onzeMuted" fontSize={11} fontWeight="800">• SEMANAL</Text>
                  ) : null}
                </XStack>
                <Text color="$onzeInk" fontSize={28} fontWeight="900" textTransform="capitalize">
                  {formatDateTime(match)}
                </Text>
                <Text color="$onzeMuted" fontSize={15}>📍 {match.venue}</Text>
              </YStack>

              {error ? (
                <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$5" borderWidth={1} padding="$4">
                  <Text color="$onzeDanger" fontSize={13}>{error}</Text>
                </YStack>
              ) : null}

              {match.status === 'CANCELLED' ? (
                <YStack backgroundColor="#FDECEC" borderColor="$onzeDanger" borderRadius="$6" borderWidth={1} gap="$2" padding="$5">
                  <Text color="$onzeDanger" fontSize={18} fontWeight="900">Jogo cancelado</Text>
                  <Text color="$onzeDanger" fontSize={13} lineHeight={19}>
                    Esta ocorrência não acontecerá. As presenças ficaram encerradas.
                  </Text>
                </YStack>
              ) : match.attendanceOpen ? (
                <YStack
                  backgroundColor="$onzeSurface"
                  borderColor="$onzeBorder"
                  borderRadius="$6"
                  borderWidth={1}
                  gap="$4"
                  padding="$5"
                >
                  <YStack gap="$1">
                    <Text color="$onzeInk" fontSize={19} fontWeight="900">Você vai jogar?</Text>
                    <Text color="$onzeMuted" fontSize={13}>
                      {match.goingCount} de {match.maxPlayers} vagas preenchidas.
                    </Text>
                  </YStack>
                  <XStack gap="$3">
                    <Button
                      backgroundColor={match.myAttendance === 'GOING' ? '$onzeGreen' : '$onzeSurface'}
                      borderColor="$onzeGreen"
                      borderWidth={1}
                      disabled={Boolean(updatingAttendance)}
                      flex={1}
                      height={50}
                      onPress={() => void confirmAttendance('GOING')}
                    >
                      <Text color={match.myAttendance === 'GOING' ? '$onzeSurface' : '$onzeGreen'} fontWeight="900">
                        {updatingAttendance === 'GOING' ? 'Salvando...' : '✓ Vou jogar'}
                      </Text>
                    </Button>
                    <Button
                      backgroundColor={match.myAttendance === 'NOT_GOING' ? '$onzeDanger' : '$onzeSurface'}
                      borderColor="$onzeDanger"
                      borderWidth={1}
                      disabled={Boolean(updatingAttendance)}
                      flex={1}
                      height={50}
                      onPress={() => void confirmAttendance('NOT_GOING')}
                    >
                      <Text color={match.myAttendance === 'NOT_GOING' ? '$onzeSurface' : '$onzeDanger'} fontWeight="900">
                        {updatingAttendance === 'NOT_GOING' ? 'Salvando...' : 'Não vou'}
                      </Text>
                    </Button>
                  </XStack>
                </YStack>
              ) : (
                <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$2" padding="$5">
                  <Text color="$onzeInk" fontSize={18} fontWeight="900">Presença ainda fechada</Text>
                  <Text color="$onzeMuted" fontSize={13} lineHeight={20} textTransform="capitalize">
                    Ela será liberada em {formatOpening(match)}. Você receberá um aviso.
                  </Text>
                </YStack>
              )}

              {match.notes ? (
                <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$2" padding="$5">
                  <Text color="$onzeInk" fontSize={17} fontWeight="900">Observações</Text>
                  <Text color="$onzeMuted" fontSize={14} lineHeight={21}>{match.notes}</Text>
                </YStack>
              ) : null}

              <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text color="$onzeInk" fontSize={18} fontWeight="900">Lista de presença</Text>
                  <Text color="$onzeGreen" fontSize={13} fontWeight="900">{going.length}/{match.maxPlayers}</Text>
                </XStack>

                <AttendanceList title="VÃO JOGAR" empty="Ninguém confirmou ainda." names={going.map((item) => item.displayName)} />
                {notGoing.length ? (
                  <AttendanceList title="NÃO VÃO" empty="" names={notGoing.map((item) => item.displayName)} muted />
                ) : null}
              </YStack>

              {match.canManage && match.status === 'SCHEDULED' ? (
                <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                  <Text color="$onzeInk" fontSize={17} fontWeight="900">Gerenciar jogo</Text>
                  <Button
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeDanger"
                    borderWidth={1}
                    height={48}
                    onPress={() => setManagementAction('cancel-occurrence')}
                  >
                    <Text color="$onzeDanger" fontWeight="800">
                      {match.recurrence === 'WEEKLY' ? 'Cancelar somente este jogo' : 'Cancelar jogo'}
                    </Text>
                  </Button>
                  {match.recurrence === 'WEEKLY' && match.seriesActive ? (
                    <Button
                      backgroundColor="$onzeDanger"
                      height={48}
                      onPress={() => setManagementAction('end-series')}
                    >
                      <Text color="$onzeSurface" fontWeight="800">Encerrar jogos semanais</Text>
                    </Button>
                  ) : null}
                </YStack>
              ) : null}
            </>
          ) : (
            <YStack backgroundColor="$onzeSurface" borderColor="$onzeDanger" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
              <Text color="$onzeDanger">{error ?? 'Jogo não encontrado.'}</Text>
              <Button backgroundColor="$onzeGreen" onPress={() => void loadMatch()}>
                <Text color="$onzeSurface" fontWeight="800">Tentar novamente</Text>
              </Button>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {match ? (
        <ConfirmActionModal
          visible={Boolean(managementAction)}
          title={actionIsEndSeries ? 'Encerrar todos os jogos semanais?' : 'Cancelar este jogo?'}
          message={
            actionIsEndSeries
              ? 'Esta ocorrência e todos os próximos jogos desta sequência serão cancelados. Essa ação não apaga o histórico.'
              : match.recurrence === 'WEEKLY'
                ? 'Somente esta ocorrência será cancelada. Os outros jogos semanais continuarão normalmente.'
                : 'O jogo será cancelado e ninguém poderá mais confirmar presença.'
          }
          confirmLabel={actionIsEndSeries ? 'Encerrar sequência' : 'Cancelar jogo'}
          destructive
          loading={managing}
          onCancel={() => setManagementAction(null)}
          onConfirm={() => void confirmManagementAction()}
        />
      ) : null}
    </SafeAreaView>
  );
}

function AttendanceList({
  title,
  names,
  empty,
  muted = false,
}: {
  title: string;
  names: string[];
  empty: string;
  muted?: boolean;
}) {
  return (
    <YStack gap="$2">
      <Text color="$onzeMuted" fontSize={11} fontWeight="900">{title}</Text>
      {names.length ? names.map((name, index) => (
        <XStack key={`${name}-${index}`} alignItems="center" gap="$2">
          <Text color={muted ? '$onzeMuted' : '$onzeGreen'} fontSize={13}>{muted ? '–' : '✓'}</Text>
          <Text color={muted ? '$onzeMuted' : '$onzeInk'} fontSize={14} fontWeight="700">{name}</Text>
        </XStack>
      )) : (
        <Text color="$onzeMuted" fontSize={13}>{empty}</Text>
      )}
    </YStack>
  );
}
