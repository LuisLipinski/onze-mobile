import assert from 'node:assert/strict';
import test from 'node:test';

import { playerShotTotals } from './player-shots.ts';

test('atribui chutes manuais e gols comuns, sem contar gol contra', () => {
  const shots = [
    { sideNumber: 1, playerAssignmentId: 'a', playerDisplayName: 'Ana', onTarget: false },
    { sideNumber: 1, playerAssignmentId: 'a', playerDisplayName: 'Ana', onTarget: true },
    { sideNumber: 2, playerAssignmentId: 'b', playerDisplayName: 'Bia', onTarget: true },
  ];
  const goals = [
    { sideNumber: 1, scorerAssignmentId: 'a', scorerDisplayName: 'Ana', shotRecorded: true, ownGoal: false },
    { sideNumber: 1, scorerAssignmentId: 'b', scorerDisplayName: 'Bia', shotRecorded: false, ownGoal: true },
    { sideNumber: 1, scorerAssignmentId: 'a', scorerDisplayName: 'Ana', shotRecorded: false, ownGoal: false },
  ];
  assert.deepEqual(playerShotTotals(shots, goals, 1), [
    { assignmentId: 'a', name: 'Ana', shots: 3, onTarget: 2 },
  ]);
});
