import type { FootballMatch, MatchAttendance } from './api';

type AttendanceMatch = Pick<FootballMatch,
  'status' | 'attendanceOpen' | 'signupOpen' | 'myAttendance' | 'canJoin' | 'canWithdraw'>;

export function attendanceActions(match: AttendanceMatch, busy = false) {
  const open = match.status === 'SCHEDULED' && match.attendanceOpen && !busy;
  return {
    going: open && match.myAttendance !== 'GOING' && match.myAttendance !== 'WAITLISTED' && match.canJoin,
    notGoing: open && match.myAttendance !== 'NOT_GOING'
      && (match.myAttendance === 'GOING' || match.myAttendance === 'WAITLISTED'
        ? match.canWithdraw : match.signupOpen),
  };
}

export function adminPaymentAction(
  matchStatus: FootballMatch['status'],
  attendance: Pick<MatchAttendance, 'status' | 'paymentStatus' | 'paymentExempt'>,
): 'REMIND' | 'CONFIRM' | null {
  if (matchStatus !== 'SCHEDULED' || attendance.status !== 'GOING' || attendance.paymentExempt) {
    return null;
  }
  if (attendance.paymentStatus === 'PENDING') return 'REMIND';
  if (attendance.paymentStatus === 'REPORTED') return 'CONFIRM';
  return null;
}
