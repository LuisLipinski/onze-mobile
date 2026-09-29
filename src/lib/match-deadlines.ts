import type { FootballMatch } from './api';

type MatchDeadline = Pick<FootballMatch,
  'status' | 'attendanceOpen' | 'signupOpen' | 'signupDeadline'
  | 'paymentOpen' | 'paymentDeadline'>;

export type DeadlineState = 'pending' | 'open' | 'closed';

function stateForDeadline(
  match: MatchDeadline,
  isOpen: boolean,
  deadline: string | null,
  nowMs: number,
): DeadlineState {
  if (isOpen) return 'open';
  if (match.status === 'SCHEDULED'
      && !match.attendanceOpen
      && deadline != null
      && new Date(deadline).getTime() >= nowMs) {
    return 'pending';
  }
  return 'closed';
}

export function signupDeadlineState(match: MatchDeadline, nowMs = Date.now()): DeadlineState {
  return stateForDeadline(match, match.signupOpen, match.signupDeadline, nowMs);
}

export function paymentDeadlineState(match: MatchDeadline, nowMs = Date.now()): DeadlineState {
  return stateForDeadline(match, match.paymentOpen, match.paymentDeadline, nowMs);
}
