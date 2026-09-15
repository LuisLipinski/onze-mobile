import type { FootballMatch, MatchAttendance } from './api';

function isAvailable(attendance: MatchAttendance) {
  return attendance.status === 'GOING' && !attendance.isGoalkeeper;
}

export function secondaryGoalkeeperCandidates(
  match: Pick<FootballMatch, 'attendances'>,
) {
  return match.attendances.filter((attendance) => (
    isAvailable(attendance) && attendance.secondaryPosition === 'GOALKEEPER'
  ));
}

export function volunteerGoalkeeperCandidates(
  match: Pick<FootballMatch, 'attendances'>,
) {
  return match.attendances.filter((attendance) => (
    isAvailable(attendance) && attendance.canPlayGoalkeeper
  ));
}

export function canRemoveGoalkeeperRole(attendance: MatchAttendance) {
  return attendance.isGoalkeeper && attendance.primaryPosition !== 'GOALKEEPER';
}

export function missingGoalkeepersMessage(missingGoalkeepers: number) {
  if (missingGoalkeepers <= 0) return null;
  return missingGoalkeepers === 1
    ? 'Falta 1 goleiro para esta partida.'
    : `Faltam ${missingGoalkeepers} goleiros para esta partida.`;
}
