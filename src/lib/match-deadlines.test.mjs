import assert from 'node:assert/strict';
import test from 'node:test';

import { paymentDeadlineState, signupDeadlineState } from './match-deadlines.ts';

const futureWeeklyMatch = {
  status: 'SCHEDULED',
  attendanceOpen: false,
  attendanceOpensAt: '2026-10-01T12:00:00Z',
  signupDeadline: '2026-10-06T15:00:00Z',
  signupOpen: false,
  paymentDeadline: '2026-10-06T21:00:00Z',
  paymentOpen: false,
};

test('encerrar uma rodada não marca como encerrados os prazos da rodada semanal seguinte', () => {
  const afterPreviousMatch = Date.parse('2026-09-29T00:24:00Z');
  assert.equal(signupDeadlineState(futureWeeklyMatch, afterPreviousMatch), 'pending');
  assert.equal(paymentDeadlineState(futureWeeklyMatch, afterPreviousMatch), 'pending');
});

test('mostra aberta a lista liberada e encerrado apenas o prazo vencido', () => {
  const openedMatch = { ...futureWeeklyMatch, attendanceOpen: true, signupOpen: true, paymentOpen: true };
  assert.equal(signupDeadlineState(openedMatch, Date.parse('2026-10-02T12:00:00Z')), 'open');
  assert.equal(paymentDeadlineState(openedMatch, Date.parse('2026-10-02T12:00:00Z')), 'open');

  const afterDeadlines = Date.parse('2026-10-06T21:01:00Z');
  assert.equal(signupDeadlineState(futureWeeklyMatch, afterDeadlines), 'closed');
  assert.equal(paymentDeadlineState(futureWeeklyMatch, afterDeadlines), 'closed');
  assert.equal(signupDeadlineState(
    { ...futureWeeklyMatch, status: 'FINISHED' },
    Date.parse('2026-09-29T00:24:00Z'),
  ), 'closed');
});
