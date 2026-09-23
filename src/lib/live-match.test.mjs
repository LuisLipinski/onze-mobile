import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatMatchTimer,
  applyLiveMatchSummaryEvent,
  liveMatchElapsedSeconds,
  liveScoreSideLabel,
  liveSummaryScoreLabel,
  mergeLiveMatchStreamEvent,
  scheduledHomeMatches,
  secondYellowCardEventIds,
  sentOffPlayerAssignmentIds,
} from './live-match.ts';

test('formata o cronômetro abaixo e acima de uma hora', () => {
  assert.equal(formatMatchTimer(65), '01:05');
  assert.equal(formatMatchTimer(3661), '01:01:01');
  assert.equal(formatMatchTimer(-1), '00:00');
});

test('calcula tempo ao vivo e congela no encerramento', () => {
  const running = { startedAt: '2026-09-19T18:00:00Z', finishedAt: null };
  assert.equal(liveMatchElapsedSeconds(running, Date.parse('2026-09-19T18:02:03Z')), 123);

  const finished = { ...running, finishedAt: '2026-09-19T18:10:00Z' };
  assert.equal(liveMatchElapsedSeconds(finished, Date.parse('2026-09-20T18:00:00Z')), 600);
  assert.equal(liveMatchElapsedSeconds(running, Date.parse('2026-09-20T00:00:00Z')), 10_800);
});

test('separa jogos ao vivo dos próximos jogos na home', () => {
  const matches = [
    { id: 'scheduled', status: 'SCHEDULED' },
    { id: 'started-stale', status: 'SCHEDULED' },
    { id: 'finished', status: 'FINISHED' },
  ];
  const live = [{ matchId: 'started-stale' }];

  assert.deepEqual(scheduledHomeMatches(matches, live), [matches[0]]);
});

test('inclui, atualiza e remove partidas da home pelos eventos em tempo real', () => {
  const first = {
    matchId: 'match-1', status: 'IN_PROGRESS', startedAt: '2026-09-19T18:00:00Z', scores: [],
  };
  const second = {
    matchId: 'match-2', status: 'IN_PROGRESS', startedAt: '2026-09-19T19:00:00Z', scores: [],
  };
  const added = applyLiveMatchSummaryEvent([second], {
    matchId: 'match-1', summary: first,
  });
  assert.deepEqual(added, [first, second]);

  const removed = applyLiveMatchSummaryEvent(added, {
    matchId: 'match-1', summary: { ...first, status: 'FINISHED' },
  });
  assert.deepEqual(removed, [second]);
});

test('aplica snapshot mais novo sem copiar a permissão administrativa', () => {
  const current = {
    matchId: 'match-1', version: 2, canManage: false, scores: [],
  };
  const updated = mergeLiveMatchStreamEvent(current, {
    matchId: 'match-1',
    liveMatch: { matchId: 'match-1', version: 3, scores: [{ sideNumber: 1, score: 1 }] },
  });
  assert.equal(updated.version, 3);
  assert.equal(updated.canManage, false);
  assert.deepEqual(updated.scores, [{ sideNumber: 1, score: 1 }]);
});

test('aplica a imagem de cada time recebida em tempo real', () => {
  const current = {
    matchId: 'match-1', version: 3, canManage: true,
    scores: [{ sideNumber: 1, score: 0, imageUrl: null }],
  };
  const updated = mergeLiveMatchStreamEvent(current, {
    matchId: 'match-1',
    liveMatch: {
      matchId: 'match-1', version: 4,
      scores: [{ sideNumber: 1, score: 0, imageUrl: 'https://cdn.example/time-1.jpg' }],
    },
  });

  assert.equal(updated.scores[0].imageUrl, 'https://cdn.example/time-1.jpg');
  assert.equal(updated.canManage, true);
});

test('formata o placar resumido de dois ou vários times', () => {
  assert.equal(liveSummaryScoreLabel({ scores: [
    { sideNumber: 1, score: 3 },
    { sideNumber: 2, score: 2 },
  ] }), '3 × 2');
  assert.equal(liveSummaryScoreLabel({ scores: [
    { sideNumber: 1, score: 1 },
    { sideNumber: 2, score: 0 },
    { sideNumber: 3, score: 2 },
  ] }), 'T1 1  •  T2 0  •  T3 2');
});

test('nomeia times internos e adversário externo', () => {
  assert.equal(liveScoreSideLabel({ matchType: 'INTERNAL' }, 2), 'Time 2');
  assert.equal(liveScoreSideLabel({ matchType: 'VERSUS_EXTERNAL', groupName: 'Onze FC' }, 1), 'Onze FC');
  assert.equal(liveScoreSideLabel({ matchType: 'VERSUS_EXTERNAL', groupName: 'Onze FC' }, 2), 'Adversário');
});

test('calcula expulsões por vermelho direto ou dois amarelos', () => {
  const cards = [
    { id: 'yellow-2', playerAssignmentId: 'player-yellow', cardType: 'YELLOW', elapsedSeconds: 20, createdAt: '2026-09-19T18:00:20Z' },
    { id: 'red-1', playerAssignmentId: 'player-red', cardType: 'RED', elapsedSeconds: 15, createdAt: '2026-09-19T18:00:15Z' },
    { id: 'yellow-1', playerAssignmentId: 'player-yellow', cardType: 'YELLOW', elapsedSeconds: 10, createdAt: '2026-09-19T18:00:10Z' },
    { id: 'single-yellow', playerAssignmentId: 'player-active', cardType: 'YELLOW', elapsedSeconds: 5, createdAt: '2026-09-19T18:00:05Z' },
  ];

  assert.deepEqual([...sentOffPlayerAssignmentIds(cards)].sort(), ['player-red', 'player-yellow']);
  assert.deepEqual([...secondYellowCardEventIds(cards)], ['yellow-2']);
});
