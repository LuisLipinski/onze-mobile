import { useEffect, useState } from 'react';
import { Image, Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { FootballMatch, LiveMatchState, LiveScoreSide } from '../lib/api';
import { formatMatchTimer, liveMatchElapsedSeconds, liveScoreSideLabel } from '../lib/live-match';

type Props = {
  match: FootballMatch;
  state: LiveMatchState;
  teamImageUrl: string | null;
  onChangeScore: (sideNumber: number, score: number) => void;
};

type TeamIdentityProps = {
  imageUrl: string | null;
  label: string;
  sideNumber: number;
};

function TeamIdentity({ imageUrl, label, sideNumber }: TeamIdentityProps) {
  return (
    <YStack alignItems="center" flex={1} gap="$2" minWidth={0}>
      {imageUrl ? (
        <Image
          accessibilityLabel={`Símbolo de ${label}`}
          resizeMode="cover"
          source={{ uri: imageUrl }}
          style={{ width: 58, height: 58, borderRadius: 14 }}
        />
      ) : (
        <YStack
          alignItems="center"
          backgroundColor="#DDF3E7"
          borderColor="$onzeGreen"
          borderRadius="$4"
          borderWidth={1}
          height={58}
          justifyContent="center"
          width={58}
        >
          <Text color="$onzeGreen" fontSize={18} fontWeight="900">T{sideNumber}</Text>
        </YStack>
      )}
      <Text color="$onzeInk" fontSize={14} fontWeight="900" numberOfLines={2} textAlign="center">
        {label}
      </Text>
    </YStack>
  );
}

type ScoreControlsProps = {
  label: string;
  side: LiveScoreSide;
  onChangeScore: Props['onChangeScore'];
};

function ScoreControls({ label, side, onChangeScore }: ScoreControlsProps) {
  return (
    <XStack gap="$2" justifyContent="center">
      <Pressable
        accessibilityLabel={`Diminuir placar de ${label}`}
        disabled={side.score === 0}
        hitSlop={12}
        onPress={() => onChangeScore(side.sideNumber, -1)}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderColor: '#DDE6E1',
          borderRadius: 12,
          borderWidth: 1,
          height: 54,
          justifyContent: 'center',
          opacity: side.score === 0 ? 0.4 : pressed ? 0.65 : 1,
          width: 54,
        })}
      >
        <Text color="$onzeInk" fontSize={30} fontWeight="900" lineHeight={34}>−</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Aumentar placar de ${label}`}
        hitSlop={12}
        onPress={() => onChangeScore(side.sideNumber, 1)}
        style={({ pressed }) => ({
          alignItems: 'center',
          backgroundColor: pressed ? '#0F6D3B' : '#148A4A',
          borderRadius: 12,
          height: 54,
          justifyContent: 'center',
          opacity: pressed ? 0.82 : 1,
          width: 54,
        })}
      >
        <Text color="$onzeSurface" fontSize={30} fontWeight="900" lineHeight={34}>+</Text>
      </Pressable>
    </XStack>
  );
}

export function LiveScoreboard({
  match,
  state,
  teamImageUrl,
  onChangeScore,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => liveMatchElapsedSeconds(state));
  const canManage = state.canManage && state.status === 'IN_PROGRESS';

  useEffect(() => {
    setElapsedSeconds(liveMatchElapsedSeconds(state));
    if (state.status !== 'IN_PROGRESS') return;
    const interval = setInterval(() => setElapsedSeconds(liveMatchElapsedSeconds(state)), 1_000);
    return () => clearInterval(interval);
  }, [state]);

  const firstSide = state.scores[0];
  const secondSide = state.scores[1];
  const firstLabel = firstSide ? liveScoreSideLabel(match, firstSide.sideNumber) : '';
  const secondLabel = secondSide ? liveScoreSideLabel(match, secondSide.sideNumber) : '';

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

      {state.scores.length === 2 && firstSide && secondSide ? (
        <YStack gap="$4" paddingHorizontal="$3" paddingVertical="$5">
          <XStack alignItems="center" gap="$2">
            <TeamIdentity imageUrl={teamImageUrl} label={firstLabel} sideNumber={firstSide.sideNumber} />
            <XStack alignItems="center" justifyContent="center" minWidth={142}>
              <Text color="$onzeGreen" fontSize={52} fontVariant={['tabular-nums']} fontWeight="900" lineHeight={60}>
                {firstSide.score}
              </Text>
              <Text color="$onzeMuted" fontSize={36} fontWeight="700" paddingHorizontal="$2">:</Text>
              <Text color="$onzeGreen" fontSize={52} fontVariant={['tabular-nums']} fontWeight="900" lineHeight={60}>
                {secondSide.score}
              </Text>
            </XStack>
            <TeamIdentity imageUrl={teamImageUrl} label={secondLabel} sideNumber={secondSide.sideNumber} />
          </XStack>

          {canManage ? (
            <XStack gap="$3">
              <YStack flex={1}>
                <ScoreControls
                  label={firstLabel}
                  side={firstSide}
                  onChangeScore={onChangeScore}
                />
              </YStack>
              <YStack flex={1}>
                <ScoreControls
                  label={secondLabel}
                  side={secondSide}
                  onChangeScore={onChangeScore}
                />
              </YStack>
            </XStack>
          ) : null}
        </YStack>
      ) : (
        <YStack gap="$3" padding="$4">
          {state.scores.map((side) => {
            const label = liveScoreSideLabel(match, side.sideNumber);
            return (
              <YStack
                key={side.sideNumber}
                alignItems="center"
                backgroundColor="#F7FAF8"
                borderColor="$onzeBorder"
                borderRadius="$5"
                borderWidth={1}
                gap="$2"
                padding="$3"
              >
                <TeamIdentity imageUrl={teamImageUrl} label={label} sideNumber={side.sideNumber} />
                <Text color="$onzeGreen" fontSize={48} fontVariant={['tabular-nums']} fontWeight="900">
                  {side.score}
                </Text>
                {canManage ? (
                  <ScoreControls
                    label={label}
                    side={side}
                    onChangeScore={onChangeScore}
                  />
                ) : null}
              </YStack>
            );
          })}
        </YStack>
      )}
    </YStack>
  );
}
