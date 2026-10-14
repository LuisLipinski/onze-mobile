import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { FootballMatch, LiveMatchState, TeamStatisticType } from '../lib/api';
import { playerShotTotals } from '../lib/player-shots';
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

function TeamComparison({ match, state, saving, onCorrectStatistic, teamNumbers, title }:
    Props & { teamNumbers: readonly [number, number | null]; title: string }) {
  const sides = [teamNumbers[0], teamNumbers[1] ?? 0] as const;
  const display = (number: number, value: string) => number === 0 ? '—' : value;
  const secondYellows = secondYellowCardEventIds(state.cardEvents ?? []);
  const stats = sides.map((number) => state.teamStatistics?.find((item) => item.sideNumber === number));
  const score = sides.map((number) => state.scores.find((side) => side.sideNumber === number));
  const cardCount = (number: number, type: 'YELLOW' | 'RED') => (state.cardEvents ?? [])
    .filter((card) => card.sideNumber === number
      && (card.cardType === type || (type === 'RED' && secondYellows.has(card.id)))).length;
  const penaltyGoals = (number: number) => (state.goalEvents ?? [])
    .filter((goal) => goal.sideNumber === number && goal.penalty).length;
  const fouls = state.foulEvents ?? [];
  const foulCount = (number: number, kind: 'COMMITTED' | 'PENALTY_COMMITTED' | 'PENALTY_WON' | 'PENALTY_MISSED') => fouls
    .filter((item) => kind === 'COMMITTED' ? item.offenderSideNumber === number
      : kind === 'PENALTY_COMMITTED' ? item.penalty && item.offenderSideNumber === number
        : kind === 'PENALTY_WON' ? item.penalty && item.victimSideNumber === number
          : item.penalty && item.victimSideNumber === number && item.scored === false).length;
  const penaltyResult = (number: number) => {
    const shootout = state.penaltyShootout;
    return number === 1
      ? `${shootout?.teamOneScore ?? 0}/${shootout?.teamOneAttempts ?? 0}`
      : number === 2
        ? `${shootout?.teamTwoScore ?? 0}/${shootout?.teamTwoAttempts ?? 0}`
        : '—';
  };
  const canManage = state.canManage && state.status === 'IN_PROGRESS'
    && (state.phase === 'LEGACY' || state.periods?.some((period) => period.endedAt == null));
  const rows: Row[] = [
    { label: 'Gols', values: sides.map((number, index) => display(number,
      String(score[index]?.score ?? 0))) as [string, string] },
    { label: 'Chutes no gol', type: 'SHOTS_ON_TARGET',
      values: stats.map((item, index) => display(sides[index],
        String(item?.shotsOnTarget ?? 0))) as [string, string],
      canCorrect: stats.map((item) => canManage
        && (item?.shotsOnTarget ?? 0) > (item?.goalShots ?? 0)) as [boolean, boolean] },
    { label: 'Chutes', type: 'SHOTS',
      values: stats.map((item, index) => display(sides[index],
        String(item?.shots ?? 0))) as [string, string],
      canCorrect: stats.map((item) => canManage && (item?.shots ?? 0) > (item?.shotsOnTarget ?? 0)) as [boolean, boolean] },
    { label: 'Escanteios', type: 'CORNERS',
      values: stats.map((item, index) => display(sides[index],
        String(item?.corners ?? 0))) as [string, string],
      canCorrect: stats.map((item) => canManage && (item?.corners ?? 0) > 0) as [boolean, boolean] },
    { label: 'Faltas', type: 'FOULS',
      values: stats.map((item, index) => display(sides[index],
        String(item?.fouls ?? 0))) as [string, string] },
    { label: 'Pênaltis cometidos', values: sides.map((number) => display(number,
      String(foulCount(number, 'PENALTY_COMMITTED')))) as [string, string] },
    { label: 'Pênaltis a favor', values: sides.map((number) => display(number,
      String(foulCount(number, 'PENALTY_WON')))) as [string, string] },
    { label: 'Pênaltis perdidos', values: sides.map((number) => display(number,
      String(foulCount(number, 'PENALTY_MISSED')))) as [string, string] },
    { label: 'Cartões amarelos', values: sides.map((number) => display(number,
      String(cardCount(number, 'YELLOW')))) as [string, string] },
    { label: 'Cartões vermelhos', values: sides.map((number) => display(number,
      String(cardCount(number, 'RED')))) as [string, string] },
    { label: 'Gols de pênalti', values: sides.map((number) => display(number,
      String(penaltyGoals(number)))) as [string, string] },
    { label: 'Gols contra a favor', values: sides.map((number) => display(number,
      String((state.goalEvents ?? []).filter((goal) => goal.sideNumber === number && goal.ownGoal).length)
    )) as [string, string] },
    { label: 'Disputa (gols/tent.)', values: sides.map((number) => display(number,
      penaltyResult(number))) as [string, string] },
  ];

  return (
    <YStack backgroundColor="$onzeSurface" borderColor="$onzeBorder" borderRadius="$6" borderWidth={1} overflow="hidden">
      <Text color="$onzeInk" fontSize={20} fontWeight="900" padding="$4">{title}</Text>
      <XStack alignItems="center" backgroundColor="$onzeSuccessBg" paddingHorizontal="$3" paddingVertical="$3">
        <Text color="$onzeGreen" flex={1} fontWeight="900" numberOfLines={2} textAlign="center">
          {liveScoreSideLabel(match, sides[0], score[0]?.name)}
        </Text>
        <Text color="$onzeMuted" fontSize={11} fontWeight="800" textAlign="center" width={110}>ESTATÍSTICA</Text>
        <Text color="$onzeGreen" flex={1} fontWeight="900" numberOfLines={2} textAlign="center">
          {sides[1] ? liveScoreSideLabel(match, sides[1], score[1]?.name) : '—'}
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
          <StatisticValue value={row.values[0]} sideNumber={sides[0]} label={row.label} type={row.type}
            canCorrect={row.canCorrect?.[0]} saving={saving} onCorrect={onCorrectStatistic} />
          <Text color="$onzeMuted" flex={1} fontSize={13} fontWeight="800" textAlign="center">
            {row.label}
          </Text>
          <StatisticValue value={row.values[1]} sideNumber={sides[1]} label={row.label} type={row.type}
            canCorrect={row.canCorrect?.[1]} saving={saving} onCorrect={onCorrectStatistic} />
        </XStack>
      ))}
      <Text color="$onzeMuted" fontSize={11} padding="$3" textAlign="center">
        Chutes no gol já estão incluídos no total de chutes. Dois amarelos contam como expulsão.
      </Text>
      {sides.filter((number) => number > 0).map((number) => {
        const players = playerShotTotals(state.shotEvents ?? [], state.goalEvents ?? [], number);
        if (players.length === 0) return null;
        const team = state.scores.find((side) => side.sideNumber === number);
        return (
          <YStack key={number} borderTopColor="$onzeBorder" borderTopWidth={1} gap="$2" padding="$3">
            <Text color="$onzeInk" fontWeight="900">
              Chutes por jogador · {liveScoreSideLabel(match, number, team?.name)}
            </Text>
            {players.map((player) => (
              <XStack key={player.assignmentId} justifyContent="space-between" gap="$2">
                <Text color="$onzeInk" flex={1} numberOfLines={1}>{player.name}</Text>
                <Text color="$onzeMuted">{player.onTarget} no gol / {player.shots} chutes</Text>
              </XStack>
            ))}
          </YStack>
        );
      })}
      {sides.filter((number) => number > 0).map((number) => {
        const teamFouls = fouls.filter((item) => item.offenderSideNumber === number);
        if (!teamFouls.length) return null;
        const counts = new Map<string, { name: string; fouls: number; penalties: number }>();
        teamFouls.forEach((item) => {
          const entry = counts.get(item.offenderAssignmentId)
            ?? { name: item.offenderDisplayName, fouls: 0, penalties: 0 };
          entry.fouls += 1;
          if (item.penalty) entry.penalties += 1;
          counts.set(item.offenderAssignmentId, entry);
        });
        return <YStack key={`fouls-${number}`} borderTopColor="$onzeBorder" borderTopWidth={1}
          gap="$2" padding="$3">
          <Text color="$onzeInk" fontWeight="900">Faltas por jogador · {score[sides.indexOf(number)]?.name}</Text>
          {[...counts.entries()].map(([id, item]) => <XStack key={id} gap="$2" justifyContent="space-between">
            <Text color="$onzeInk" flex={1} numberOfLines={1}>{item.name}</Text>
            <Text color="$onzeMuted">{item.fouls} faltas · {item.penalties} pênaltis</Text>
          </XStack>)}
        </YStack>;
      })}
    </YStack>
  );
}

export function LiveMatchDetails(props: Props) {
  const teams = props.state.scores;
  if (teams.length === 0) return null;
  return (
    <YStack gap="$4">
      {Array.from({ length: Math.ceil(teams.length / 2) }, (_, index) => (
        <TeamComparison
          key={teams[index * 2].sideNumber}
          {...props}
          teamNumbers={[teams[index * 2].sideNumber, teams[index * 2 + 1]?.sideNumber ?? null]}
          title={index === 0 ? 'Detalhes do jogo' : 'Mais times'}
        />
      ))}
    </YStack>
  );
}
