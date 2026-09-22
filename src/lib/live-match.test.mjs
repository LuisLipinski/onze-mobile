import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatMatchTimer,
  liveMatchElapsedSeconds,
  liveScoreSideLabel,
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
