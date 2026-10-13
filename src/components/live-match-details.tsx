import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { FootballMatch, LiveMatchState, TeamStatisticType } from '../lib/api';
import { liveScoreSideLabel, secondYellowCardEventIds } from '../lib/live-match';
import { ONZE_COLORS } from '../theme/colors';

type Props = {
  match: FootballMatch;
  state: LiveMatchState;
  saving: boolean;
  onCorrectStatistic: (sideNumber: number, type: TeamStatisticType) => void;
};

type Row = {
  label: string;
  values: [string, string];
  type?: TeamStatisticType;
  canCorrect?: [boolean, boolean];
};

function StatisticValue({ value, sideNumber, label, type, canCorrect, saving, onCorrect }: {
  value: string;
  sideNumber: number;
  label: string;
  type?: TeamStatisticType;
  canCorrect?: boolean;
  saving: boolean;
  onCorrect: Props['onCorrectStatistic'];
}) {
  return (
    <XStack alignItems="center" justifyContent="center" width={72}>
      {type && canCorrect ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remover um registro de ${label.toLowerCase()} do time ${sideNumber}`}
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          hitSlop={5}
          onPress={() => onCorrect(sideNumber, type)}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderColor: ONZE_COLORS.border,
            borderRadius: 8,
            borderWidth: 1,
            height: 25,
            justifyContent: 'center',
            marginRight: 5,
            opacity: saving ? 0.5 : pressed ? 0.65 : 1,
            width: 25,
          })}
        >
          <Text color="$onzeMuted" fontSize={18} lineHeight={21}>−</Text>
        </Pressable>
      ) : null}
      <Text color="$onzeInk" fontSize={17} fontVariant={['tabular-nums']} fontWeight="900">
        {value}
      </Text>
    </XStack>
  );
}

export function LiveMatchDetails({ match, state, saving, onCorrectStatistic }: Props) {
  const sides = [1, 2] as const;
  const secondYellows = secondYellowCardEventIds(state.cardEvents ?? []);
  const stats = sides.map((number) => state.teamStatistics?.find((item) => item.sideNumber === number));
  const score = sides.map((number) => state.scores.find((side) => side.sideNumber === number));
  const cardCount = (number: number, type: 'YELLOW' | 'RED') => (state.cardEvents ?? [])
    .filter((card) => card.sideNumber === number
      && (card.cardType === type || (type === 'RED' && secondYellows.has(card.id)))).length;
  const penaltyGoals = (number: number) => (state.goalEvents ?? [])
    .filter((goal) => goal.sideNumber === number && goal.penalty).length;
  const penaltyResult = (number: number) => {
    const shootout = state.penaltyShootout;
    return number === 1
      ? `${shootout?.teamOneScore ?? 0}/${shootout?.teamOneAttempts ?? 0}`
      : `${shootout?.teamTwoScore ?? 0}/${shootout?.teamTwoAttempts ?? 0}`;
  };
  const canManage = state.canManage && state.status === 'IN_PROGRESS'
    && (state.phase === 'LEGACY' || state.periods?.some((period) => period.endedAt == null));
  const rows: Row[] = [
    { label: 'Gols', values: [String(score[0]?.score ?? 0), String(score[1]?.score ?? 0)] },
    { label: 'Chutes no gol', type: 'SHOTS_ON_TARGET',
      values: stats.map((item) => String(item?.shotsOnTarget ?? 0)) as [string, string],
      canCorrect: stats.map((item) => canManage && (item?.shotsOnTarget ?? 0) > 0) as [boolean, boolean] },
    { label: 'Chutes', type: 'SHOTS',
      values: stats.map((item) => String(item?.shots ?? 0)) as [string, string],
      canCorrect: stats.map((item) => canManage && (item?.shots ?? 0) > (item?.shotsOnTarget ?? 0)) as [boolean, boolean] },
    { label: 'Escanteios', type: 'CORNERS',
      values: stats.map((item) => String(item?.corners ?? 0)) as [string, string],
      canCorrect: stats.map((item) => canManage && (item?.corners ?? 0) > 0) as [boolean, boolean] },
    { label: 'Faltas', type: 'FOULS',
      values: stats.map((item) => String(item?.fouls ?? 0)) as [string, string],
      canCorrect: stats.map((item) => canManage && (item?.fouls ?? 0) > 0) as [boolean, boolean] },
    { label: 'Cartões amarelos', values: sides.map((number) => String(cardCount(number, 'YELLOW'))) as [string, string] },
    { label: 'Cartões vermelhos', values: sides.map((number) => String(cardCount(number, 'RED'))) as [string, string] },
    { label: 'Gols de pênalti', values: sides.map((number) => String(penaltyGoals(number))) as [string, string] },
    { label: 'Disputa (gols/tent.)', values: sides.map(penaltyResult) as [string, string] },
  ];

  return (
    <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} overflow="hidden">
      <Text color="$onzeInk" fontSize={20} fontWeight="900" padding="$4">Detalhes do jogo</Text>
      <XStack alignItems="center" backgroundColor="$onzeSuccessBg" paddingHorizontal="$3" paddingVertical="$3">
        <Text color="$onzeGreen" flex={1} fontWeight="900" numberOfLines={2} textAlign="center">
          {liveScoreSideLabel(match, 1, score[0]?.name)}
        </Text>
        <Text color="$onzeMuted" fontSize={11} fontWeight="800" textAlign="center" width={110}>ESTATÍSTICA</Text>
        <Text color="$onzeGreen" flex={1} fontWeight="900" numberOfLines={2} textAlign="center">
          {liveScoreSideLabel(match, 2, score[1]?.name)}
        </Text>
      </XStack>
      {rows.map((row, index) => (
        <XStack
          key={row.label}
          alignItems="center"
          backgroundColor={index % 2 === 0 ? '$onzeSurface' : '$onzeCanvas'}
          minHeight={58}
          paddingHorizontal="$2"
          paddingVertical="$2"
        >
          <StatisticValue value={row.values[0]} sideNumber={1} label={row.label} type={row.type}
            canCorrect={row.canCorrect?.[0]} saving={saving} onCorrect={onCorrectStatistic} />
          <Text color="$onzeMuted" flex={1} fontSize={13} fontWeight="800" textAlign="center">
            {row.label}
          </Text>
          <StatisticValue value={row.values[1]} sideNumber={2} label={row.label} type={row.type}
            canCorrect={row.canCorrect?.[1]} saving={saving} onCorrect={onCorrectStatistic} />
        </XStack>
      ))}
      <Text color="$onzeMuted" fontSize={11} padding="$3" textAlign="center">
        Chutes no gol já estão incluídos no total de chutes. Dois amarelos contam como expulsão.
      </Text>
    </YStack>
  );
}
