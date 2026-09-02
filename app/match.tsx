import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { PaymentSettlementModal } from '../src/components/payment-settlement-modal';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  AttendanceStatus,
  cancelMatch,
  confirmMatchPayment,
  CreditAllocationStatus,
  endMatchSeries,
  FootballMatch,
  getMatch,
  MatchAttendance,
  PaymentSettlementResolution,
  PaymentSettlementStatus,
  PaymentStatus,
  reportMatchPayment,
  resolveMatchPaymentSettlement,
  resolveMatchPaymentSettlements,
  updateMatchAttendance,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import {
  registerNotificationsForSession,
  syncSingleMatchNotifications,
} from '../src/lib/notifications';
import { formatCurrency } from '../src/lib/payment';

type ManagementAction = 'cancel-occurrence' | 'end-series' | null;
type PaymentBadgeColor = '$onzeGreen' | '$onzeDanger' | '$onzeMuted' | '#8A6414';

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

function formatDeadline(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export default function MatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAttendance, setUpdatingAttendance] = useState<AttendanceStatus | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [pendingAttendanceStatus, setPendingAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [settlementPlayer, setSettlementPlayer] = useState<MatchAttendance | null>(null);
  const [selectedSettlements, setSelectedSettlements] = useState<string[]>([]);
  const [bulkResolution, setBulkResolution] = useState<PaymentSettlementResolution | null>(null);
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
      const loadedMatch = await getMatch(token, params.matchId);
      setMatch(loadedMatch);
      if (loadedMatch.status === 'CANCELLED' && loadedMatch.canManage) {
        setSelectedSettlements(loadedMatch.attendances
          .filter((attendance) => isSettlementOpen(attendance.paymentSettlementStatus))
          .map((attendance) => attendance.userId));
      }
      syncNotifications(token, loadedMatch);
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
      const updatedMatch = await updateMatchAttendance(token, match.id, status);
      setMatch(updatedMatch);
      setPendingAttendanceStatus(null);
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível salvar sua presença.');
    } finally {
      setUpdatingAttendance(null);
    }
  }

  function requestAttendance(status: AttendanceStatus) {
    if (!match || updatingAttendance) return;
    if (status === 'NOT_GOING'
        && match.myAttendance !== 'NOT_GOING'
        && match.paymentRequired
        && match.myPaymentStatus != null) {
      setPendingAttendanceStatus(status);
      return;
    }
    void confirmAttendance(status);
  }

  async function reportPayment() {
    if (!match || updatingPayment) return;
    setUpdatingPayment('current-user');
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await reportMatchPayment(token, match.id);
      setMatch(updatedMatch);
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível informar o pagamento.');
    } finally {
      setUpdatingPayment(null);
    }
  }

  async function confirmPlayerPayment(playerUserId: string) {
    if (!match || updatingPayment) return;
    setUpdatingPayment(playerUserId);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await confirmMatchPayment(token, match.id, playerUserId);
      setMatch(updatedMatch);
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível confirmar o pagamento.');
    } finally {
      setUpdatingPayment(null);
    }
  }

  async function resolvePlayerSettlement(resolution: PaymentSettlementResolution) {
    if (!match || !settlementPlayer || updatingPayment) return;
    setUpdatingPayment(settlementPlayer.userId);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await resolveMatchPaymentSettlement(
        token,
        match.id,
        settlementPlayer.userId,
        resolution,
      );
      setMatch(updatedMatch);
      setSettlementPlayer(null);
      setSelectedSettlements((current) => current.filter((userId) => userId !== settlementPlayer.userId));
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível resolver o acerto.');
    } finally {
      setUpdatingPayment(null);
    }
  }

  async function resolveSelectedSettlements() {
    if (!match || !bulkResolution || !selectedSettlements.length || updatingPayment) return;
    setUpdatingPayment('bulk');
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await resolveMatchPaymentSettlements(
        token,
        match.id,
        selectedSettlements,
        bulkResolution,
      );
      setMatch(updatedMatch);
      setSelectedSettlements([]);
      setBulkResolution(null);
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setBulkResolution(null);
      setError(exception instanceof Error ? exception.message : 'Não foi possível resolver os acertos selecionados.');
    } finally {
      setUpdatingPayment(null);
    }
  }

  function toggleSettlementSelection(playerUserId: string) {
    setSelectedSettlements((current) => current.includes(playerUserId)
      ? current.filter((userId) => userId !== playerUserId)
      : [...current, playerUserId]);
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
      const updatedMatch = await getMatch(token, match.id);
      setMatch(updatedMatch);
      if (managementAction === 'cancel-occurrence') {
        setSelectedSettlements(updatedMatch.attendances
          .filter((attendance) => isSettlementOpen(attendance.paymentSettlementStatus))
          .map((attendance) => attendance.userId));
      }
      syncNotifications(token, updatedMatch);
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

  function syncNotifications(accessToken: string, updatedMatch: FootballMatch) {
    void registerNotificationsForSession(accessToken)
      .then((registration) => syncSingleMatchNotifications(updatedMatch, registration))
      .catch(() => undefined);
  }

  if (loading && !match) {
    return <ServerLoadingScreen title="Carregando jogo..." message="Buscando a lista de presença." />;
  }

  const going = match?.attendances.filter((attendance) => attendance.status === 'GOING') ?? [];
  const removedForPaymentDeadline = match?.attendances.filter(
    (attendance) => attendance.paymentDeadlineRemovedAt != null,
  ) ?? [];
  const notGoing = match?.attendances.filter(
    (attendance) => attendance.status === 'NOT_GOING' && attendance.paymentDeadlineRemovedAt == null,
  ) ?? [];
  const awaiting = match?.attendances.filter((attendance) => attendance.status === 'PENDING') ?? [];
  const payments = match?.attendances.filter((attendance) => attendance.paymentStatus != null) ?? [];
  const openSettlements = payments.filter((attendance) => isSettlementOpen(attendance.paymentSettlementStatus));
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

              <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
                <Text color="$onzeInk" fontSize={17} fontWeight="900">Prazos</Text>
                <XStack alignItems="center" gap="$3" justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text color="$onzeMuted" fontSize={11} fontWeight="900">ENTRAR NA LISTA ATÉ</Text>
                    <Text color="$onzeInk" fontSize={13} fontWeight="800">
                      {formatDeadline(match.signupDeadline, match.timeZone)}
                    </Text>
                  </YStack>
                  <Text color={match.signupOpen ? '$onzeGreen' : '$onzeDanger'} fontSize={11} fontWeight="900">
                    {match.signupOpen ? 'ABERTA' : 'ENCERRADA'}
                  </Text>
                </XStack>
                {match.paymentRequired && match.paymentDeadline ? (
                  <XStack alignItems="center" gap="$3" justifyContent="space-between">
                    <YStack flex={1} gap="$1">
                      <Text color="$onzeMuted" fontSize={11} fontWeight="900">PAGAR ATÉ</Text>
                      <Text color="$onzeInk" fontSize={13} fontWeight="800">
                        {formatDeadline(match.paymentDeadline, match.timeZone)}
                      </Text>
                    </YStack>
                    <Text color={match.paymentOpen ? '$onzeGreen' : '$onzeDanger'} fontSize={11} fontWeight="900">
                      {match.paymentOpen ? 'EM ABERTO' : 'ENCERRADO'}
                    </Text>
                  </XStack>
                ) : null}
              </YStack>

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
                    <Text color="$onzeInk" fontSize={19} fontWeight="900">
                      {!match.signupOpen && match.myAttendance !== 'GOING'
                        ? 'Lista encerrada'
                        : match.myAttendance === 'GOING' && !match.canWithdraw
                          ? 'Sua vaga está confirmada'
                          : 'Você vai jogar?'}
                    </Text>
                    <Text color="$onzeMuted" fontSize={13}>
                      {!match.signupOpen && match.myAttendance !== 'GOING'
                        ? `O prazo terminou com ${match.goingCount} de ${match.maxPlayers} vagas preenchidas.`
                        : match.myAttendance === 'GOING' && !match.canWithdraw
                          ? 'O prazo de pagamento terminou. Como seu pagamento está protegido, seu nome não pode mais ser retirado da lista.'
                          : `${match.goingCount} de ${match.maxPlayers} vagas preenchidas.`}
                    </Text>
                  </YStack>
                  <XStack gap="$3">
                    <Button
                      backgroundColor={match.myAttendance === 'GOING' ? '$onzeGreen' : '$onzeSurface'}
                      borderColor="$onzeGreen"
                      borderWidth={1}
                      disabled={Boolean(updatingAttendance)
                        || (!match.signupOpen && match.myAttendance !== 'GOING')}
                      flex={1}
                      height={50}
                      onPress={() => requestAttendance('GOING')}
                    >
                      <Text color={match.myAttendance === 'GOING' ? '$onzeSurface' : '$onzeGreen'} fontWeight="900">
                        {updatingAttendance === 'GOING' ? 'Salvando...' : '✓ Vou jogar'}
                      </Text>
                    </Button>
                    <Button
                      backgroundColor={match.myAttendance === 'NOT_GOING' ? '$onzeDanger' : '$onzeSurface'}
                      borderColor="$onzeDanger"
                      borderWidth={1}
                      disabled={Boolean(updatingAttendance)
                        || (match.myAttendance === 'GOING'
                          ? !match.canWithdraw
                          : !match.signupOpen)}
                      flex={1}
                      height={50}
                      onPress={() => requestAttendance('NOT_GOING')}
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

              {match.paymentRequired && match.myPaymentStatus != null ? (
                <YStack
                  backgroundColor={match.myPaymentStatus === 'PAID'
                    ? '#EAF7EF'
                    : '$onzeSurface'}
                  borderColor={match.myPaymentStatus === 'PAID'
                    ? '$onzeGreen'
                    : '$onzeBorder'}
                  borderRadius="$6"
                  borderWidth={1}
                  gap="$3"
                  padding="$5"
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text color="$onzeInk" fontSize={18} fontWeight="900">Pagamento</Text>
                    <PaymentBadge
                      status={match.myPaymentStatus}
                      settlementStatus={match.myPaymentSettlementStatus}
                      creditAllocationStatus={match.myCreditAllocationStatus}
                    />
                  </XStack>
                  <Text color="$onzeInk" fontSize={24} fontWeight="900">
                    {formatCurrency(match.paymentAmount ?? 0)}
                  </Text>
                  {(match.myCreditAppliedAmount ?? 0) > 0 ? (
                    <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$2" padding="$4">
                      <XStack justifyContent="space-between" gap="$3">
                        <Text color="$onzeMuted" fontSize={12}>Crédito utilizado</Text>
                        <Text color="$onzeGreen" fontSize={13} fontWeight="900">
                          {formatCurrency(match.myCreditAppliedAmount ?? 0)}
                        </Text>
                      </XStack>
                      <XStack justifyContent="space-between" gap="$3">
                        <Text color="$onzeMuted" fontSize={12}>Restante via PIX</Text>
                        <Text color="$onzeInk" fontSize={13} fontWeight="900">
                          {formatCurrency(match.myRemainingPaymentAmount ?? 0)}
                        </Text>
                      </XStack>
                    </YStack>
                  ) : null}
                  {match.myAttendance === 'PENDING' ? (
                    <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                      Seu crédito está reservado. Confirme “Vou jogar” para aplicá-lo; se você não for, o saldo continuará disponível.
                    </Text>
                  ) : match.myAttendance === 'GOING' ? (
                    <>
                      {(match.myRemainingPaymentAmount ?? 0) > 0 ? (
                        <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$1" padding="$4">
                          <Text color="$onzeMuted" fontSize={11} fontWeight="900">CHAVE PIX</Text>
                          <Text color="$onzeInk" fontSize={14} fontWeight="800" selectable>
                            {match.pixKey}
                          </Text>
                        </YStack>
                      ) : null}
                      {match.myPaymentStatus === 'PENDING' && match.paymentOpen ? (
                        <Button
                          backgroundColor="$onzeGreen"
                          disabled={Boolean(updatingPayment)}
                          height={50}
                          onPress={() => void reportPayment()}
                        >
                          <Text color="$onzeSurface" fontWeight="900">
                            {updatingPayment === 'current-user' ? 'Informando...' : 'Já paguei'}
                          </Text>
                        </Button>
                      ) : match.myPaymentStatus === 'PENDING' ? (
                        <Text color="$onzeDanger" fontSize={13} lineHeight={19}>
                          O prazo de pagamento terminou e não é mais possível informar o PIX.
                        </Text>
                      ) : match.myPaymentStatus === 'REPORTED' ? (
                        <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                          Pagamento informado. Agora o administrador precisa validar o recebimento.
                        </Text>
                      ) : (
                        <Text color="$onzeGreen" fontSize={13} fontWeight="800">
                          {match.myCreditAllocationStatus === 'APPLIED'
                            ? 'Pagamento confirmado automaticamente com seu crédito.'
                            : 'Recebimento confirmado pelo administrador.'}
                        </Text>
                      )}
                    </>
                  ) : (
                    <YStack gap="$2">
                      {match.myPaymentDeadlineRemovedAt ? (
                        <Text color="$onzeDanger" fontSize={13} fontWeight="800" lineHeight={19}>
                          Você foi removido automaticamente porque o pagamento não foi informado até o prazo.
                        </Text>
                      ) : null}
                      <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                        {withdrawalPaymentMessage(
                          match.myPaymentStatus,
                          match.myPaymentSettlementStatus,
                        )}
                      </Text>
                    </YStack>
                  )}
                </YStack>
              ) : null}

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
                {awaiting.length ? (
                  <AttendanceList
                    title="AINDA NÃO RESPONDERAM"
                    empty=""
                    names={awaiting.map((item) => item.displayName)}
                    muted
                  />
                ) : null}
                {notGoing.length ? (
                  <AttendanceList title="NÃO VÃO" empty="" names={notGoing.map((item) => item.displayName)} muted />
                ) : null}
                {removedForPaymentDeadline.length ? (
                  <AttendanceList
                    title="REMOVIDOS POR PRAZO DE PAGAMENTO"
                    empty=""
                    names={removedForPaymentDeadline.map((item) => item.displayName)}
                    danger
                  />
                ) : null}
              </YStack>

              {match.canManage && match.paymentRequired && payments.length ? (
                <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
                  <YStack gap="$1">
                    <Text color="$onzeInk" fontSize={18} fontWeight="900">Pagamentos e acertos</Text>
                    <Text color="$onzeMuted" fontSize={13}>
                      {match.status === 'CANCELLED'
                        ? 'Selecione uma ou várias pessoas para registrar reembolso ou manter o valor como crédito.'
                        : 'Confira o PIX antes de validar pagamentos ou resolver saídas.'}
                    </Text>
                  </YStack>
                  {match.status === 'CANCELLED' && openSettlements.length ? (
                    <Button
                      backgroundColor="$onzeSurface"
                      borderColor="$onzeBorder"
                      borderWidth={1}
                      justifyContent="flex-start"
                      onPress={() => setSelectedSettlements(
                        selectedSettlements.length === openSettlements.length
                          ? []
                          : openSettlements.map((attendance) => attendance.userId),
                      )}
                    >
                      <Text color="$onzeInk" fontWeight="800">
                        {selectedSettlements.length === openSettlements.length ? '☑' : '☐'} Selecionar todos
                      </Text>
                    </Button>
                  ) : null}
                  {payments.map((attendance) => (
                    <YStack
                      key={attendance.userId}
                      backgroundColor="$onzeCanvas"
                      borderRadius="$4"
                      gap="$3"
                      padding="$4"
                    >
                      <XStack alignItems="center" gap="$3">
                        {match.status === 'CANCELLED'
                            && isSettlementOpen(attendance.paymentSettlementStatus) ? (
                          <Button
                            circular
                            backgroundColor={selectedSettlements.includes(attendance.userId)
                              ? '$onzeGreen'
                              : '$onzeSurface'}
                            borderColor="$onzeGreen"
                            borderWidth={1}
                            height={36}
                            onPress={() => toggleSettlementSelection(attendance.userId)}
                            width={36}
                          >
                            <Text
                              color={selectedSettlements.includes(attendance.userId)
                                ? '$onzeSurface'
                                : '$onzeGreen'}
                              fontWeight="900"
                            >
                              {selectedSettlements.includes(attendance.userId) ? '✓' : ''}
                            </Text>
                          </Button>
                        ) : null}
                        <YStack flex={1} gap="$1">
                          <Text color="$onzeInk" fontSize={14} fontWeight="800">{attendance.displayName}</Text>
                          {attendance.paymentDeadlineRemovedAt ? (
                            <Text color="$onzeDanger" fontSize={11} fontWeight="800">REMOVIDO POR FALTA DE PAGAMENTO</Text>
                          ) : attendance.status === 'NOT_GOING' ? (
                            <Text color="$onzeDanger" fontSize={11} fontWeight="800">NÃO VAI AO JOGO</Text>
                          ) : attendance.status === 'PENDING' ? (
                            <Text color="$onzeMuted" fontSize={11} fontWeight="800">AINDA NÃO RESPONDEU</Text>
                          ) : null}
                          <PaymentBadge
                            status={attendance.paymentStatus}
                            settlementStatus={attendance.paymentSettlementStatus}
                            creditAllocationStatus={attendance.creditAllocationStatus}
                          />
                          {(attendance.creditAppliedAmount ?? 0) > 0 ? (
                            <Text color="$onzeMuted" fontSize={11}>
                              {formatCurrency(attendance.creditAppliedAmount ?? 0)} em crédito · {' '}
                              {formatCurrency(attendance.remainingPaymentAmount ?? 0)} restante
                            </Text>
                          ) : null}
                        </YStack>
                      </XStack>
                      {attendance.status === 'GOING'
                          && attendance.paymentStatus !== 'PAID'
                          && attendance.paymentStatus !== 'CANCELLED' ? (
                        <Button
                          backgroundColor="$onzeSurface"
                          borderColor="$onzeGreen"
                          borderWidth={1}
                          disabled={Boolean(updatingPayment)}
                          onPress={() => void confirmPlayerPayment(attendance.userId)}
                        >
                          <Text color="$onzeGreen" fontSize={12} fontWeight="900">
                            {updatingPayment === attendance.userId ? 'Validando...' : 'Confirmar'}
                          </Text>
                        </Button>
                      ) : null}
                      {(attendance.status === 'NOT_GOING' || match.status === 'CANCELLED')
                          && isSettlementOpen(attendance.paymentSettlementStatus)
                          && match.status !== 'CANCELLED' ? (
                        <Button
                          backgroundColor="$onzeGreen"
                          disabled={Boolean(updatingPayment)}
                          onPress={() => setSettlementPlayer(attendance)}
                        >
                          <Text color="$onzeSurface" fontSize={12} fontWeight="900">
                            Resolver acerto
                          </Text>
                        </Button>
                      ) : null}
                    </YStack>
                  ))}
                  {match.status === 'CANCELLED' && selectedSettlements.length ? (
                    <YStack gap="$2">
                      <Text color="$onzeMuted" fontSize={12} fontWeight="800">
                        {selectedSettlements.length} {selectedSettlements.length === 1 ? 'jogador selecionado' : 'jogadores selecionados'}
                      </Text>
                      <Button
                        backgroundColor="$onzeSurface"
                        borderColor="$onzeGreen"
                        borderWidth={1}
                        disabled={Boolean(updatingPayment)}
                        onPress={() => setBulkResolution('REFUNDED')}
                      >
                        <Text color="$onzeGreen" fontWeight="900">Reembolsar selecionados</Text>
                      </Button>
                      <Button
                        backgroundColor="$onzeGreen"
                        disabled={Boolean(updatingPayment)}
                        onPress={() => setBulkResolution('CREDITED')}
                      >
                        <Text color="$onzeSurface" fontWeight="900">Manter como crédito</Text>
                      </Button>
                    </YStack>
                  ) : null}
                </YStack>
              ) : null}

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
                ? 'Somente esta ocorrência será cancelada. Os outros jogos semanais continuarão normalmente. Pagamentos confirmados ficarão disponíveis para acerto.'
                : 'O jogo será cancelado e ninguém poderá mais confirmar presença. Pagamentos confirmados ficarão disponíveis para reembolso ou crédito.'
          }
          confirmLabel={actionIsEndSeries ? 'Encerrar sequência' : 'Cancelar jogo'}
          destructive
          loading={managing}
          onCancel={() => setManagementAction(null)}
          onConfirm={() => void confirmManagementAction()}
        />
      ) : null}

      {match ? (
        <ConfirmActionModal
          visible={pendingAttendanceStatus === 'NOT_GOING'}
          title="Confirmar que não vai?"
          message={withdrawalConfirmationMessage(
            match.myPaymentStatus,
            match.myCreditAllocationStatus,
            match.myRemainingPaymentAmount,
          ) + (match.signupOpen
            ? ''
            : ' Como o prazo de inscrição já terminou, você não poderá entrar novamente nesta lista.')}
          confirmLabel="Liberar minha vaga"
          destructive
          loading={updatingAttendance === 'NOT_GOING'}
          onCancel={() => setPendingAttendanceStatus(null)}
          onConfirm={() => void confirmAttendance('NOT_GOING')}
        />
      ) : null}

      <ConfirmActionModal
        visible={bulkResolution != null}
        title={bulkResolution === 'CREDITED'
          ? 'Manter valores como crédito?'
          : 'Confirmar reembolsos?'}
        message={bulkResolution === 'CREDITED'
          ? `O saldo de ${selectedSettlements.length} ${selectedSettlements.length === 1 ? 'jogador' : 'jogadores'} será aplicado automaticamente à próxima partida paga do grupo.`
          : `Confirme que o reembolso de ${selectedSettlements.length} ${selectedSettlements.length === 1 ? 'jogador foi realizado' : 'jogadores foi realizado'}.`}
        confirmLabel={bulkResolution === 'CREDITED' ? 'Manter como crédito' : 'Confirmar reembolso'}
        loading={updatingPayment === 'bulk'}
        onCancel={() => setBulkResolution(null)}
        onConfirm={() => void resolveSelectedSettlements()}
      />

      <PaymentSettlementModal
        visible={settlementPlayer != null}
        playerName={settlementPlayer?.displayName ?? ''}
        reviewRequired={settlementPlayer?.paymentSettlementStatus === 'REVIEW_REQUIRED'}
        loading={updatingPayment === settlementPlayer?.userId}
        onCancel={() => setSettlementPlayer(null)}
        onResolve={(resolution) => void resolvePlayerSettlement(resolution)}
      />
    </SafeAreaView>
  );
}

function PaymentBadge({
  status,
  settlementStatus,
  creditAllocationStatus,
}: {
  status: PaymentStatus | null;
  settlementStatus: PaymentSettlementStatus | null;
  creditAllocationStatus: CreditAllocationStatus | null;
}) {
  const settlement = settlementBadge(settlementStatus);
  const label = settlement?.label
    ?? (creditAllocationStatus === 'RESERVED'
      ? 'CRÉDITO RESERVADO'
      : creditAllocationStatus === 'APPLIED' && status === 'PAID'
        ? 'PAGO COM CRÉDITO'
        : creditAllocationStatus === 'APPLIED' && status === 'PENDING'
          ? 'CRÉDITO APLICADO · RESTANTE PENDENTE'
        : status === 'PAID'
          ? 'PAGO'
          : status === 'REPORTED'
            ? 'AGUARDANDO VALIDAÇÃO'
            : status === 'CANCELLED'
              ? 'COBRANÇA CANCELADA'
              : 'PENDENTE');
  const color = settlement?.color
    ?? (creditAllocationStatus === 'RESERVED'
      ? '$onzeGreen'
      : creditAllocationStatus === 'APPLIED' && status === 'PAID'
        ? '$onzeGreen'
        : status === 'PAID'
      ? '$onzeGreen'
      : status === 'REPORTED'
        ? '#8A6414'
        : status === 'CANCELLED'
          ? '$onzeMuted'
          : '$onzeDanger');
  return (
    <Text color={color} fontSize={11} fontWeight="900">
      {label}
    </Text>
  );
}

function settlementBadge(status: PaymentSettlementStatus | null): {
  label: string;
  color: PaymentBadgeColor;
} | null {
  switch (status) {
    case 'REVIEW_REQUIRED':
      return { label: 'PAGAMENTO EM REVISÃO', color: '#8A6414' };
    case 'PENDING':
      return { label: 'ACERTO PENDENTE', color: '$onzeDanger' };
    case 'NOT_RECEIVED':
      return { label: 'PAGAMENTO NÃO LOCALIZADO', color: '$onzeMuted' };
    case 'REFUNDED':
      return { label: 'REEMBOLSADO', color: '$onzeGreen' };
    case 'CREDITED':
      return { label: 'CRÉDITO REGISTRADO', color: '$onzeGreen' };
    case 'RETAINED':
      return { label: 'PAGAMENTO MANTIDO', color: '#8A6414' };
    default:
      return null;
  }
}

function withdrawalConfirmationMessage(
  status: PaymentStatus | null,
  creditAllocationStatus: CreditAllocationStatus | null,
  remainingPaymentAmount: number | null,
) {
  if (creditAllocationStatus != null) {
    if (status === 'REPORTED') {
      return 'O crédito reservado voltará ao seu saldo. Como você informou o pagamento do restante via PIX, o administrador será avisado para conferir esse valor.';
    }
    if (status === 'PAID' && (remainingPaymentAmount ?? 0) > 0) {
      return 'O crédito aplicado voltará ao seu saldo. O valor complementar pago via PIX ficará aguardando reembolso, crédito ou outra decisão do administrador.';
    }
    return creditAllocationStatus === 'RESERVED'
      ? 'A reserva será removida e o crédito continuará disponível para outra partida deste grupo.'
      : 'Sua vaga será liberada e o crédito utilizado voltará automaticamente para o próximo jogo.';
  }
  if (status === 'PENDING') {
    return 'Sua vaga será liberada imediatamente e a cobrança que ainda estava pendente será cancelada.';
  }
  if (status === 'REPORTED') {
    return 'Sua vaga será liberada. Como você informou que já pagou, o administrador será avisado para conferir o PIX e resolver o acerto.';
  }
  if (status === 'PAID') {
    return 'Sua vaga será liberada. Como o pagamento já foi confirmado, o administrador será avisado para registrar reembolso, crédito ou manutenção do valor.';
  }
  return 'Sua vaga será liberada imediatamente para outro jogador.';
}

function withdrawalPaymentMessage(
  status: PaymentStatus,
  settlementStatus: PaymentSettlementStatus | null,
) {
  switch (settlementStatus) {
    case 'REVIEW_REQUIRED':
      return 'Você informou o pagamento antes de sair. O administrador foi avisado e está conferindo o recebimento.';
    case 'PENDING':
      return 'Seu pagamento foi confirmado e o administrador precisa registrar reembolso, crédito ou manutenção do valor.';
    case 'NOT_RECEIVED':
      return 'O administrador informou que nenhum pagamento foi localizado. A cobrança ficou encerrada.';
    case 'REFUNDED':
      return 'O administrador registrou que o pagamento foi reembolsado.';
    case 'CREDITED':
      return 'O valor ficou registrado como crédito para uma próxima partida.';
    case 'RETAINED':
      return 'O administrador registrou que o pagamento será mantido.';
    default:
      return status === 'CANCELLED'
        ? 'Sua vaga foi liberada e a cobrança pendente foi cancelada.'
        : 'O histórico deste pagamento continua registrado.';
  }
}

function isSettlementOpen(status: PaymentSettlementStatus | null) {
  return status === 'REVIEW_REQUIRED' || status === 'PENDING';
}

function AttendanceList({
  title,
  names,
  empty,
  muted = false,
  danger = false,
}: {
  title: string;
  names: string[];
  empty: string;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <YStack gap="$2">
      <Text color="$onzeMuted" fontSize={11} fontWeight="900">{title}</Text>
      {names.length ? names.map((name, index) => (
        <XStack key={`${name}-${index}`} alignItems="center" gap="$2">
          <Text color={danger ? '$onzeDanger' : muted ? '$onzeMuted' : '$onzeGreen'} fontSize={13}>
            {danger ? '!' : muted ? '–' : '✓'}
          </Text>
          <Text color={danger ? '$onzeDanger' : muted ? '$onzeMuted' : '$onzeInk'} fontSize={14} fontWeight="700">{name}</Text>
        </XStack>
      )) : (
        <Text color="$onzeMuted" fontSize={13}>{empty}</Text>
      )}
    </YStack>
  );
}
