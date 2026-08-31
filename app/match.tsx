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
  endMatchSeries,
  FootballMatch,
  getMatch,
  MatchAttendance,
  PaymentSettlementResolution,
  PaymentSettlementStatus,
  PaymentStatus,
  reportMatchPayment,
  resolveMatchPaymentSettlement,
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

export default function MatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAttendance, setUpdatingAttendance] = useState<AttendanceStatus | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [pendingAttendanceStatus, setPendingAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [settlementPlayer, setSettlementPlayer] = useState<MatchAttendance | null>(null);
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
        && match.myAttendance === 'GOING'
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
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível resolver o acerto.');
    } finally {
      setUpdatingPayment(null);
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
      const updatedMatch = await getMatch(token, match.id);
      setMatch(updatedMatch);
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
  const notGoing = match?.attendances.filter((attendance) => attendance.status === 'NOT_GOING') ?? [];
  const payments = match?.attendances.filter((attendance) => attendance.paymentStatus != null) ?? [];
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
                      disabled={Boolean(updatingAttendance)}
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
                  backgroundColor={match.myAttendance === 'GOING' && match.myPaymentStatus === 'PAID'
                    ? '#EAF7EF'
                    : '$onzeSurface'}
                  borderColor={match.myAttendance === 'GOING' && match.myPaymentStatus === 'PAID'
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
                    />
                  </XStack>
                  <Text color="$onzeInk" fontSize={24} fontWeight="900">
                    {formatCurrency(match.paymentAmount ?? 0)}
                  </Text>
                  {match.myAttendance === 'GOING' ? (
                    <>
                      <YStack backgroundColor="$onzeCanvas" borderRadius="$4" gap="$1" padding="$4">
                        <Text color="$onzeMuted" fontSize={11} fontWeight="900">CHAVE PIX</Text>
                        <Text color="$onzeInk" fontSize={14} fontWeight="800" selectable>
                          {match.pixKey}
                        </Text>
                      </YStack>
                      {match.myPaymentStatus === 'PENDING' ? (
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
                      ) : match.myPaymentStatus === 'REPORTED' ? (
                        <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                          Pagamento informado. Agora o administrador precisa validar o recebimento.
                        </Text>
                      ) : (
                        <Text color="$onzeGreen" fontSize={13} fontWeight="800">
                          Recebimento confirmado pelo administrador.
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
                      {withdrawalPaymentMessage(
                        match.myPaymentStatus,
                        match.myPaymentSettlementStatus,
                      )}
                    </Text>
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
                {notGoing.length ? (
                  <AttendanceList title="NÃO VÃO" empty="" names={notGoing.map((item) => item.displayName)} muted />
                ) : null}
              </YStack>

              {match.canManage && match.paymentRequired && payments.length ? (
                <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$4" padding="$5">
                  <YStack gap="$1">
                    <Text color="$onzeInk" fontSize={18} fontWeight="900">Pagamentos e acertos</Text>
                    <Text color="$onzeMuted" fontSize={13}>
                      Confira o PIX antes de validar pagamentos ou resolver saídas.
                    </Text>
                  </YStack>
                  {payments.map((attendance) => (
                    <YStack
                      key={attendance.userId}
                      backgroundColor="$onzeCanvas"
                      borderRadius="$4"
                      gap="$3"
                      padding="$4"
                    >
                      <XStack alignItems="center" gap="$3">
                        <YStack flex={1} gap="$1">
                          <Text color="$onzeInk" fontSize={14} fontWeight="800">{attendance.displayName}</Text>
                          {attendance.status === 'NOT_GOING' ? (
                            <Text color="$onzeDanger" fontSize={11} fontWeight="800">NÃO VAI AO JOGO</Text>
                          ) : null}
                          <PaymentBadge
                            status={attendance.paymentStatus}
                            settlementStatus={attendance.paymentSettlementStatus}
                          />
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
                      {attendance.status === 'NOT_GOING'
                          && isSettlementOpen(attendance.paymentSettlementStatus) ? (
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

      {match ? (
        <ConfirmActionModal
          visible={pendingAttendanceStatus === 'NOT_GOING'}
          title="Confirmar que não vai?"
          message={withdrawalConfirmationMessage(match.myPaymentStatus)}
          confirmLabel="Liberar minha vaga"
          destructive
          loading={updatingAttendance === 'NOT_GOING'}
          onCancel={() => setPendingAttendanceStatus(null)}
          onConfirm={() => void confirmAttendance('NOT_GOING')}
        />
      ) : null}

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
}: {
  status: PaymentStatus | null;
  settlementStatus: PaymentSettlementStatus | null;
}) {
  const settlement = settlementBadge(settlementStatus);
  const label = settlement?.label ?? (status === 'PAID'
    ? 'PAGO'
    : status === 'REPORTED'
      ? 'AGUARDANDO VALIDAÇÃO'
      : status === 'CANCELLED'
        ? 'COBRANÇA CANCELADA'
        : 'PENDENTE');
  const color = settlement?.color
    ?? (status === 'PAID'
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

function withdrawalConfirmationMessage(status: PaymentStatus | null) {
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
