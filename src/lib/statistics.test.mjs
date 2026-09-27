import assert from 'node:assert/strict';
import test from 'node:test';

import {
  playerMatchResultLabel,
  rankingForMetric,
  rankingValueLabel,
  scoreSummary,
} from './statistics.ts';

const rankings = {
  goals: [{ rank: 1, userId: '1', displayName: 'Ana', currentUser: true, value: 3 }],
  assists: [{ rank: 1, userId: '2', displayName: 'Bia', currentUser: false, value: 2 }],
  gamesPlayed: [{ rank: 1, userId: '3', displayName: 'Caio', currentUser: false, value: 5 }],
  wins: [{ rank: 1, userId: '1', displayName: 'Ana', currentUser: true, value: 4 }],
};

test('seleciona o ranking e o rótulo da métrica solicitada', () => {
  assert.deepEqual(rankingForMetric(rankings, 'goals'), rankings.goals);
  assert.deepEqual(rankingForMetric(rankings, 'assists'), rankings.assists);
  assert.equal(rankingValueLabel('gamesPlayed'), 'jogos');
  assert.equal(rankingValueLabel('wins'), 'vitórias');
});

test('traduz resultados e resume placares com qualquer quantidade de times', () => {
  assert.equal(playerMatchResultLabel('WIN'), 'Vitória');
  assert.equal(playerMatchResultLabel('DRAW'), 'Empate');
  assert.equal(playerMatchResultLabel('LOSS'), 'Derrota');
  assert.equal(scoreSummary([
    { teamNumber: 1, name: 'Verde', imageUrl: null, score: 3 },
    { teamNumber: 2, name: 'Branco', imageUrl: null, score: 2 },
    { teamNumber: 3, name: 'Preto', imageUrl: null, score: 1 },
  ]), '3 × 2 × 1');
});
