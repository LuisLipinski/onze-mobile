import type {
  PlayerMatchResult,
  StatisticsRankings,
  StatisticsRankingEntry,
  StatisticsTeam,
} from './api';

export type StatisticsRankingMetric = keyof StatisticsRankings;

export const STATISTICS_RANKING_OPTIONS: readonly {
  key: StatisticsRankingMetric;
  label: string;
  valueLabel: string;
}[] = [
  { key: 'goals', label: 'Gols', valueLabel: 'gols' },
  { key: 'assists', label: 'Assistências', valueLabel: 'assist.' },
  { key: 'gamesPlayed', label: 'Jogos', valueLabel: 'jogos' },
  { key: 'wins', label: 'Vitórias', valueLabel: 'vitórias' },
  { key: 'foulsCommitted', label: 'Faltas feitas', valueLabel: 'faltas' },
  { key: 'foulsSuffered', label: 'Faltas sofridas', valueLabel: 'faltas' },
  { key: 'penaltiesCommitted', label: 'Pênaltis cometidos', valueLabel: 'pênaltis' },
  { key: 'penaltiesWon', label: 'Pênaltis sofridos', valueLabel: 'pênaltis' },
  { key: 'penaltiesTaken', label: 'Pênaltis cobrados', valueLabel: 'pênaltis' },
  { key: 'penaltiesScored', label: 'Pênaltis convertidos', valueLabel: 'gols' },
  { key: 'penaltiesMissed', label: 'Pênaltis perdidos', valueLabel: 'pênaltis' },
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
