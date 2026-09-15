import type { MatchModality, MatchType } from './api';

export const MATCH_MODALITY_OPTIONS: ReadonlyArray<{
  value: MatchModality;
  label: string;
  playersPerTeam: number;
}> = [
  { value: 'FIELD', label: 'Futebol de Campo', playersPerTeam: 11 },
  { value: 'FUT7', label: 'Fut7', playersPerTeam: 7 },
  { value: 'FUTSAL', label: 'Futsal', playersPerTeam: 5 },
];

export function playersPerTeam(modality: MatchModality) {
  return MATCH_MODALITY_OPTIONS.find((item) => item.value === modality)?.playersPerTeam ?? 7;
}

export function idealPlayers(
  modality: MatchModality,
  matchType: MatchType,
  teamCount: number | null,
) {
  const sides = matchType === 'INTERNAL' ? Math.max(2, teamCount ?? 2) : 1;
  return playersPerTeam(modality) * sides;
}

export function minimumPlayersValidationError(minimumPlayers: number, maxPlayers: number) {
  if (!Number.isInteger(minimumPlayers) || minimumPlayers <= 0) {
    return 'A quantidade mínima deve ser maior que zero.';
  }
  if (minimumPlayers > maxPlayers) {
    return 'A quantidade mínima não pode ultrapassar o limite de jogadores.';
  }
  return null;
}

export function modalityLabel(modality: MatchModality) {
  return MATCH_MODALITY_OPTIONS.find((item) => item.value === modality)?.label ?? modality;
}
