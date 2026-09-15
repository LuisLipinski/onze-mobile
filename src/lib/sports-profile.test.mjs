import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDominantFoot,
  formatPlayingRoles,
  formatTechnicalLevel,
  getSportsProfileValidationError,
  normalizedCanPlayGoalkeeper,
  PLAYER_POSITION_GROUPS,
  positionLabel,
  shouldOfferGoalkeeperAvailability,
} from './sports-profile.ts';

test('expõe as 17 posições organizadas por área', () => {
  const positions = PLAYER_POSITION_GROUPS.flatMap((group) => group.options.map((option) => option.value));
  assert.equal(positions.length, 17);
  assert.deepEqual(PLAYER_POSITION_GROUPS.map((group) => group.label), [
    'GOLEIRO',
    'DEFESA',
    'MEIO-CAMPO',
    'ATAQUE',
  ]);
  assert.equal(positionLabel('CENTER_FORWARD'), 'Centroavante');
});

test('exige principal, aceita secundária opcional e impede repetição', () => {
  assert.equal(
    getSportsProfileValidationError(null, null, false, 'RIGHT'),
    'Escolha sua posição principal.',
  );
  assert.equal(
    getSportsProfileValidationError('DEFENDER', null, true, 'RIGHT'),
    'Escolha sua segunda posição.',
  );
  assert.equal(
    getSportsProfileValidationError('DEFENDER', 'DEFENDER', true, 'RIGHT'),
    'A segunda posição deve ser diferente da principal.',
  );
  assert.equal(getSportsProfileValidationError('DEFENDER', null, false, null), 'Escolha seu pé dominante.');
  assert.equal(getSportsProfileValidationError('DEFENDER', 'PLAYMAKER', true, 'BOTH'), null);
});

test('não oferece disponibilidade no gol quando goleiro já é uma posição', () => {
  assert.equal(shouldOfferGoalkeeperAvailability('GOALKEEPER', null), false);
  assert.equal(shouldOfferGoalkeeperAvailability('DEFENDER', 'GOALKEEPER'), false);
  assert.equal(shouldOfferGoalkeeperAvailability('DEFENDER', 'PLAYMAKER'), true);
  assert.equal(normalizedCanPlayGoalkeeper('GOALKEEPER', null, true), false);
  assert.equal(normalizedCanPlayGoalkeeper('DEFENDER', 'GOALKEEPER', true), false);
  assert.equal(normalizedCanPlayGoalkeeper('DEFENDER', null, true), true);
});

test('formata o resumo esportivo sem confundir preferência com papel da partida', () => {
  assert.equal(
    formatPlayingRoles(['MIDFIELDER', 'CENTER_FORWARD'], true),
    'Meio-campo • Centroavante • Posso jogar no gol',
  );
  assert.equal(formatPlayingRoles([], false), 'Perfil esportivo não preenchido');
  assert.equal(formatDominantFoot('LEFT'), 'Esquerdo');
  assert.equal(formatTechnicalLevel(4), '4 — Avançado');
  assert.equal(formatTechnicalLevel(null), 'Ainda não avaliado');
});
