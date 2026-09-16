import assert from 'node:assert/strict';
import test from 'node:test';

import {
  idealPlayers,
  maximumPlayersValidationError,
  minimumPlayersValidationError,
} from './match-modality.ts';

test('calculates ideal players by modality and internal team count', () => {
  assert.equal(idealPlayers('FIELD', 'INTERNAL', 2), 22);
  assert.equal(idealPlayers('FUT7', 'INTERNAL', 3), 21);
  assert.equal(idealPlayers('FUTSAL', 'INTERNAL', 2), 10);
  assert.equal(idealPlayers('FUT7', 'VERSUS_EXTERNAL', null), 7);
});

test('allows a custom maximum without a global upper limit', () => {
  assert.match(maximumPlayersValidationError(1) ?? '', /pelo menos 2/);
  assert.equal(maximumPlayersValidationError(2), null);
  assert.equal(maximumPlayersValidationError(1000), null);
});

test('validates the minimum against the configured maximum', () => {
  assert.match(minimumPlayersValidationError(0, 14) ?? '', /maior que zero/);
  assert.match(minimumPlayersValidationError(15, 14) ?? '', /não pode ultrapassar/);
  assert.equal(minimumPlayersValidationError(10, 14), null);
  assert.equal(minimumPlayersValidationError(22, 1000), null);
});
