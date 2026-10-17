import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { ApiRequestError, decideMatchGuestPreference, approveMatchWaitlistGoalkeeper } from '../lib/api';
import type { FootballMatch } from '../lib/api';
import { clearSession, getAccessToken } from '../lib/auth-storage';
import { getErrorMessage } from '../lib/errors';
import { orderedWaitlist } from '../lib/match-waitlist';
import { positionLabel } from '../lib/sports-profile';
import { AppButton } from './app-button';
import { ConfirmActionModal } from './confirm-action-modal';

type Decision = {
  action: 'KEEP_GUESTS' | 'PROMOTE_MEMBER' | 'GOALKEEPER';
  firstUserId: string;
  firstName: string;
  guestId?: string;
  guestName?: string;
};

type Props = {
  match: FootballMatch;
  onUpdated: (match: FootballMatch) => void;
  onRefresh: () => void;
  onAddRental: () => void;
  onInviteGoalkeeper: () => void;
};

export function MatchWaitlistCard({ match, onUpdated, onRefresh, onAddRental, onInviteGoalkeeper }: Props) {
  const router = useRouter();
  const busy = useRef(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waiting = orderedWaitlist(match);
  const first = waiting[0];
  const editable = match.status === 'SCHEDULED' && match.attendanceOpen;
  const canDecide = match.canManagePlayers && editable;
  const canAddKeeper = match.goingCount < match.maxPlayers;

  async function confirm() {
    if (!decision || busy.current) return;
    busy.current = true; setSaving(true); setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { router.replace('/'); return; }
      const updated = decision.action === 'GOALKEEPER'
        ? await approveMatchWaitlistGoalkeeper(token, match.id, decision.firstUserId)
        : await decideMatchGuestPreference(token, match.id, decision.firstUserId, decision.action, decision.guestId);
      onUpdated(updated); setDecision(null);
    } catch (exception) {
      if (exception instanceof ApiRequestError && exception.status === 401) {
        await clearSession(); router.replace('/'); return;
      }
      setError(getErrorMessage(exception, 'Não foi possível concluir a decisão sobre a fila.'));
      setDecision(null);
      onRefresh();
    } finally {
      busy.current = false; setSaving(false);
    }
  }

  if (!waiting.length && !match.reservedGoalkeeperSlots) return null;

  return (
    <>
      <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
        <XStack alignItems="center" gap="$2" justifyContent="space-between">
          <Text color="$onzeInk" fontSize={18} fontWeight="900">Lista de espera</Text>
          <Text color="$onzeGreen" fontSize={14} fontWeight="900">{waiting.length}</Text>
        </XStack>
        <Text color="$onzeMuted" fontSize={13} lineHeight={19}>
          Quem entra primeiro tem prioridade. Ao abrir uma vaga compatível, o próximo entra automaticamente e recebe um aviso.
        </Text>
        {match.reservedGoalkeeperSlots > 0 ? (
          <Text color="$onzeWarningText" fontSize={13} fontWeight="800" lineHeight={19}>
            {match.reservedGoalkeeperSlots} {match.reservedGoalkeeperSlots === 1 ? 'vaga reservada' : 'vagas reservadas'} para goleiro. Jogadores de linha aguardam na fila; goleiros podem ocupar as vagas reservadas.
          </Text>
        ) : null}
        {waiting.length ? waiting.map((player) => (
          <XStack key={player.userId} backgroundColor={player.currentUser ? '$onzeSuccessBg' : '$onzeCanvas'} borderRadius="$4" gap="$3" padding="$3">
            <Text color="$onzeGreen" fontSize={17} fontWeight="900">{player.waitlistPosition}º</Text>
            <YStack flex={1} gap="$1">
              <Text color="$onzeInk" fontSize={14} fontWeight="800">{player.displayName}{player.currentUser ? ' (você)' : ''}</Text>
              <Text color="$onzeMuted" fontSize={12}>{player.primaryPosition ? positionLabel(player.primaryPosition) : 'Membro do grupo'}</Text>
            </YStack>
          </XStack>
        )) : <Text color="$onzeMuted" fontSize={13}>Ninguém aguardando no momento.</Text>}
        {match.myAttendance === 'WAITLISTED' ? (
          <Text color="$onzeGreen" fontSize={13} fontWeight="800" lineHeight={19}>
            Você é o {match.myWaitlistPosition}º da fila. O pagamento será solicitado depois que sua vaga for confirmada, conforme a regra do jogo.
          </Text>
        ) : null}

        {canDecide && match.goalkeeperDecisionRequired ? (
          <YStack backgroundColor="$onzeWarningBg" borderRadius="$4" gap="$3" padding="$4">
            <Text color="$onzeWarningText" fontSize={15} fontWeight="900">O prazo terminou e falta goleiro</Text>
            <Text color="$onzeInk" fontSize={13} lineHeight={19}>Como deseja preencher a vaga reservada?</Text>
            <AppButton variant="outline" disabled={!first || !canAddKeeper || saving} onPress={() => first && setDecision({
              action: 'GOALKEEPER', firstUserId: first.userId, firstName: first.displayName,
            })}>
              <Text color="$onzeGreen" fontSize={13} fontWeight="900" textAlign="center">Usar primeiro reserva no gol</Text>
            </AppButton>
            <AppButton variant="primary" disabled={!canAddKeeper || saving} onPress={onAddRental}>
              <Text color="$onzeSurface" fontSize={13} fontWeight="900" textAlign="center">Adicionar goleiro de aluguel</Text>
            </AppButton>
            <AppButton variant="outline" disabled={!canAddKeeper || saving} onPress={onInviteGoalkeeper}>
              <Text color="$onzeGreen" fontSize={13} fontWeight="900">Convidar goleiro</Text>
            </AppButton>
            {!first ? <Text color="$onzeMuted" fontSize={12}>A lista de espera ainda está vazia.</Text> : null}
          </YStack>
        ) : null}

        {canDecide && first && match.guestPreferenceDecisionRequired ? (
          <YStack backgroundColor="$onzeWarningBg" borderRadius="$4" gap="$3" padding="$4">
            <Text color="$onzeWarningText" fontSize={15} fontWeight="900">Convidado ou membro da fila?</Text>
            <Text color="$onzeInk" fontSize={13} lineHeight={19}>
              {first.displayName} é o primeiro da fila. Escolha manter os convidados ou dar preferência ao membro, substituindo um dos convidados abaixo.
            </Text>
            <AppButton variant="outline" disabled={saving} onPress={() => setDecision({
              action: 'KEEP_GUESTS', firstUserId: first.userId, firstName: first.displayName,
            })}>
              <Text color="$onzeGreen" fontSize={13} fontWeight="900">Manter convidados</Text>
            </AppButton>
            {match.guests.filter((guest) => match.replaceableGuestIds.includes(guest.id)).map((guest) => (
              <AppButton key={guest.id} variant="primary" disabled={saving} minHeight={54} onPress={() => setDecision({
                action: 'PROMOTE_MEMBER', firstUserId: first.userId, firstName: first.displayName,
                guestId: guest.id, guestName: guest.displayName,
              })}>
                <Text color="$onzeSurface" flexShrink={1} fontSize={12} fontWeight="900" textAlign="center">
                  Substituir {guest.displayName} por {first.displayName}
                </Text>
              </AppButton>
            ))}
          </YStack>
        ) : null}
        {error ? <Text color="$onzeDanger" fontSize={13}>{error}</Text> : null}
      </YStack>
      <ConfirmActionModal
        visible={decision !== null}
        title={decision?.action === 'GOALKEEPER' ? 'Usar reserva como goleiro?' : decision?.action === 'KEEP_GUESTS' ? 'Manter os convidados?' : 'Dar preferência ao membro?'}
        message={decision?.action === 'GOALKEEPER'
          ? `${decision.firstName} sairá da fila e assumirá o gol somente neste jogo. A regra de pagamento dos goleiros será aplicada. Confirme que essa participação foi combinada.`
          : decision?.action === 'KEEP_GUESTS'
            ? `Os convidados continuarão no jogo. ${decision.firstName} permanecerá em primeiro na lista de espera.`
            : `${decision?.guestName ?? 'O convidado'} será removido desto jogo e ${decision?.firstName ?? 'o primeiro da fila'} ocupará a vaga.`}
        confirmLabel="Confirmar"
        loading={saving}
        onCancel={() => { if (!busy.current) setDecision(null); }}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
