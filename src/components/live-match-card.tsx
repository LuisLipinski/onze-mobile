import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { LiveMatchSummary } from '../lib/api';
import {
  formatMatchTimer,
  liveSummaryScoreLabel,
  matchPeriodElapsedSeconds,
  periodLabel,
} from '../lib/live-match';

function elapsedSeconds(startedAt: string, nowMs = Date.now()) {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return 0;
  return Math.min(10_800, Math.max(0, Math.floor((nowMs - startedAtMs) / 1_000)));
}

function summaryElapsedSeconds(match: LiveMatchSummary, nowMs = Date.now()) {
  if (match.currentPeriod) return matchPeriodElapsedSeconds(match.currentPeriod, nowMs);
  return elapsedSeconds(match.startedAt, nowMs);
}

export function LiveMatchCard({
  match,
  onPress,
}: {
  match: LiveMatchSummary;
  onPress: () => void;
}) {
  const [elapsed, setElapsed] = useState(() => summaryElapsedSeconds(match));

  useEffect(() => {
    setElapsed(summaryElapsedSeconds(match));
    const interval = setInterval(() => setElapsed(summaryElapsedSeconds(match)), 1_000);
    return () => clearInterval(interval);
  }, [match]);

  const periodDurationSeconds = (match.currentPeriod?.durationMinutes ?? 0) * 60;
  const timerLabel = match.phase === 'PENALTY_SHOOTOUT'
    ? 'PÊNALTIS'
    : match.currentPeriod
      ? `${formatMatchTimer(Math.min(elapsed, periodDurationSeconds))}${
        elapsed > periodDurationSeconds
          ? `  +${formatMatchTimer(elapsed - periodDurationSeconds)}`
          : ''
      }`
      : match.phase === 'LEGACY'
        ? formatMatchTimer(elapsed)
        : 'INTERVALO';

  const matchup = match.scores.length === 2
    ? `${match.scores[0].name} × ${match.scores[1].name}`
    : `${match.teamCount ?? match.scores.length} times em campo`;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <YStack
          backgroundColor="$onzeSurface"
          borderColor="$onzeDanger"
          borderRadius="$6"
          borderWidth={1}
          gap="$3"
          opacity={pressed ? 0.78 : 1}
          padding="$4"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$2">
              <YStack backgroundColor="$onzeDanger" borderRadius={999} height={10} width={10} />
              <Text color="$onzeDanger" fontSize={12} fontWeight="900">AO VIVO</Text>
            </XStack>
            <Text color="$onzeInk" fontSize={17} fontVariant={['tabular-nums']} fontWeight="900">
              {timerLabel}
            </Text>
          </XStack>

          {match.currentPeriod ? (
            <Text color="$onzeMuted" fontSize={11} fontWeight="900" textAlign="right" textTransform="uppercase">
              {periodLabel(match.currentPeriod)}
            </Text>
          ) : null}

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
              {match.canManage ? 'Gerenciar jogo  ›' : 'Acompanhar jogo  ›'}
            </Text>
          </XStack>
        </YStack>
      )}
    </Pressable>
  );
}
