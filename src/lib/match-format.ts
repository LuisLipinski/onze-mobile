import type { MatchType } from './api';

export function minimumGoalkeepers(matchType: MatchType, teamCount: number | null) {
  return matchType === 'INTERNAL' ? Math.max(2, teamCount ?? 2) : 1;
}

export function requiredGoalkeepersAfterTeamCountChange(
  currentRequiredGoalkeepers: number,
  teamCount: number,
) {
  return Math.max(currentRequiredGoalkeepers, teamCount);
}

export function getMatchFormatValidationError(
  matchType: MatchType,
  teamCount: number | null,
  requiredGoalkeepers: number,
) {
  if (matchType === 'INTERNAL') {
    if (!Number.isInteger(teamCount) || (teamCount ?? 0) < 2) {
      return 'Partidas entre membros precisam ter pelo menos 2 times.';
    }
    if (!Number.isInteger(requiredGoalkeepers) || requiredGoalkeepers < (teamCount ?? 2)) {
      return `Informe pelo menos ${teamCount} goleiros para esta partida.`;
    }
    return null;
  }
  if (!Number.isInteger(requiredGoalkeepers) || requiredGoalkeepers < 1) {
    return 'Partidas contra outro time precisam de pelo menos 1 goleiro.';
  }
  return null;
}
