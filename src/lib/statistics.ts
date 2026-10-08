import type {
  PlayerMatchResult,
  StatisticsRankings,
  StatisticsRankingEntry,
  StatisticsTeam,
} from './api';

export type StatisticsRankingMetric = 'goals' | 'assists' | 'gamesPlayed' | 'wins';

export const STATISTICS_RANKING_OPTIONS: readonly {
  key: StatisticsRankingMetric;
  label: string;
  valueLabel: string;
}[] = [
  { key: 'goals', label: 'Gols', valueLabel: 'gols' },
  { key: 'assists', label: 'Assistências', valueLabel: 'assist.' },
  { key: 'gamesPlayed', label: 'Jogos', valueLabel: 'jogos' },
  { key: 'wins', label: 'Vitórias', valueLabel: 'vitórias' },
];

export function rankingForMetric(
  rankings: StatisticsRankings,
  metric: StatisticsRankingMetric,
): StatisticsRankingEntry[] {
  return rankings[metric];
}

export function rankingValueLabel(metric: StatisticsRankingMetric) {
  return STATISTICS_RANKING_OPTIONS.find((option) => option.key === metric)?.valueLabel ?? '';
}

export function playerMatchResultLabel(result: PlayerMatchResult) {
  switch (result) {
    case 'WIN': return 'Vitória';
    case 'DRAW': return 'Empate';
    case 'LOSS': return 'Derrota';
  }
}

export function scoreSummary(teams: StatisticsTeam[]) {
  return teams.map((team) => team.score).join(' × ');
}
