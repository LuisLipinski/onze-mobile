import { useEffect, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import type { FootballMatch, LiveMatchState } from '../lib/api';
import { formatMatchTimer, liveMatchElapsedSeconds, liveScoreSideLabel } from '../lib/live-match';

type Props = {
  match: FootballMatch;
  state: LiveMatchState;
  updatingSides: number[];
  onChangeScore: (sideNumber: number, score: number) => void;
};

export function LiveScoreboard({ match, state, updatingSides, onChangeScore }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => liveMatchElapsedSeconds(state));

  useEffect(() => {
    setElapsedSeconds(liveMatchElapsedSeconds(state));
    if (state.status !== 'IN_PROGRESS') return;
    const interval = setInterval(() => setElapsedSeconds(liveMatchElapsedSeconds(state)), 1_000);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <YStack
      backgroundColor={state.status === 'IN_PROGRESS' ? '#E8F7EE' : '$onzeSurface'}
      borderColor="$onzeGreen"
      borderRadius="$6"
      borderWidth={1}
      gap="$4"
      padding="$5"
    >
      <YStack alignItems="center" gap="$1">
        <Text color="$onzeGreen" fontSize={16} fontWeight="900">
          {state.status === 'IN_PROGRESS' ? 'PARTIDA EM ANDAMENTO' : 'PARTIDA FINALIZADA'}
        </Text>
        <Text color="$onzeInk" fontSize={36} fontVariant={['tabular-nums']} fontWeight="900">
          {formatMatchTimer(elapsedSeconds)}
        </Text>
      </YStack>

      <YStack gap="$3">
        {state.scores.map((side) => {
          const isUpdating = updatingSides.includes(side.sideNumber);
          return (
            <XStack
              key={side.sideNumber}
              alignItems="center"
              backgroundColor="$onzeSurface"
              borderColor="$onzeBorder"
              borderRadius="$5"
              borderWidth={1}
              gap="$3"
              justifyContent="space-between"
              padding="$3"
            >
              <Text color="$onzeInk" flex={1} fontSize={16} fontWeight="800">
                {liveScoreSideLabel(match, side.sideNumber)}
              </Text>
              {state.canManage && state.status === 'IN_PROGRESS' ? (
                <Button
                  accessibilityLabel={`Diminuir placar de ${liveScoreSideLabel(match, side.sideNumber)}`}
                  borderRadius="$5"
                  disabled={isUpdating || side.score === 0}
                  height={52}
                  hitSlop={12}
                  onPress={() => onChangeScore(side.sideNumber, side.score - 1)}
                  pressStyle={{ opacity: 0.65, scale: 0.96 }}
                  width={52}
                >
                  <Text fontSize={24} fontWeight="900">−</Text>
                </Button>
              ) : null}
              <Text color="$onzeGreen" fontSize={32} fontVariant={['tabular-nums']} fontWeight="900" minWidth={44} textAlign="center">
                {side.score}
              </Text>
              {state.canManage && state.status === 'IN_PROGRESS' ? (
                <Button
                  accessibilityLabel={`Aumentar placar de ${liveScoreSideLabel(match, side.sideNumber)}`}
                  backgroundColor="$onzeGreen"
                  borderRadius="$5"
                  disabled={isUpdating}
                  height={52}
                  hitSlop={12}
                  onPress={() => onChangeScore(side.sideNumber, side.score + 1)}
                  pressStyle={{ backgroundColor: '$onzeGreenPress', opacity: 0.8, scale: 0.96 }}
                  width={52}
                >
                  <Text color="$onzeSurface" fontSize={24} fontWeight="900">+</Text>
                </Button>
              ) : null}
            </XStack>
          );
        })}
      </YStack>
    </YStack>
  );
}
