import { Fragment } from 'react';
import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { CardEvent, FootballMatch, GoalEvent, LiveScoreSide } from '../lib/api';
import { formatMatchTimer, liveScoreSideLabel, periodLabel, secondYellowCardEventIds } from '../lib/live-match';
import { ONZE_COLORS } from '../theme/colors';

type EventKind = 'GOAL' | 'CARD';

function DeleteEventButton({ align, disabled, onPress }: {
  align: 'left' | 'right';
  disabled: boolean;
  onPress?: () => void;
}) {
  if (!onPress) return null;
  return (
    <Pressable
      accessibilityLabel="Remover evento da linha do tempo"
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        alignSelf: align === 'left' ? 'flex-end' : 'flex-start',
        backgroundColor: ONZE_COLORS.dangerBg,
        borderRadius: 999,
        height: 32,
        justifyContent: 'center',
        marginTop: 6,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        width: 32,
      })}
    >
      <Text fontSize={15}>{disabled ? '…' : '🗑️'}</Text>
    </Pressable>
  );
}

function GoalDetails({ event, align, deletionDisabled, onDelete }: {
  event: GoalEvent;
  align: 'left' | 'right';
  deletionDisabled: boolean;
  onDelete?: () => void;
}) {
  return (
    <YStack alignItems={align === 'left' ? 'flex-end' : 'flex-start'} flex={1} minWidth={0}>
      <XStack alignItems="center" gap="$2" flexDirection={align === 'left' ? 'row' : 'row-reverse'}>
        <Text color="$onzeInk" fontWeight="900" numberOfLines={1}>
          {event.scorerDisplayName ?? 'Jogador'}
        </Text>
        <Text fontSize={18}>⚽</Text>
      </XStack>
      {event.assistDisplayName ? (
        <XStack alignItems="center" gap="$1" flexDirection={align === 'left' ? 'row' : 'row-reverse'}>
          <Text fontSize={14}>👟</Text>
          <Text color="$onzeMuted" fontSize={12} numberOfLines={1}>{event.assistDisplayName}</Text>
        </XStack>
      ) : null}
      {event.penalty ? (
        <Text color="$onzeGreen" fontSize={11} fontWeight="800">PÊNALTI</Text>
      ) : null}
      <DeleteEventButton align={align} disabled={deletionDisabled} onPress={onDelete} />
    </YStack>
  );
}

type TimelineEvent = (GoalEvent & { kind: 'GOAL' }) | (CardEvent & { kind: 'CARD' });

function CardShape({ color }: {
  color: typeof ONZE_COLORS.warning | typeof ONZE_COLORS.danger;
}) {
  return <YStack backgroundColor={color} borderRadius={2} height={22} width={15} />;
}

function CardDetails({ event, align, secondYellow, deletionDisabled, onDelete }: {
  event: CardEvent;
  align: 'left' | 'right';
  secondYellow: boolean;
  deletionDisabled: boolean;
  onDelete?: () => void;
}) {
  const color = event.cardType === 'YELLOW' ? ONZE_COLORS.warning : ONZE_COLORS.danger;
  return <YStack alignItems={align === 'left' ? 'flex-end' : 'flex-start'} flex={1} minWidth={0}>
    <XStack alignItems="center" gap="$2" flexDirection={align === 'left' ? 'row' : 'row-reverse'}>
      <Text color="$onzeInk" fontWeight="900" numberOfLines={1}>{event.playerDisplayName}</Text>
      {secondYellow ? (
        <XStack alignItems="center" gap="$1">
          <CardShape color={ONZE_COLORS.warning} />
          <CardShape color={ONZE_COLORS.warning} />
          <Text color="$onzeMuted" fontWeight="900">→</Text>
          <CardShape color={ONZE_COLORS.danger} />
        </XStack>
      ) : <CardShape color={color} />}
    </XStack>
    <Text
      color={secondYellow || event.cardType === 'RED' ? '$onzeDanger' : '$onzeMuted'}
      fontSize={11}
      fontWeight="800"
    >
      {secondYellow
        ? '2º AMARELO • EXPULSO'
        : event.cardType === 'RED'
          ? 'CARTÃO VERMELHO • EXPULSO'
          : 'CARTÃO AMARELO'}
    </Text>
    <DeleteEventButton align={align} disabled={deletionDisabled} onPress={onDelete} />
  </YStack>;
}

export function GoalTimeline({
  events,
  cardEvents = [],
  match,
  sides = [],
  canDelete = false,
  deletingEventKey = null,
  onDelete,
}: {
  events: GoalEvent[];
  cardEvents?: CardEvent[];
  match: FootballMatch;
  sides?: LiveScoreSide[];
  canDelete?: boolean;
  deletingEventKey?: string | null;
  onDelete?: (kind: EventKind, eventId: string) => void;
}) {
  const secondYellowIds = secondYellowCardEventIds(cardEvents);
  const timeline: TimelineEvent[] = [
    ...events.map((event) => ({ ...event, kind: 'GOAL' as const })),
    ...cardEvents.map((event) => ({ ...event, kind: 'CARD' as const })),
  ].sort((a, b) => b.elapsedSeconds - a.elapsedSeconds || b.createdAt.localeCompare(a.createdAt));
  if (timeline.length === 0) return null;

  function eventPeriodKey(event: TimelineEvent) {
    return event.periodType && event.periodNumber
      ? `${event.periodType}:${event.periodNumber}`
      : 'LEGACY';
  }

  return (
    <YStack
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderRadius="$6"
      borderWidth={1}
      overflow="hidden"
    >
      <YStack backgroundColor="$onzeSuccessBg" gap="$1" padding="$4">
        <Text color="$onzeInk" fontSize={18} fontWeight="900">Linha do tempo</Text>
        <Text color="$onzeMuted" fontSize={12}>Gols e cartões mais recentes aparecem primeiro.</Text>
      </YStack>

      <YStack paddingHorizontal="$3" paddingVertical="$4">
        {timeline.map((event, index) => {
          const left = event.sideNumber === 1;
          const deleteEvent = canDelete && onDelete
            ? () => onDelete(event.kind, event.id)
            : undefined;
          const deletionDisabled = deletingEventKey != null;
          const periodKey = eventPeriodKey(event);
          const previousPeriodKey = index > 0 ? eventPeriodKey(timeline[index - 1]) : null;
          return (
            <Fragment key={event.id}>
              {periodKey !== previousPeriodKey ? (
                <YStack
                  alignItems="center"
                  backgroundColor="$onzeCanvas"
                  borderRadius="$4"
                  marginBottom="$2"
                  marginTop={index === 0 ? 0 : '$3'}
                  padding="$2"
                >
                  <Text color="$onzeGreen" fontSize={12} fontWeight="900" textTransform="uppercase">
                    {event.periodType && event.periodNumber
                      ? periodLabel({ periodType: event.periodType, periodNumber: event.periodNumber })
                      : 'Jogo'}
                  </Text>
                </YStack>
              ) : null}
              <XStack alignItems="stretch" minHeight={72}>
              <YStack flex={1} justifyContent="center" paddingRight="$2">
                {left ? (event.kind === 'GOAL'
                  ? <GoalDetails event={event} align="left" deletionDisabled={deletionDisabled} onDelete={deleteEvent} />
                  : <CardDetails event={event} align="left" secondYellow={secondYellowIds.has(event.id)} deletionDisabled={deletionDisabled} onDelete={deleteEvent} />) : null}
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
                    {formatMatchTimer(event.periodElapsedSeconds ?? event.elapsedSeconds)}
                  </Text>
                </YStack>
                {index < timeline.length - 1 ? <YStack backgroundColor="$onzeBorder" flex={1} width={2} /> : null}
              </YStack>

              <YStack flex={1} justifyContent="center" paddingLeft="$2">
                {!left ? (event.kind === 'GOAL'
                  ? <GoalDetails event={event} align="right" deletionDisabled={deletionDisabled} onDelete={deleteEvent} />
                  : <CardDetails event={event} align="right" secondYellow={secondYellowIds.has(event.id)} deletionDisabled={deletionDisabled} onDelete={deleteEvent} />) : null}
              </YStack>
              </XStack>
            </Fragment>
          );
        })}
      </YStack>

      <XStack borderTopColor="$onzeBorder" borderTopWidth={1} padding="$3">
        <Text color="$onzeMuted" flex={1} fontSize={12} fontWeight="800" textAlign="left">
          {liveScoreSideLabel(match, 1, sides.find((side) => side.sideNumber === 1)?.name)}
        </Text>
        <Text color="$onzeMuted" flex={1} fontSize={12} fontWeight="800" textAlign="right">
          {liveScoreSideLabel(match, 2, sides.find((side) => side.sideNumber === 2)?.name)}
        </Text>
      </XStack>
    </YStack>
  );
}
