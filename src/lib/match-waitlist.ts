import type { FootballMatch, MatchAttendance } from './api';

export function orderedWaitlist(match: Pick<FootballMatch, 'attendances'>): MatchAttendance[] {
  return match.attendances.filter((player) => player.status === 'WAITLISTED')
    .sort((a, b) => (a.waitlistPosition ?? Number.MAX_SAFE_INTEGER) - (b.waitlistPosition ?? Number.MAX_SAFE_INTEGER));
}

export function attendanceGoingLabel(
  match: Pick<FootballMatch, 'myAttendance' | 'willJoinWaitlist'>,
): string {
  if (match.myAttendance === 'WAITLISTED') return 'Na lista de espera';
  if (match.myAttendance === 'GOING') return '✓ Vou jogar';
  return match.willJoinWaitlist ? 'Entrar na lista de espera' : '✓ Vou jogar';
}

