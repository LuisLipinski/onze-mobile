import assert from 'node:assert/strict';
import test from 'node:test';
import { attendanceActions, adminPaymentAction } from './match-actions.ts';

const match = {
  status: 'SCHEDULED', attendanceOpen: true, signupOpen: true,
  myAttendance: 'PENDING', canJoin: true, canWithdraw: false,
};

test('uma resposta de presença já selecionada fica indisponível para repetição', () => {
  assert.deepEqual(attendanceActions({ ...match, myAttendance: 'GOING', canWithdraw: true }),
    { going: false, notGoing: true });
  assert.deepEqual(attendanceActions({ ...match, myAttendance: 'NOT_GOING' }),
    { going: true, notGoing: false });
});

test('bloqueia ambas as respostas antes da abertura, durante envio e após encerramento', () => {
  for (const closed of [
    { ...match, attendanceOpen: false },
    { ...match, signupOpen: false, canJoin: false },
    { ...match, status: 'CANCELLED' },
    { ...match, status: 'IN_PROGRESS' },
    { ...match, status: 'FINISHED' },
  ]) assert.deepEqual(attendanceActions(closed), { going: false, notGoing: false });
  assert.deepEqual(attendanceActions(match, true), { going: false, notGoing: false });
});

test('mantém a desistência autorizada de quem já vai após o prazo de inscrição', () => {
  assert.deepEqual(attendanceActions({
    ...match, signupOpen: false, canJoin: false, myAttendance: 'GOING', canWithdraw: true,
  }), { going: false, notGoing: true });
  assert.equal(attendanceActions({ ...match, canJoin: false }).going, false);
});

test('pagamento pendente permite cobrança e só o informado permite confirmar recebimento', () => {
  const player = { status: 'GOING', paymentStatus: 'PENDING', paymentExempt: false };
  assert.equal(adminPaymentAction('SCHEDULED', player), 'REMIND');
  assert.equal(adminPaymentAction('SCHEDULED', { ...player, paymentStatus: 'REPORTED' }), 'CONFIRM');
  for (const paymentStatus of ['PAID', 'CANCELLED', null]) {
    assert.equal(adminPaymentAction('SCHEDULED', { ...player, paymentStatus }), null);
  }
  assert.equal(adminPaymentAction('SCHEDULED', { ...player, paymentExempt: true }), null);
  assert.equal(adminPaymentAction('SCHEDULED', { ...player, status: 'NOT_GOING' }), null);
  assert.equal(adminPaymentAction('CANCELLED', player), null);
});

test('a fila bloqueia repetir a entrada e permite sair mesmo depois do prazo', () => {
  for (const signupOpen of [true, false]) {
    assert.deepEqual(attendanceActions({ ...match, signupOpen, myAttendance: 'WAITLISTED', canJoin: false, canWithdraw: true }),
      { going: false, notGoing: true });
  }
  assert.deepEqual(attendanceActions({ ...match, myAttendance: 'WAITLISTED', canJoin: true, canWithdraw: false, signupOpen: false }),
    { going: false, notGoing: false });
  assert.equal(adminPaymentAction('SCHEDULED', { status: 'WAITLISTED', paymentStatus: null, paymentExempt: false }), null);
});
