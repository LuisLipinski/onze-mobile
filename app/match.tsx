import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { ConfirmActionModal } from '../src/components/confirm-action-modal';
import { GoalkeeperPlayerModal } from '../src/components/goalkeeper-player-modal';
import { MinimumPlayerDecisionCard } from '../src/components/minimum-player-decision-card';
import { PaymentSettlementModal } from '../src/components/payment-settlement-modal';
import { RentalGoalkeeperModal } from '../src/components/rental-goalkeeper-modal';
import { ReplacementPlayerModal } from '../src/components/replacement-player-modal';
import { ServerLoadingScreen } from '../src/components/server-loading-screen';
import {
  ApiRequestError,
  addMatchReplacement,
  addRentalGoalkeeper,
  AttendanceStatus,
  cancelMatch,
  confirmMatchPayment,
  CreditAllocationStatus,
  endMatchSeries,
  FootballMatch,
  GroupMember,
  getMatch,
  getOwnSportsProfile,
  listGroupMembers,
  MatchAttendance,
  MatchGuest,
  PaymentSettlementResolution,
  PaymentSettlementStatus,
  PaymentStatus,
  removeRentalGoalkeeper,
  removeMatchGuest,
  reportMatchPayment,
  RentalGoalkeeper,
  resolveMatchPaymentSettlement,
  resolveMatchPaymentSettlements,
  updateMatchAttendance,
  updateMatchGoalkeeper,
} from '../src/lib/api';
import { clearSession, getAccessToken } from '../src/lib/auth-storage';
import {
  registerNotificationsForSession,
  syncSingleMatchNotifications,
} from '../src/lib/notifications';
import { formatCurrency } from '../src/lib/payment';
import {
  canRemoveGoalkeeperRole,
  missingGoalkeepersMessage,
  secondaryGoalkeeperCandidates,
  volunteerGoalkeeperCandidates,
} from '../src/lib/match-goalkeepers';
import {
  currentMatchAttendance,
  shouldShowCurrentPlayerPayment,
} from '../src/lib/match-payment';
import { modalityLabel } from '../src/lib/match-modality';
import { positionLabel } from '../src/lib/sports-profile';

type ManagementAction = 'cancel-occurrence' | 'end-series' | null;
type GoalkeeperPicker = 'secondary' | 'volunteer' | null;
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
  const [replacementDeparture, setReplacementDeparture] = useState<MatchAttendance | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<GroupMember[]>([]);
  const [selectedReplacementUserId, setSelectedReplacementUserId] = useState<string | null>(null);
  const [replacingPlayer, setReplacingPlayer] = useState(false);
  const [goalkeeperChange, setGoalkeeperChange] = useState<MatchAttendance | null>(null);
  const [goalkeeperPicker, setGoalkeeperPicker] = useState<GoalkeeperPicker>(null);
  const [updatingGoalkeeperId, setUpdatingGoalkeeperId] = useState<string | null>(null);
  const [rentalModalVisible, setRentalModalVisible] = useState(false);
  const [rentalGoalkeeperName, setRentalGoalkeeperName] = useState('');
  const [rentalGoalkeeperError, setRentalGoalkeeperError] = useState<string | null>(null);
  const [rentalToRemove, setRentalToRemove] = useState<RentalGoalkeeper | null>(null);
  const [managingRentalId, setManagingRentalId] = useState<string | null>(null);
  const [managingGuestId, setManagingGuestId] = useState<string | null>(null);
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
      const sportsProfile = await getOwnSportsProfile(token, loadedMatch.groupId);
      if (!sportsProfile.complete) {
        router.replace({
          pathname: '/sports-profile',
          params: {
            groupId: loadedMatch.groupId,
            groupName: loadedMatch.groupName,
            required: 'true',
          },
        });
        return;
      }
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

  async function confirmGoalkeeperChange() {
    if (!match || !goalkeeperChange || updatingGoalkeeperId) return;
    const isGoalkeeper = !goalkeeperChange.isGoalkeeper;
    setUpdatingGoalkeeperId(goalkeeperChange.userId);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await updateMatchGoalkeeper(
        token,
        match.id,
        goalkeeperChange.userId,
        isGoalkeeper,
      );
      setMatch(updatedMatch);
      setGoalkeeperChange(null);
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setGoalkeeperChange(null);
      setError(exception instanceof Error
        ? exception.message
        : 'Não foi possível atualizar o goleiro.');
    } finally {
      setUpdatingGoalkeeperId(null);
    }
  }

  function openRentalGoalkeeperModal() {
    if (!match || match.goingCount >= match.maxPlayers) return;
    setRentalGoalkeeperName('');
    setRentalGoalkeeperError(null);
    setRentalModalVisible(true);
  }

  async function confirmRentalGoalkeeper() {
    if (!match || managingRentalId || !rentalModalVisible) return;
    const displayName = rentalGoalkeeperName.trim();
    if (!displayName) {
      setRentalGoalkeeperError('Informe o nome do goleiro de aluguel.');
      return;
    }

    setManagingRentalId('new');
    setRentalGoalkeeperError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await addRentalGoalkeeper(token, match.id, displayName);
      setMatch(updatedMatch);
      setRentalModalVisible(false);
      setRentalGoalkeeperName('');
    } catch (exception) {
      setRentalGoalkeeperError(exception instanceof Error
        ? exception.message
        : 'Não foi possível adicionar o goleiro de aluguel.');
    } finally {
      setManagingRentalId(null);
    }
  }

  async function confirmRentalGoalkeeperRemoval() {
    if (!match || !rentalToRemove || managingRentalId) return;
    setManagingRentalId(rentalToRemove.id);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await removeRentalGoalkeeper(token, match.id, rentalToRemove.id);
      setMatch(updatedMatch);
      setRentalToRemove(null);
    } catch (exception) {
      setRentalToRemove(null);
      setError(exception instanceof Error
        ? exception.message
        : 'Não foi possível remover o goleiro de aluguel.');
    } finally {
      setManagingRentalId(null);
    }
  }

  async function removeGuest(guest: MatchGuest) {
    if (!match || managingGuestId) return;
    setManagingGuestId(guest.id);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      setMatch(await removeMatchGuest(token, match.id, guest.id));
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Não foi possível remover o convidado.');
    } finally {
      setManagingGuestId(null);
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

  async function openReplacementPicker(departure: MatchAttendance) {
    if (!match || replacingPlayer) return;
    setReplacementDeparture(departure);
    setSelectedReplacementUserId(null);
    setReplacementCandidates([]);
    setReplacingPlayer(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const members = await listGroupMembers(token, match.groupId);
      const confirmed = new Set(match.attendances
        .filter((attendance) => attendance.status === 'GOING')
        .map((attendance) => attendance.userId));
      const otherOpenDepartures = new Set(match.attendances
        .filter((attendance) => attendance.userId !== departure.userId
          && attendance.replacementRequiredAt != null
          && isSettlementOpen(attendance.paymentSettlementStatus))
        .map((attendance) => attendance.userId));
      setReplacementCandidates(members.filter((member) => (
        !confirmed.has(member.userId)
        && !otherOpenDepartures.has(member.userId)
      )));
    } catch (exception) {
      setReplacementDeparture(null);
      setError(exception instanceof Error ? exception.message : 'Não foi possível carregar os membros disponíveis.');
    } finally {
      setReplacingPlayer(false);
    }
  }

  async function confirmReplacement() {
    if (!match || !replacementDeparture || !selectedReplacementUserId || replacingPlayer) return;
    setReplacingPlayer(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        goToLogin();
        return;
      }
      const updatedMatch = await addMatchReplacement(
        token,
        match.id,
        replacementDeparture.userId,
        selectedReplacementUserId,
      );
      setMatch(updatedMatch);
      setReplacementDeparture(null);
      setReplacementCandidates([]);
      setSelectedReplacementUserId(null);
      syncNotifications(token, updatedMatch);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Não foi possível preencher a vaga.');
    } finally {
      setReplacingPlayer(false);
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
  const currentAttendance = match ? currentMatchAttendance(match) : null;
  const showCurrentPayment = match ? shouldShowCurrentPlayerPayment(match) : false;
  const actionIsEndSeries = managementAction === 'end-series';
  const goalkeeperTargetState = goalkeeperChange ? !goalkeeperChange.isGoalkeeper : false;
  const secondaryCandidates = match ? secondaryGoalkeeperCandidates(match) : [];
  const volunteerCandidates = match ? volunteerGoalkeeperCandidates(match) : [];
  const goalkeeperPickerCandidates = goalkeeperPicker === 'secondary'
    ? secondaryCandidates
    : volunteerCandidates;

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
                {match.paymentRequired ? (
                  <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                    {match.goalkeeperPays
                      ? 'Goleiros membros seguem a cobrança normal desta partida.'
                      : 'Goleiros marcados pelo administrador ficam isentos nesta partida.'}
                  </Text>
                ) : null}
              </YStack>

              <MinimumPlayerDecisionCard
                match={match}
                onCancelMatch={() => setManagementAction('cancel-occurrence')}
              />

              <YStack
                backgroundColor="$onzeSurface"
                borderColor={match.missingGoalkeepers > 0 ? '$onzeDanger' : '$onzeBorder'}
                borderRadius="$6"
                borderWidth={1}
                gap="$3"
                padding="$5"
              >
                <YStack gap="$1">
                  <Text color="$onzeInk" fontSize={18} fontWeight="900">Formato da partida</Text>
                  <Text color="$onzeInk" fontSize={14} fontWeight="800">
                    Modalidade: {modalityLabel(match.modality)}
                  </Text>
                  {match.matchType === 'INTERNAL' ? (
                    <Text color="$onzeInk" fontSize={14} fontWeight="800">Times: {match.teamCount}</Text>
                  ) : (
                    <Text color="$onzeMuted" fontSize={13}>Contra outro time</Text>
                  )}
                  <Text color="$onzeInk" fontSize={14} fontWeight="800">
                    Goleiros: {match.currentGoalkeepers} de {match.requiredGoalkeepers}
                  </Text>
                  <Text color="$onzeInk" fontSize={14} fontWeight="800">
                    Mínimo: {match.minimumPlayers} • Ideal: {match.idealPlayers}
                  </Text>
                  {match.missingMinimumPlayers > 0 ? (
                    <Text color="$onzeDanger" fontSize={13} fontWeight="800">
                      Faltam {match.missingMinimumPlayers} {match.missingMinimumPlayers === 1 ? 'jogador' : 'jogadores'} para atingir o mínimo configurado.
                    </Text>
                  ) : match.goingCount < match.idealPlayers ? (
                    <Text color="#8A6414" fontSize={12} fontWeight="800">
                      O mínimo foi atingido, mas ainda há menos jogadores que o ideal configurado.
                    </Text>
                  ) : null}
                  {missingGoalkeepersMessage(match.missingGoalkeepers) ? (
                    <Text color="$onzeDanger" fontSize={13} fontWeight="800">
                      {missingGoalkeepersMessage(match.missingGoalkeepers)}
                    </Text>
                  ) : (
                    <Text color="$onzeGreen" fontSize={12} fontWeight="800">
                      Quantidade necessária de goleiros preenchida.
                    </Text>
                  )}
                </YStack>

                {match.canManage
                    && match.status === 'SCHEDULED'
                    && match.missingGoalkeepers > 0
                    && match.secondaryGoalkeeperDecisionRequired ? (
                  <YStack backgroundColor="#FFF7E6" borderRadius="$4" gap="$2" padding="$4">
                    <Text color="#8A6414" fontSize={14} fontWeight="900">Escolha quem será o goleiro.</Text>
                    <Text color="$onzeInk" fontSize={12} lineHeight={18}>
                      Há mais de um jogador confirmado com goleiro como segunda posição. O Onze não desempata automaticamente.
                    </Text>
                    <Button
                      backgroundColor="$onzeGreen"
                      disabled={!secondaryCandidates.length || Boolean(updatingGoalkeeperId)}
                      onPress={() => setGoalkeeperPicker('secondary')}
                    >
                      <Text color="$onzeSurface" fontWeight="900">Escolher entre os candidatos</Text>
                    </Button>
                  </YStack>
                ) : null}

                {match.canManage
                    && match.status === 'SCHEDULED'
                    && match.missingGoalkeepers > 0
                    && !match.secondaryGoalkeeperDecisionRequired ? (
                  <YStack gap="$2">
                    <Text color="$onzeInk" fontSize={14} fontWeight="900">
                      Como deseja preencher a vaga de goleiro?
                    </Text>
                    <XStack gap="$2">
                      <Button
                        backgroundColor="$onzeSurface"
                        borderColor="$onzeGreen"
                        borderWidth={1}
                        disabled={!volunteerCandidates.length || Boolean(updatingGoalkeeperId)}
                        flex={1}
                        minHeight={48}
                        onPress={() => setGoalkeeperPicker('volunteer')}
                        paddingHorizontal="$2"
                      >
                        <Text color="$onzeGreen" fontSize={12} fontWeight="900" textAlign="center">
                          Escolher jogador
                        </Text>
                      </Button>
                      <Button
                        backgroundColor="$onzeGreen"
                        disabled={Boolean(managingRentalId) || match.goingCount >= match.maxPlayers}
                        flex={1}
                        minHeight={48}
                        onPress={openRentalGoalkeeperModal}
                        paddingHorizontal="$2"
                      >
                        <Text color="$onzeSurface" fontSize={12} fontWeight="900" textAlign="center">
                          Adicionar goleiro de aluguel
                        </Text>
                      </Button>
                    </XStack>
                    {!volunteerCandidates.length ? (
                      <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                        Nenhum jogador confirmado marcou “Posso jogar no gol”.
                      </Text>
                    ) : null}
                  </YStack>
                ) : null}

                {match.canManage && match.status === 'SCHEDULED' ? (
                  <Button
                    backgroundColor="$onzeSurface"
                    borderColor="$onzeGreen"
                    borderWidth={1}
                    onPress={() => router.push({
                      pathname: '/edit-match-player-config',
                      params: { matchId: match.id },
                    })}
                  >
                    <Text color="$onzeGreen" fontWeight="900">Editar modalidade e mínimo</Text>
                  </Button>
                ) : null}

                {match.matchType === 'INTERNAL' && (match.canViewTechnical || match.teamsGenerated) ? (
                  <Button
                    backgroundColor={match.teamsGenerated ? '$onzeGreen' : '$onzeSurface'}
                    borderColor="$onzeGreen"
                    borderWidth={1}
                    onPress={() => router.push({
                      pathname: '/match-teams',
                      params: { matchId: match.id },
                    })}
                  >
                    <Text color={match.teamsGenerated ? '$onzeSurface' : '$onzeGreen'} fontWeight="900">
                      {match.teamsGenerated ? 'Ver times formados' : 'Formar times'}
                    </Text>
                  </Button>
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
                      {currentAttendance?.replacementRequiredAt
                        ? 'Saída registrada'
                        : !match.signupOpen && match.myAttendance !== 'GOING'
                          ? 'Lista encerrada'
                          : 'Você vai jogar?'}
                    </Text>
                    <Text color="$onzeMuted" fontSize={13}>
                      {currentAttendance?.replacementRequiredAt
                        ? 'Depois de sair com pagamento registrado, somente um administrador pode colocar você novamente na lista.'
                        : !match.signupOpen && match.myAttendance !== 'GOING'
                          ? `O prazo terminou com ${match.goingCount} de ${match.maxPlayers} vagas preenchidas.`
                          : `${match.goingCount} de ${match.maxPlayers} vagas preenchidas.`}
                    </Text>
                  </YStack>
                  <XStack gap="$3">
                    <Button
                      backgroundColor={match.myAttendance === 'GOING' ? '$onzeGreen' : '$onzeSurface'}
                      borderColor="$onzeGreen"
                      borderWidth={1}
                      disabled={Boolean(updatingAttendance)
                        || (match.myAttendance !== 'GOING' && !match.canJoin)}
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

              {showCurrentPayment && match.myPaymentStatus != null ? (
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
                      {match.myPaymentStatus === 'PENDING' && match.canReportPayment ? (
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
                          O prazo de pagamento terminou. Se você entrou como reposição, peça ao administrador para conferir sua vaga.
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
                          currentAttendance,
                        )}
                      </Text>
                      {currentAttendance?.replacementRequiredAt
                          && isSettlementOpen(match.myPaymentSettlementStatus) ? (
                        <YStack
                          backgroundColor={currentAttendance.settlementAvailable ? '#EAF7EF' : '#FFF7E6'}
                          borderRadius="$4"
                          gap="$1"
                          padding="$4"
                        >
                          <Text
                            color={currentAttendance.settlementAvailable ? '$onzeGreen' : '#8A6414'}
                            fontSize={12}
                            fontWeight="900"
                          >
                            {currentAttendance.settlementAvailable
                              ? 'ACERTO LIBERADO'
                              : 'AGUARDANDO REPOSIÇÃO'}
                          </Text>
                          <Text color="$onzeInk" fontSize={13} lineHeight={19}>
                            {currentAttendance.replacementDisplayName
                              ? `${currentAttendance.replacementDisplayName} preencheu sua vaga. O administrador já pode resolver o acerto.`
                              : 'Seu pagamento permanece protegido. O acerto será liberado quando outra pessoa preencher sua vaga.'}
                          </Text>
                        </YStack>
                      ) : null}
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
                  <Text color="$onzeGreen" fontSize={13} fontWeight="900">{match.goingCount}/{match.maxPlayers}</Text>
                </XStack>

                <ConfirmedAttendanceList
                  members={going}
                  rentalGoalkeepers={match.rentalGoalkeepers}
                  guests={match.guests}
                  canManage={match.canManage && match.status === 'SCHEDULED'}
                  updatingGoalkeeperId={updatingGoalkeeperId}
                  managingRentalId={managingRentalId}
                  managingGuestId={managingGuestId}
                  onChangeGoalkeeper={setGoalkeeperChange}
                  onRemoveRental={setRentalToRemove}
                  onRemoveGuest={(guest) => void removeGuest(guest)}
                />
                {match.canManage && match.status === 'SCHEDULED' ? (
                  <YStack gap="$2">
                    <Button
                      backgroundColor="$onzeSurface"
                      borderColor="$onzeGreen"
                      borderWidth={1}
                      disabled={match.goingCount >= match.maxPlayers}
                      onPress={() => router.push({
                        pathname: '/add-match-guest',
                        params: {
                          matchId: match.id,
                          canEvaluate: String(match.canViewTechnical),
                        },
                      })}
                    >
                      <Text color="$onzeGreen" fontWeight="900">+ Adicionar convidado</Text>
                    </Button>
                    {match.goingCount >= match.maxPlayers ? (
                      <Text color="$onzeMuted" fontSize={12}>
                        O limite de jogadores já foi preenchido.
                      </Text>
                    ) : null}
                  </YStack>
                ) : null}
                {match.canManage && match.status === 'SCHEDULED' && match.missingGoalkeepers <= 0 ? (
                  <YStack gap="$2">
                    <Button
                      backgroundColor="$onzeSurface"
                      borderColor="$onzeGreen"
                      borderWidth={1}
                      disabled={Boolean(managingRentalId) || match.goingCount >= match.maxPlayers}
                      onPress={openRentalGoalkeeperModal}
                    >
                      <Text color="$onzeGreen" fontWeight="900">+ Adicionar goleiro de aluguel</Text>
                    </Button>
                    {match.goingCount >= match.maxPlayers ? (
                      <Text color="$onzeMuted" fontSize={12} lineHeight={18}>
                        Remova ou libere uma vaga antes de adicionar outro goleiro.
                      </Text>
                    ) : null}
                  </YStack>
                ) : null}
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
                          {attendance.replacementRequiredAt ? (
                            <Text
                              color={attendance.settlementAvailable ? '$onzeGreen' : '#8A6414'}
                              fontSize={11}
                              fontWeight="900"
                            >
                              {attendance.replacementDisplayName
                                ? `VAGA PREENCHIDA POR ${attendance.replacementDisplayName.toUpperCase()}`
                                : 'ACERTO BLOQUEADO · AGUARDANDO REPOSIÇÃO'}
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
                      {match.status === 'SCHEDULED'
                          && attendance.replacementRequiredAt != null
                          && attendance.replacementFilledAt == null ? (
                        <Button
                          backgroundColor="$onzeSurface"
                          borderColor="#8A6414"
                          borderWidth={1}
                          disabled={replacingPlayer || Boolean(updatingPayment)}
                          onPress={() => void openReplacementPicker(attendance)}
                        >
                          <Text color="#8A6414" fontSize={12} fontWeight="900">
                            Adicionar reposição
                          </Text>
                        </Button>
                      ) : null}
                      {(attendance.status === 'NOT_GOING' || match.status === 'CANCELLED')
                          && isSettlementOpen(attendance.paymentSettlementStatus)
                          && match.status !== 'CANCELLED'
                          && (attendance.settlementAvailable
                            || attendance.paymentSettlementStatus === 'REVIEW_REQUIRED') ? (
                        <Button
                          backgroundColor="$onzeGreen"
                          disabled={Boolean(updatingPayment)}
                          onPress={() => setSettlementPlayer(attendance)}
                        >
                          <Text color="$onzeSurface" fontSize={12} fontWeight="900">
                            {attendance.settlementAvailable ? 'Resolver acerto' : 'Conferir pagamento'}
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
        <GoalkeeperPlayerModal
          visible={goalkeeperPicker != null}
          title={goalkeeperPicker === 'secondary' ? 'Escolha quem será o goleiro' : 'Escolher jogador'}
          description={goalkeeperPicker === 'secondary'
            ? 'Selecione um dos jogadores confirmados que possui goleiro como segunda posição.'
            : 'São exibidos somente jogadores confirmados que aceitaram jogar no gol quando necessário.'}
          candidates={goalkeeperPickerCandidates}
          onSelect={(attendance) => {
            setGoalkeeperPicker(null);
            setGoalkeeperChange(attendance);
          }}
          onCancel={() => setGoalkeeperPicker(null)}
        />
      ) : null}

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
          visible={goalkeeperChange != null}
          title={goalkeeperTargetState ? 'Definir como goleiro?' : 'Remover papel de goleiro?'}
          message={goalkeeperTargetState
            ? match.goalkeeperPays
              ? `${goalkeeperChange?.displayName ?? 'O jogador'} será identificado como goleiro, mas seguirá a cobrança normal desta partida.`
              : `${goalkeeperChange?.displayName ?? 'O jogador'} ficará isento nesta partida. Crédito sem dinheiro será devolvido; pagamento em dinheiro já informado ou confirmado bloqueará a alteração.`
            : goalkeeperChange?.paymentExempt
              ? `${goalkeeperChange.displayName} deixará de ser goleiro e voltará a ter a cobrança normal desta partida.`
              : `${goalkeeperChange?.displayName ?? 'O jogador'} deixará de ser identificado como goleiro. A situação de pagamento não será alterada.`}
          confirmLabel={goalkeeperTargetState ? 'Definir goleiro' : 'Remover papel'}
          loading={updatingGoalkeeperId === goalkeeperChange?.userId}
          onCancel={() => setGoalkeeperChange(null)}
          onConfirm={() => void confirmGoalkeeperChange()}
        />
      ) : null}

      <RentalGoalkeeperModal
        visible={rentalModalVisible}
        name={rentalGoalkeeperName}
        error={rentalGoalkeeperError}
        loading={managingRentalId === 'new'}
        onChangeName={(name) => {
          setRentalGoalkeeperName(name);
          setRentalGoalkeeperError(null);
        }}
        onCancel={() => {
          if (managingRentalId) return;
          setRentalModalVisible(false);
          setRentalGoalkeeperError(null);
        }}
        onConfirm={() => void confirmRentalGoalkeeper()}
      />

      <ConfirmActionModal
        visible={rentalToRemove != null}
        title="Remover goleiro de aluguel?"
        message={`${rentalToRemove?.displayName ?? 'Este goleiro'} será removido somente desta partida e a vaga ficará disponível novamente.`}
        confirmLabel="Remover goleiro"
        destructive
        loading={managingRentalId === rentalToRemove?.id}
        onCancel={() => setRentalToRemove(null)}
        onConfirm={() => void confirmRentalGoalkeeperRemoval()}
      />

      {match ? (
        <ConfirmActionModal
          visible={pendingAttendanceStatus === 'NOT_GOING'}
          title="Confirmar que não vai?"
          message={withdrawalConfirmationMessage(
            match.myPaymentStatus,
            match.myCreditAllocationStatus,
            match.myRemainingPaymentAmount,
          ) + (match.signupOpen
            || match.myPaymentStatus === 'PAID'
            || match.myPaymentStatus === 'REPORTED'
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
        settlementAvailable={settlementPlayer?.settlementAvailable ?? false}
        loading={updatingPayment === settlementPlayer?.userId}
        onCancel={() => setSettlementPlayer(null)}
        onResolve={(resolution) => void resolvePlayerSettlement(resolution)}
      />

      <ReplacementPlayerModal
        visible={replacementDeparture != null}
        departedName={replacementDeparture?.displayName ?? ''}
        departedUserId={replacementDeparture?.userId ?? ''}
        candidates={replacementCandidates}
        selectedUserId={selectedReplacementUserId}
        loading={replacingPlayer}
        onSelect={setSelectedReplacementUserId}
        onCancel={() => {
          if (replacingPlayer) return;
          setReplacementDeparture(null);
          setReplacementCandidates([]);
          setSelectedReplacementUserId(null);
        }}
        onConfirm={() => void confirmReplacement()}
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
      return 'Sua vaga será liberada, mas o crédito e o PIX informado continuarão protegidos até outra pessoa preencher a vaga. Somente um administrador poderá colocar você novamente na lista.';
    }
    if (status === 'PAID' && (remainingPaymentAmount ?? 0) > 0) {
      return 'Sua vaga será liberada. O crédito e o valor complementar ficarão bloqueados até uma reposição entrar; depois o administrador poderá resolver o acerto.';
    }
    return status === 'PAID'
      ? 'Sua vaga será liberada, mas o crédito usado ficará bloqueado até outra pessoa preencher a vaga. Somente um administrador poderá readicionar você.'
      : creditAllocationStatus === 'RESERVED'
      ? 'A reserva será removida e o crédito continuará disponível para outra partida deste grupo.'
      : 'Sua vaga será liberada e o crédito ainda pendente voltará ao saldo.';
  }
  if (status === 'PENDING') {
    return 'Sua vaga será liberada imediatamente e a cobrança que ainda estava pendente será cancelada.';
  }
  if (status === 'REPORTED') {
    return 'Sua vaga será liberada. O pagamento informado ficará bloqueado até outra pessoa ocupar a vaga; somente o administrador poderá readicionar você.';
  }
  if (status === 'PAID') {
    return 'Sua vaga será liberada, mas o pagamento ficará bloqueado até outra pessoa ocupar a vaga. Depois o administrador poderá fazer o acerto.';
  }
  return 'Sua vaga será liberada imediatamente para outro jogador.';
}

function withdrawalPaymentMessage(
  status: PaymentStatus,
  settlementStatus: PaymentSettlementStatus | null,
  attendance: MatchAttendance | null,
) {
  switch (settlementStatus) {
    case 'REVIEW_REQUIRED':
      return attendance?.settlementAvailable
        ? 'Você informou o pagamento antes de sair. Sua vaga já foi preenchida e o administrador pode concluir o acerto.'
        : 'Você informou o pagamento antes de sair. O acerto aguarda a conferência do PIX e o preenchimento da vaga.';
    case 'PENDING':
      return attendance?.settlementAvailable
        ? 'Sua vaga foi preenchida. O administrador já pode registrar o reembolso, crédito ou manutenção do valor.'
        : 'Seu pagamento permanece protegido e o acerto ficará bloqueado até sua vaga ser preenchida.';
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

function ConfirmedAttendanceList({
  members,
  rentalGoalkeepers,
  guests,
  canManage,
  updatingGoalkeeperId,
  managingRentalId,
  managingGuestId,
  onChangeGoalkeeper,
  onRemoveRental,
  onRemoveGuest,
}: {
  members: MatchAttendance[];
  rentalGoalkeepers: RentalGoalkeeper[];
  guests: MatchGuest[];
  canManage: boolean;
  updatingGoalkeeperId: string | null;
  managingRentalId: string | null;
  managingGuestId: string | null;
  onChangeGoalkeeper: (attendance: MatchAttendance) => void;
  onRemoveRental: (goalkeeper: RentalGoalkeeper) => void;
  onRemoveGuest: (guest: MatchGuest) => void;
}) {
  const empty = members.length === 0 && rentalGoalkeepers.length === 0 && guests.length === 0;
  return (
    <YStack gap="$2">
      <Text color="$onzeMuted" fontSize={11} fontWeight="900">VÃO JOGAR</Text>
      {empty ? (
        <Text color="$onzeMuted" fontSize={13}>Ninguém confirmou ainda.</Text>
      ) : null}
      {members.map((attendance) => (
        <XStack key={attendance.userId} alignItems="center" gap="$2">
          <Text color="$onzeGreen" fontSize={13}>✓</Text>
          <YStack flex={1} gap="$1">
            <Text color="$onzeInk" fontSize={14} fontWeight="700">
              {attendance.displayName}
            </Text>
            {attendance.isGoalkeeper ? (
              <XStack flexWrap="wrap" gap="$2">
                <RoleBadge label="GOLEIRO" />
                {attendance.paymentExempt ? <RoleBadge label="ISENTO" exempt /> : null}
              </XStack>
            ) : null}
          </YStack>
          {canManage && canRemoveGoalkeeperRole(attendance) ? (
            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeDanger"
              borderWidth={1}
              disabled={Boolean(updatingGoalkeeperId)}
              minHeight={36}
              onPress={() => onChangeGoalkeeper(attendance)}
              paddingHorizontal="$3"
            >
              <Text
                color="$onzeDanger"
                fontSize={11}
                fontWeight="900"
              >
                {updatingGoalkeeperId === attendance.userId
                  ? 'Salvando...'
                  : 'Remover'}
              </Text>
            </Button>
          ) : null}
        </XStack>
      ))}
      {guests.map((guest) => (
        <XStack key={guest.id} alignItems="center" gap="$2">
          <Text color="$onzeGreen" fontSize={13}>✓</Text>
          <YStack flex={1} gap="$1">
            <Text color="$onzeInk" fontSize={14} fontWeight="700">
              {guest.displayName} — Convidado
            </Text>
            <Text color="$onzeMuted" fontSize={11}>
              {positionLabel(guest.primaryPosition)}
            </Text>
            {guest.primaryPosition === 'GOALKEEPER' ? <RoleBadge label="GOLEIRO" /> : null}
          </YStack>
          {canManage ? (
            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeDanger"
              borderWidth={1}
              disabled={Boolean(managingGuestId)}
              minHeight={36}
              onPress={() => onRemoveGuest(guest)}
              paddingHorizontal="$3"
            >
              <Text color="$onzeDanger" fontSize={11} fontWeight="900">
                {managingGuestId === guest.id ? 'Removendo...' : 'Remover'}
              </Text>
            </Button>
          ) : null}
        </XStack>
      ))}
      {rentalGoalkeepers.map((goalkeeper) => (
        <XStack key={goalkeeper.id} alignItems="center" gap="$2">
          <Text color="$onzeGreen" fontSize={13}>✓</Text>
          <YStack flex={1} gap="$1">
            <Text color="$onzeInk" fontSize={14} fontWeight="700">
              {goalkeeper.displayName} — Goleiro de aluguel
            </Text>
            <RoleBadge label="GOLEIRO" />
          </YStack>
          {canManage ? (
            <Button
              backgroundColor="$onzeSurface"
              borderColor="$onzeDanger"
              borderWidth={1}
              disabled={Boolean(managingRentalId)}
              minHeight={36}
              onPress={() => onRemoveRental(goalkeeper)}
              paddingHorizontal="$3"
            >
              <Text color="$onzeDanger" fontSize={11} fontWeight="900">
                {managingRentalId === goalkeeper.id ? 'Removendo...' : 'Remover'}
              </Text>
            </Button>
          ) : null}
        </XStack>
      ))}
    </YStack>
  );
}

function RoleBadge({ label, exempt = false }: { label: string; exempt?: boolean }) {
  return (
    <Text
      backgroundColor={exempt ? '#FFF7E6' : '#EAF7EF'}
      borderRadius={999}
      color={exempt ? '#8A6414' : '$onzeGreen'}
      fontSize={10}
      fontWeight="900"
      paddingHorizontal="$2"
      paddingVertical="$1"
    >
      {label}
    </Text>
  );
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
