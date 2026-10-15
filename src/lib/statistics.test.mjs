import assert from 'node:assert/strict';
import test from 'node:test';

import {
  playerMatchResultLabel,
  rankingForMetric,
  rankingValueLabel,
  rankingTieBreakLabel,
  rankingSecondaryLabel,
  statisticsSeasonLabel,
  STATISTICS_RANKING_OPTIONS,
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

test('oferece artilharia e derrotas e explica todos os desempates', () => {
  assert.equal(STATISTICS_RANKING_OPTIONS.find((option) => option.key === 'goals').label, 'Artilharia');
  assert.equal(STATISTICS_RANKING_OPTIONS.find((option) => option.key === 'losses').label, 'Derrotas');
  assert.match(rankingTieBreakLabel('goals'), /assistências.*jogos/);
  assert.match(rankingTieBreakLabel('assists'), /gols.*jogos/);
  assert.match(rankingTieBreakLabel('gamesPlayed'), /vitórias/);
  assert.match(rankingTieBreakLabel('wins'), /jogos/);
  assert.equal(rankingValueLabel('losses'), 'derrotas');
  assert.equal(rankingSecondaryLabel({ assists: 9, goals: 10, gamesPlayed: 6 }, 'goals'), '9 assistências · 6 jogos');
});

test('distingue o geral permanente da temporada atual e das anteriores', () => {
  assert.equal(statisticsSeasonLabel(null), 'Geral · acumulado');
  assert.equal(statisticsSeasonLabel({ number: 2, endedAt: null }), 'Temporada 2 · atual');
  assert.equal(statisticsSeasonLabel({ number: 1, endedAt: '2026-10-15T14:00:00Z' }), 'Temporada 1 · encerrada');
});
