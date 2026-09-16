import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import { FootballMatch } from '../lib/api';
import { getAccessToken } from '../lib/auth-storage';
import {
  approveMatchBelowMinimum,
  getMinimumPlayerDecisionStatus,
  MinimumPlayerDecisionStatus,
} from '../lib/match-minimum-player-decision';
import { ConfirmActionModal } from './confirm-action-modal';

type Props = {
  match: FootballMatch;
  onCancelMatch: () => void;
};

export function MinimumPlayerDecisionCard({ match, onCancelMatch }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<MinimumPlayerDecisionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmKeep, setConfirmKeep] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!match.canManage
          || match.status !== 'SCHEDULED'
          || match.missingMinimumPlayers <= 0) {
        if (active) setStatus(null);
        return;
      }
      try {
        const token = await getAccessToken();
        if (!token) return;
        const loaded = await getMinimumPlayerDecisionStatus(token, match.id);
        if (active) {
          setStatus(loaded);
          setError(null);
        }
      } catch (exception) {
        if (active) {
          setError(exception instanceof Error
            ? exception.message
            : 'Não foi possível verificar a situação do número mínimo.');
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [
    match.id,
    match.canManage,
    match.status,
    match.signupDeadline,
    match.goingCount,
    match.minimumPlayers,
    match.missingMinimumPlayers,
  ]);

  async function keepBelowMinimum() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      setStatus(await approveMatchBelowMinimum(token, match.id));
      setConfirmKeep(false);
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Não foi possível manter a partida abaixo do mínimo.');
    } finally {
      setSaving(false);
    }
  }

  if (!match.canManage || match.status !== 'SCHEDULED' || match.missingMinimumPlayers <= 0) {
    return null;
  }

  if (status?.belowMinimumApproved) {
    return (
      <YStack backgroundColor="#FFF7E6" borderColor="#D8A331" borderRadius="$6" borderWidth={1} gap="$2" padding="$5">
        <Text color="#8A6414" fontSize={15} fontWeight="900">Partida mantida abaixo do mínimo</Text>
        <Text color="$onzeInk" fontSize={13} lineHeight={19}>
          O administrador decidiu manter esta ocorrência com {status.confirmedPlayers} de {status.minimumPlayers} jogadores mínimos. O formador poderá ser usado, mas posições e equilíbrio podem não ficar ideais. Revise os times antes de confirmar.
        </Text>
      </YStack>
    );
  }

  if (!status?.decisionRequired) {
    return error ? (
      <YStack backgroundColor="#FDECEC" borderRadius="$5" padding="$4">
        <Text color="$onzeDanger" fontSize={12}>{error}</Text>
      </YStack>
    ) : null;
  }

  return (
    <>
      <YStack backgroundColor="#FFF7E6" borderColor="#D8A331" borderRadius="$6" borderWidth={1} gap="$3" padding="$5">
        <YStack gap="$1">
          <Text color="#8A6414" fontSize={16} fontWeight="900">Número mínimo não atingido</Text>
          <Text color="$onzeInk" fontSize={13} lineHeight={19}>
            O prazo de inscrição terminou com {status.confirmedPlayers} de {status.minimumPlayers} jogadores mínimos. O que deseja fazer com esta ocorrência?
          </Text>
        </YStack>
        {error ? <Text color="$onzeDanger" fontSize={12}>{error}</Text> : null}
        <Button backgroundColor="$onzeGreen" onPress={() => router.push({
          pathname: '/extend-match-signup',
          params: { matchId: match.id },
        })}>
          <Text color="$onzeSurface" fontWeight="900">Estender prazo de inscrição</Text>
        </Button>
        <XStack gap="$2">
          <Button
            backgroundColor="$onzeCanvas"
            borderColor="$onzeDanger"
            borderWidth={1}
            flex={1}
            onPress={onCancelMatch}
          >
            <Text color="$onzeDanger" fontSize={12} fontWeight="900">Cancelar jogo</Text>
          </Button>
          <Button
            backgroundColor="$onzeCanvas"
            borderColor="#D8A331"
            borderWidth={1}
            flex={1}
            onPress={() => setConfirmKeep(true)}
          >
            <Text color="#8A6414" fontSize={12} fontWeight="900" textAlign="center">Manter mesmo assim</Text>
          </Button>
        </XStack>
      </YStack>

      <ConfirmActionModal
        visible={confirmKeep}
        title="Manter abaixo do mínimo?"
        message="O formador de times será liberado, mas com menos jogadores a distribuição de posições e o equilíbrio podem não ficar ideais. Revise a escalação antes de usar os times."
        confirmLabel="Manter partida"
        loading={saving}
        onCancel={() => setConfirmKeep(false)}
        onConfirm={() => void keepBelowMinimum()}
      />
    </>
  );
}
