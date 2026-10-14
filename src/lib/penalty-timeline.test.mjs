import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLiveTimelineEvents, penaltyAwardDescription, penaltyMissDescription } from './penalty-timeline.ts';

const award = {
  id: 'foul-1', offenderSideNumber: 2, offenderAssignmentId: 'defender',
  offenderDisplayName: 'Defensor', victimSideNumber: 1, victimAssignmentId: 'attacker',
  victimDisplayName: 'Atacante', penalty: true, takerAssignmentId: null,
  takerDisplayName: null, scored: null, goalEventId: null, elapsedSeconds: 38,
  periodType: 'REGULATION', periodNumber: 1, periodElapsedSeconds: 38,
  createdAt: '2026-10-14T20:00:38Z', resolvedAt: null,
  resolutionElapsedSeconds: null, resolutionPeriodType: null,
  resolutionPeriodNumber: null, resolutionPeriodElapsedSeconds: null,
};

test('o botão do time que sofreu o pênalti produz a marcação antes da cobrança', () => {
  const events = buildLiveTimelineEvents([], [], [award]);
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'FOUL');
  assert.equal(events[0].sideNumber, 1);
  assert.equal(penaltyAwardDescription(award), 'Defensor fez pênalti no jogador Atacante');
});

test('falta comum fica fora da timeline e pênalti perdido vira outra entrada no horário da cobrança', () => {
  const missed = { ...award, scored: false, takerAssignmentId: 'attacker',
    takerDisplayName: 'Atacante', resolvedAt: '2026-10-14T20:01:04Z',
    resolutionElapsedSeconds: 64, resolutionPeriodType: 'REGULATION',
    resolutionPeriodNumber: 1, resolutionPeriodElapsedSeconds: 64 };
  const regular = { ...award, id: 'foul-2', penalty: false, scored: null, goalEventId: null };
  const events = buildLiveTimelineEvents([], [], [regular, missed]);
  assert.deepEqual(events.map((item) => item.kind), ['PENALTY_MISS', 'FOUL']);
  assert.equal(events[0].elapsedSeconds, 64);
  assert.equal(events[0].createdAt, missed.resolvedAt);
  assert.equal(events[1].elapsedSeconds, 38);
  assert.equal(penaltyMissDescription(missed), 'Atacante perdeu o pênalti');
});

test('pênalti convertido mantém o gol em uma entrada separada da marcação', () => {
  const scored = { ...award, scored: true, goalEventId: 'goal-1',
    takerAssignmentId: 'attacker', takerDisplayName: 'Atacante',
    resolvedAt: '2026-10-14T20:01:04Z', resolutionElapsedSeconds: 64 };
  const goal = { id: 'goal-1', sideNumber: 1, penalty: true,
    elapsedSeconds: 64, createdAt: '2026-10-14T20:01:04Z' };
  const events = buildLiveTimelineEvents([goal], [], [scored]);
  assert.deepEqual(events.map((item) => item.kind), ['GOAL', 'FOUL']);
});
