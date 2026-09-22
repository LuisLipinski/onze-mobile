import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { LiveMatchSummary } from '../lib/api';
import { formatMatchTimer, liveSummaryScoreLabel } from '../lib/live-match';

function elapsedSeconds(startedAt: string, nowMs = Date.now()) {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return 0;
  return Math.min(10_800, Math.max(0, Math.floor((nowMs - startedAtMs) / 1_000)));
}

export function LiveMatchCard({
  match,
  onPress,
}: {
  match: LiveMatchSummary;
  onPress: () => void;
}) {
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(match.startedAt));

  useEffect(() => {
    setElapsed(elapsedSeconds(match.startedAt));
    const interval = setInterval(() => setElapsed(elapsedSeconds(match.startedAt)), 1_000);
    return () => clearInterval(interval);
  }, [match.startedAt]);

  const matchup = match.matchType === 'VERSUS_EXTERNAL'
    ? `${match.groupName} × Adversário`
    : `${match.teamCount ?? match.scores.length} times em campo`;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <YStack
          backgroundColor="$onzeSurface"
          borderColor="#E54B4B"
          borderRadius="$6"
          borderWidth={1}
          gap="$3"
          opacity={pressed ? 0.78 : 1}
          padding="$4"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$2">
              <YStack backgroundColor="#E54B4B" borderRadius={999} height={10} width={10} />
              <Text color="#C72F2F" fontSize={12} fontWeight="900">AO VIVO</Text>
            </XStack>
            <Text color="$onzeInk" fontSize={17} fontVariant={['tabular-nums']} fontWeight="900">
              {formatMatchTimer(elapsed)}
            </Text>
          </XStack>

          <YStack alignItems="center" gap="$1">
            <Text color="$onzeGreen" fontSize={12} fontWeight="900" numberOfLines={1}>
              {match.groupName.toUpperCase()}
            </Text>
            <Text color="$onzeInk" fontSize={34} fontVariant={['tabular-nums']} fontWeight="900">
              {liveSummaryScoreLabel(match) || '0 × 0'}
            </Text>
            <Text color="$onzeMuted" fontSize={12} fontWeight="700">{matchup}</Text>
          </YStack>

          <XStack alignItems="center" justifyContent="space-between">
            <Text color="$onzeMuted" flex={1} fontSize={12} numberOfLines={1}>{match.venue}</Text>
            <Text color="$onzeGreen" fontSize={12} fontWeight="900">
              {match.canManage ? 'Gerenciar partida  ›' : 'Acompanhar partida  ›'}
            </Text>
          </XStack>
        </YStack>
      )}
    </Pressable>
  );
}
