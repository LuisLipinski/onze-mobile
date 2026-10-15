import assert from 'node:assert/strict';
import test from 'node:test';
import { matchShareMessage } from './match-share.ts';

test('convite inclui grupo, local, link HTTPS e a data no fuso da partida', () => {
  const message = matchShareMessage({
    groupName: 'Pelada de quinta', startsAt: '2026-10-16T01:30:00Z',
    timeZone: 'America/Sao_Paulo', venue: 'Arena Onze',
    pixKey: 'segredo', paymentAmount: 35,
  }, 'https://example.com/m/jogo');
  assert.match(message, /Pelada de quinta/);
  assert.match(message, /quinta-feira.*15\/10\/2026.*22:30/);
  assert.match(message, /Arena Onze/);
  assert.match(message, /https:\/\/example.com\/m\/jogo$/);
  assert.doesNotMatch(message, /segredo|35/);
});
