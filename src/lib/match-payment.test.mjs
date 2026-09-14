import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasPendingCurrentPlayerPayment,
  isCurrentPlayerPaymentExempt,
  shouldShowCurrentPlayerPayment,
} from './match-payment.ts';

function matchWithCurrentAttendance(overrides = {}) {
  return {
    paymentRequired: true,
    myAttendance: 'GOING',
    myPaymentStatus: 'PENDING',
    attendances: [{
      currentUser: true,
      paymentExempt: false,
      ...overrides,
    }],
  };
}

test('mantém cobrança e lembrete para goleiro pagante', () => {
  const match = matchWithCurrentAttendance({ isGoalkeeper: true });

  assert.equal(isCurrentPlayerPaymentExempt(match), false);
  assert.equal(shouldShowCurrentPlayerPayment(match), true);
  assert.equal(hasPendingCurrentPlayerPayment(match), true);
});

test('oculta cobrança e bloqueia lembrete local para goleiro isento', () => {
  const match = matchWithCurrentAttendance({
    isGoalkeeper: true,
    paymentExempt: true,
  });

  assert.equal(isCurrentPlayerPaymentExempt(match), true);
  assert.equal(shouldShowCurrentPlayerPayment(match), false);
  assert.equal(hasPendingCurrentPlayerPayment(match), false);
});

test('não trata preferência esportiva como papel da partida', () => {
  const match = matchWithCurrentAttendance({
    canPlayGoalkeeper: true,
    isGoalkeeper: false,
    paymentExempt: false,
  });

  assert.equal(isCurrentPlayerPaymentExempt(match), false);
  assert.equal(hasPendingCurrentPlayerPayment(match), true);
});
