import { Image, Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { PlayerMatchResult, StatisticsTeam } from '../lib/api';
import { formatLongDateTime } from '../lib/date-format';
import { playerMatchResultLabel } from '../lib/statistics';

const DEFAULT_TEAM_IMAGE = require('../../assets/icon.png');

type Props = {
  startsAt: string;
  timeZone: string;
  venue: string;
  teams: StatisticsTeam[];
  highlightTeamNumber?: number;
  result?: PlayerMatchResult;
  detail?: string;
  onPress?: () => void;
};

export function StatisticsMatchCard({
  startsAt,
  timeZone,
  venue,
  teams,
  highlightTeamNumber,
  result,
  detail,
  onPress,
}: Props) {
  const resultColors = result === 'WIN'
    ? { background: '$onzeSuccessBg' as const, color: '$onzeGreen' as const }
    : result === 'LOSS'
      ? { background: '$onzeDangerBg' as const, color: '$onzeDanger' as const }
      : { background: '$onzeWarningBg' as const, color: '$onzeWarningText' as const };

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
    >
      <YStack
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        borderRadius="$6"
        borderWidth={1}
        gap="$3"
        padding="$4"
      >
        <XStack alignItems="flex-start" gap="$3" justifyContent="space-between">
          <YStack flex={1} gap={2}>
            <Text color="$onzeInk" fontSize={13} fontWeight="900">
              {formatLongDateTime(startsAt, timeZone, false)}
            </Text>
            <Text color="$onzeMuted" fontSize={12} numberOfLines={1}>{venue}</Text>
          </YStack>
          {result ? (
            <YStack
              backgroundColor={resultColors.background}
              borderRadius={999}
              paddingHorizontal="$3"
              paddingVertical="$1"
            >
              <Text color={resultColors.color} fontSize={11} fontWeight="900">
                {playerMatchResultLabel(result).toUpperCase()}
              </Text>
            </YStack>
          ) : null}
        </XStack>

        <YStack gap="$2">
          {teams.map((team) => {
            const highlighted = team.teamNumber === highlightTeamNumber;
            return (
              <XStack
                key={team.teamNumber}
                alignItems="center"
                backgroundColor={highlighted ? '$onzeSuccessBg' : '$onzeCanvas'}
                borderRadius="$4"
                gap="$3"
                padding="$3"
              >
                <Image
                  accessibilityLabel={`Símbolo de ${team.name}`}
                  source={team.imageUrl ? { uri: team.imageUrl } : DEFAULT_TEAM_IMAGE}
                  style={{ width: 36, height: 36, borderRadius: 10 }}
                />
                <YStack flex={1} gap={1}>
                  <Text color="$onzeInk" fontSize={14} fontWeight="800" numberOfLines={1}>
                    {team.name}
                  </Text>
                  {highlighted ? (
                    <Text color="$onzeGreen" fontSize={10} fontWeight="900">SEU TIME</Text>
                  ) : null}
                </YStack>
                <Text color="$onzeInk" fontSize={24} fontWeight="900">
                  {team.score}
                </Text>
              </XStack>
            );
          })}
        </YStack>

        {detail ? (
          <XStack alignItems="center" justifyContent="space-between">
            <Text color="$onzeMuted" flex={1} fontSize={11}>{detail}</Text>
            {onPress ? <Text color="$onzeGreen" fontSize={12} fontWeight="900">Ver jogo ›</Text> : null}
          </XStack>
        ) : null}
      </YStack>
    </Pressable>
  );
}
