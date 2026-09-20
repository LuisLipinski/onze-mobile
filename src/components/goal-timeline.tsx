import { Text, XStack, YStack } from 'tamagui';

import type { FootballMatch, GoalEvent } from '../lib/api';
import { formatMatchTimer, liveScoreSideLabel } from '../lib/live-match';

function GoalDetails({ event, align }: { event: GoalEvent; align: 'left' | 'right' }) {
  return (
    <YStack alignItems={align === 'left' ? 'flex-end' : 'flex-start'} flex={1} minWidth={0}>
      <XStack alignItems="center" gap="$2" flexDirection={align === 'left' ? 'row' : 'row-reverse'}>
        <Text color="$onzeInk" fontWeight="900" numberOfLines={1}>
          {event.scorerDisplayName ?? 'Jogador'}
        </Text>
        <Text fontSize={18}>⚽</Text>
      </XStack>
      {event.assistDisplayName ? (
        <Text color="$onzeMuted" fontSize={12} numberOfLines={1}>
          Assist.: {event.assistDisplayName}
        </Text>
      ) : null}
      {event.penalty ? (
        <Text color="$onzeGreen" fontSize={11} fontWeight="800">PÊNALTI</Text>
      ) : null}
    </YStack>
  );
}

export function GoalTimeline({ events, match }: { events: GoalEvent[]; match: FootballMatch }) {
  if (events.length === 0) return null;

  return (
    <YStack
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderRadius="$6"
      borderWidth={1}
      overflow="hidden"
    >
      <YStack backgroundColor="#E8F7EE" gap="$1" padding="$4">
        <Text color="$onzeInk" fontSize={18} fontWeight="900">Linha do tempo</Text>
        <Text color="$onzeMuted" fontSize={12}>Gols mais recentes aparecem primeiro.</Text>
      </YStack>

      <YStack paddingHorizontal="$3" paddingVertical="$4">
        {events.map((event, index) => {
          const left = event.sideNumber === 1;
          return (
            <XStack key={event.id} alignItems="stretch" minHeight={72}>
              <YStack flex={1} justifyContent="center" paddingRight="$2">
                {left ? <GoalDetails event={event} align="left" /> : null}
              </YStack>

              <YStack alignItems="center" width={64}>
                {index > 0 ? <YStack backgroundColor="$onzeBorder" height={12} width={2} /> : null}
                <YStack
                  alignItems="center"
                  backgroundColor="$onzeGreen"
                  borderRadius={999}
                  justifyContent="center"
                  minWidth={58}
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                >
                  <Text color="$onzeSurface" fontSize={12} fontVariant={['tabular-nums']} fontWeight="900">
                    {formatMatchTimer(event.elapsedSeconds)}
                  </Text>
                </YStack>
                {index < events.length - 1 ? <YStack backgroundColor="$onzeBorder" flex={1} width={2} /> : null}
              </YStack>

              <YStack flex={1} justifyContent="center" paddingLeft="$2">
                {!left ? <GoalDetails event={event} align="right" /> : null}
              </YStack>
            </XStack>
          );
        })}
      </YStack>

      <XStack borderTopColor="$onzeBorder" borderTopWidth={1} padding="$3">
        <Text color="$onzeMuted" flex={1} fontSize={12} fontWeight="800" textAlign="left">
          {liveScoreSideLabel(match, 1)}
        </Text>
        <Text color="$onzeMuted" flex={1} fontSize={12} fontWeight="800" textAlign="right">
          {liveScoreSideLabel(match, 2)}
        </Text>
      </XStack>
    </YStack>
  );
}
