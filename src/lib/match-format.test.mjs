import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMatchFormatValidationError,
  minimumGoalkeepers,
  requiredGoalkeepersAfterTeamCountChange,
} from './match-format.ts';

test('valida times e mínimo de goleiros em partidas internas', () => {
  assert.match(getMatchFormatValidationError('INTERNAL', 1, 1), /pelo menos 2 times/);
  assert.match(getMatchFormatValidationError('INTERNAL', 2, 1), /pelo menos 2 goleiros/);
  assert.match(getMatchFormatValidationError('INTERNAL', 3, 2), /pelo menos 3 goleiros/);
  assert.equal(getMatchFormatValidationError('INTERNAL', 2, 2), null);
  assert.equal(getMatchFormatValidationError('INTERNAL', 3, 3), null);
  assert.equal(getMatchFormatValidationError('INTERNAL', 4, 5), null);
});

test('partida externa dispensa times e exige ao menos um goleiro', () => {
  assert.match(getMatchFormatValidationError('VERSUS_EXTERNAL', null, 0), /pelo menos 1 goleiro/);
  assert.equal(getMatchFormatValidationError('VERSUS_EXTERNAL', null, 1), null);
});

test('elevar times nunca reduz uma quantidade maior escolhida pelo administrador', () => {
  assert.equal(minimumGoalkeepers('INTERNAL', 3), 3);
  assert.equal(minimumGoalkeepers('VERSUS_EXTERNAL', null), 1);
  assert.equal(requiredGoalkeepersAfterTeamCountChange(3, 2), 3);
  assert.equal(requiredGoalkeepersAfterTeamCountChange(3, 4), 4);
});
