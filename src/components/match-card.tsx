import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { FootballMatch } from '../lib/api';

function formatDate(match: FootballMatch) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: match.timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(match.startsAt));
}

function formatTime(match: FootballMatch) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: match.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(match.startsAt));
}

function attendanceMessage(match: FootballMatch) {
  if (!match.attendanceOpen) {
    const opening = new Intl.DateTimeFormat('pt-BR', {
      timeZone: match.timeZone,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(match.attendanceOpensAt));
    return `Presença abre em ${opening}`;
  }
  if (match.myAttendance === 'GOING') return 'Você confirmou presença';
  if (match.myAttendance === 'NOT_GOING') return 'Você informou que não vai';
  return 'Confirme sua presença';
}

export function MatchCard({
  match,
  onPress,
  showGroup = true,
}: {
  match: FootballMatch;
  onPress: () => void;
  showGroup?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <YStack
        backgroundColor="$onzeSurface"
        borderColor="$onzeBorder"
        borderRadius="$6"
        borderWidth={1}
        gap="$3"
        padding="$4"
      >
        <XStack alignItems="flex-start" gap="$3">
          <YStack
            alignItems="center"
            backgroundColor="$onzeGreen"
            borderRadius="$4"
            minWidth={68}
            paddingHorizontal="$2"
            paddingVertical="$3"
          >
            <Text color="$onzeSurface" fontSize={13} fontWeight="800" textTransform="uppercase">
              {formatDate(match).split(',')[0]}
            </Text>
            <Text color="$onzeSurface" fontSize={18} fontWeight="900">
              {formatTime(match)}
            </Text>
          </YStack>

          <YStack flex={1} gap="$1">
            {showGroup ? (
              <Text color="$onzeGreen" fontSize={11} fontWeight="900" numberOfLines={1}>
                {match.groupName.toUpperCase()}
              </Text>
            ) : null}
            <Text color="$onzeInk" fontSize={17} fontWeight="900" textTransform="capitalize">
              {formatDate(match)}
            </Text>
            <Text color="$onzeMuted" fontSize={13} numberOfLines={1}>{match.venue}</Text>
          </YStack>
          <Text color="$onzeMuted" fontSize={24} fontWeight="700">›</Text>
        </XStack>

        <XStack alignItems="center" gap="$2" justifyContent="space-between">
          <YStack
            backgroundColor={match.attendanceOpen ? '$onzeCanvas' : '$onzeBorder'}
            borderRadius={999}
            paddingHorizontal="$3"
            paddingVertical="$2"
          >
            <Text
              color={match.myAttendance === 'GOING' ? '$onzeGreen' : '$onzeMuted'}
              fontSize={11}
              fontWeight="800"
            >
              {attendanceMessage(match)}
            </Text>
          </YStack>
          <Text color="$onzeInk" fontSize={12} fontWeight="800">
            {match.goingCount}/{match.maxPlayers} confirmados
          </Text>
        </XStack>

        {match.recurrence === 'WEEKLY' ? (
          <Text color="$onzeMuted" fontSize={11} fontWeight="700">↻ JOGO SEMANAL</Text>
        ) : null}
      </YStack>
    </Pressable>
  );
}
