export function minimumPlayerTeamWarning(
  confirmedPlayers: number,
  minimumPlayers: number,
  idealPlayers: number,
) {
  if (confirmedPlayers < minimumPlayers) return 'BELOW_MINIMUM';
  if (confirmedPlayers < idealPlayers) return 'BELOW_IDEAL';
  return 'COMPLETE';
}
