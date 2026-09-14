import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDominantFoot,
  formatPlayingRoles,
  formatTechnicalLevel,
  getSportsProfileValidationError,
  togglePlayerPosition,
} from './sports-profile.ts';

test('permite selecionar várias posições e remover uma delas', () => {
  const withDefender = togglePlayerPosition([], 'DEFENDER');
  const withTwoPositions = togglePlayerPosition(withDefender, 'WINGER');

  assert.deepEqual(withTwoPositions, ['DEFENDER', 'WINGER']);
  assert.deepEqual(togglePlayerPosition(withTwoPositions, 'DEFENDER'), ['WINGER']);
});

test('aceita goleiro sem posição de linha e exige pé dominante', () => {
  assert.equal(getSportsProfileValidationError([], false, 'RIGHT'),
    'Escolha ao menos uma posição de linha ou marque que joga como goleiro.');
  assert.equal(getSportsProfileValidationError([], true, null), 'Escolha seu pé dominante.');
  assert.equal(getSportsProfileValidationError([], true, 'BOTH'), null);
});

test('formata o resumo esportivo e a escala técnica', () => {
  assert.equal(formatPlayingRoles(['MIDFIELDER', 'STRIKER'], true), 'Meio-campo • Atacante • Goleiro');
  assert.equal(formatPlayingRoles([], false), 'Perfil esportivo não preenchido');
  assert.equal(formatDominantFoot('LEFT'), 'Esquerdo');
  assert.equal(formatTechnicalLevel(4), '4 — Avançado');
  assert.equal(formatTechnicalLevel(null), 'Ainda não avaliado');
});
