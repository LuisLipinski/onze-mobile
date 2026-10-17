import assert from 'node:assert/strict';
import test from 'node:test';
import { orderedWaitlist, attendanceGoingLabel } from './match-waitlist.ts';

test('ordena a fila pela posição persistida sem misturar confirmados ou alterar a lista original', () => {
  const attendances = [
    { userId: 'segundo', status: 'WAITLISTED', waitlistPosition: 2 },
    { userId: 'confirmado', status: 'GOING', waitlistPosition: null },
    { userId: 'primeiro', status: 'WAITLISTED', waitlistPosition: 1 },
    { userId: 'saiu', status: 'NOT_GOING', waitlistPosition: null },
  ];
  assert.deepEqual(orderedWaitlist({ attendances }).map((p) => p.userId), ['primeiro', 'segundo']);
  assert.equal(attendances[0].userId, 'segundo');
});

test('explica se a confirmação reserva uma vaga ou entra na fila conforme a capacidade informada pela API', () => {
  assert.equal(attendanceGoingLabel({ myAttendance: null, willJoinWaitlist: true }), 'Entrar na lista de espera');
  assert.equal(attendanceGoingLabel({ myAttendance: 'NOT_GOING', willJoinWaitlist: false }), '✓ Vou jogar');
  assert.equal(attendanceGoingLabel({ myAttendance: 'WAITLISTED', willJoinWaitlist: true }), 'Na lista de espera');
  assert.equal(attendanceGoingLabel({ myAttendance: 'GOING', willJoinWaitlist: true }), '✓ Vou jogar');
});
