import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canRemoveGoalkeeperRole,
  missingGoalkeepersMessage,
  secondaryGoalkeeperCandidates,
  volunteerGoalkeeperCandidates,
} from './match-goalkeepers.ts';

function attendance(overrides = {}) {
  return {
    userId: crypto.randomUUID(),
    displayName: 'Jogador',
    status: 'GOING',
    primaryPosition: 'DEFENDER',
    secondaryPosition: null,
    canPlayGoalkeeper: false,
    isGoalkeeper: false,
    ...overrides,
  };
}

test('separa candidatos secundários de voluntários e exige GOING', () => {
  const secondary = attendance({ secondaryPosition: 'GOALKEEPER' });
  const volunteer = attendance({ canPlayGoalkeeper: true });
  const absent = attendance({ status: 'NOT_GOING', canPlayGoalkeeper: true });
  const alreadyGoalkeeper = attendance({ isGoalkeeper: true, canPlayGoalkeeper: true });
  const match = { attendances: [secondary, volunteer, absent, alreadyGoalkeeper] };

  assert.deepEqual(secondaryGoalkeeperCandidates(match), [secondary]);
  assert.deepEqual(volunteerGoalkeeperCandidates(match), [volunteer]);
});

test('goleiro principal não oferece remoção manual do papel', () => {
  assert.equal(canRemoveGoalkeeperRole(attendance({ isGoalkeeper: true, primaryPosition: 'GOALKEEPER' })), false);
  assert.equal(canRemoveGoalkeeperRole(attendance({ isGoalkeeper: true, secondaryPosition: 'GOALKEEPER' })), true);
});

test('mensagem de ausência respeita singular e plural', () => {
  assert.equal(missingGoalkeepersMessage(0), null);
  assert.equal(missingGoalkeepersMessage(1), 'Falta 1 goleiro para esta partida.');
  assert.equal(missingGoalkeepersMessage(3), 'Faltam 3 goleiros para esta partida.');
});
