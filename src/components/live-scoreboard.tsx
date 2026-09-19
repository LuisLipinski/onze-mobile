import { useEffect, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';

import type { FootballMatch, LiveMatchState, LiveScoreSide } from '../lib/api';
import { formatMatchTimer, liveMatchElapsedSeconds, liveScoreSideLabel } from '../lib/live-match';

type Props = {
  match: FootballMatch;
  state: LiveMatchState;
  updatingSides: number[];
  onChangeScore: (sideNumber: number, score: number) => void;
};

type TeamScoreProps = {
  label: string;
  side: LiveScoreSide;
  canManage: boolean;
  isUpdating: boolean;
  onChangeScore: Props['onChangeScore'];
};

function TeamScore({ label, side, canManage, isUpdating, onChangeScore }: TeamScoreProps) {
  return (
    <YStack alignItems="center" flex={1} gap="$2" minWidth={0}>
      <YStack
        alignItems="center"
        backgroundColor="#DDF3E7"
        borderColor="$onzeGreen"
        borderRadius={999}
        borderWidth={1}
        height={46}
        justifyContent="center"
        width={46}
      >
        <Text color="$onzeGreen" fontSize={14} fontWeight="900">T{side.sideNumber}</Text>
      </YStack>

      <Text
        color="$onzeInk"
        fontSize={16}
        fontWeight="900"
        minHeight={44}
        numberOfLines={2}
        textAlign="center"
      >
        {label}
      </Text>

      <Text
        color="$onzeGreen"
        fontSize={64}
        fontVariant={['tabular-nums']}
        fontWeight="900"
        lineHeight={72}
        textAlign="center"
      >
        {side.score}
      </Text>

      {canManage ? (
        <XStack gap="$2">
          <Button
            accessibilityLabel={`Diminuir placar de ${label}`}
            backgroundColor="$onzeSurface"
            borderColor="$onzeBorder"
            borderRadius="$4"
            borderWidth={1}
            disabled={isUpdating || side.score === 0}
            height={48}
            hitSlop={10}
            onPress={() => onChangeScore(side.sideNumber, side.score - 1)}
            pressStyle={{ opacity: 0.65, scale: 0.96 }}
            width={48}
          >
            <Text color="$onzeInk" fontSize={25} fontWeight="900">−</Text>
          </Button>
          <Button
            accessibilityLabel={`Aumentar placar de ${label}`}
            backgroundColor="$onzeGreen"
            borderRadius="$4"
            disabled={isUpdating}
            height={48}
            hitSlop={10}
            onPress={() => onChangeScore(side.sideNumber, side.score + 1)}
            pressStyle={{ backgroundColor: '$onzeGreenPress', opacity: 0.8, scale: 0.96 }}
            width={48}
          >
            <Text color="$onzeSurface" fontSize={25} fontWeight="900">+</Text>
          </Button>
        </XStack>
      ) : null}
    </YStack>
  );
}

export function LiveScoreboard({ match, state, updatingSides, onChangeScore }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => liveMatchElapsedSeconds(state));
  const canManage = state.canManage && state.status === 'IN_PROGRESS';

  useEffect(() => {
    setElapsedSeconds(liveMatchElapsedSeconds(state));
    if (state.status !== 'IN_PROGRESS') return;
    const interval = setInterval(() => setElapsedSeconds(liveMatchElapsedSeconds(state)), 1_000);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <YStack
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderRadius="$6"
      borderWidth={1}
      overflow="hidden"
    >
      <XStack
        alignItems="center"
        backgroundColor={state.status === 'IN_PROGRESS' ? '#E8F7EE' : '#EEF2F0'}
        borderBottomColor="$onzeBorder"
        borderBottomWidth={1}
        gap="$2"
        justifyContent="center"
        paddingHorizontal="$4"
        paddingVertical="$3"
      >
        <YStack
          backgroundColor={state.status === 'IN_PROGRESS' ? '$onzeGreen' : '$onzeMuted'}
          borderRadius={999}
          paddingHorizontal="$3"
          paddingVertical="$1"
        >
          <Text color="$onzeSurface" fontSize={12} fontWeight="900">
            {state.status === 'IN_PROGRESS' ? 'AO VIVO' : 'FINALIZADA'}
          </Text>
        </YStack>
        <Text color="$onzeInk" fontSize={24} fontVariant={['tabular-nums']} fontWeight="900">
          {formatMatchTimer(elapsedSeconds)}
        </Text>
      </XStack>

      {state.scores.length === 2 ? (
        <XStack alignItems="center" gap="$2" paddingHorizontal="$3" paddingVertical="$5">
          <TeamScore
            label={liveScoreSideLabel(match, state.scores[0].sideNumber)}
            side={state.scores[0]}
            canManage={canManage}
            isUpdating={updatingSides.includes(state.scores[0].sideNumber)}
            onChangeScore={onChangeScore}
          />
          <Text color="$onzeMuted" fontSize={42} fontWeight="700" marginTop={58}>:</Text>
          <TeamScore
            label={liveScoreSideLabel(match, state.scores[1].sideNumber)}
            side={state.scores[1]}
            canManage={canManage}
            isUpdating={updatingSides.includes(state.scores[1].sideNumber)}
            onChangeScore={onChangeScore}
          />
        </XStack>
      ) : (
        <YStack gap="$3" padding="$4">
          {state.scores.map((side) => (
            <XStack
              key={side.sideNumber}
              alignItems="center"
              backgroundColor="#F7FAF8"
              borderColor="$onzeBorder"
              borderRadius="$5"
              borderWidth={1}
              padding="$3"
            >
              <TeamScore
                label={liveScoreSideLabel(match, side.sideNumber)}
                side={side}
                canManage={canManage}
                isUpdating={updatingSides.includes(side.sideNumber)}
                onChangeScore={onChangeScore}
              />
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}
