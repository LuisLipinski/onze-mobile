import type { FootballMatch, MatchAttendance } from './api';

export function currentMatchAttendance(
  match: Pick<FootballMatch, 'attendances'>,
): MatchAttendance | null {
  return match.attendances.find((attendance) => attendance.currentUser) ?? null;
}

export function isCurrentPlayerPaymentExempt(
  match: Pick<FootballMatch, 'attendances'>,
) {
  return currentMatchAttendance(match)?.paymentExempt === true;
}

export function hasPendingCurrentPlayerPayment(
  match: Pick<FootballMatch, 'attendances' | 'myAttendance' | 'myPaymentStatus'>,
) {
  return match.myAttendance === 'GOING'
    && match.myPaymentStatus === 'PENDING'
    && !isCurrentPlayerPaymentExempt(match);
}

export function shouldShowCurrentPlayerPayment(
  match: Pick<FootballMatch, 'attendances' | 'paymentRequired' | 'myPaymentStatus'>,
) {
  return match.paymentRequired
    && match.myPaymentStatus != null
    && !isCurrentPlayerPaymentExempt(match);
}
