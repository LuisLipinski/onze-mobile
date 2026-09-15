import assert from 'node:assert/strict';
import test from 'node:test';

import {
  halfStarsLabel,
  nextHalfStar,
  PLAYER_SKILLS,
} from './technical-ratings.ts';

test('lists exactly the 17 supported skills', () => {
  assert.equal(PLAYER_SKILLS.length, 17);
  assert.equal(new Set(PLAYER_SKILLS.map((skill) => skill.value)).size, 17);
});

test('formats and adjusts ratings in accessible half-star steps', () => {
  assert.equal(halfStarsLabel(undefined), 'Não avaliado');
  assert.match(halfStarsLabel(9), /4,5 ★/);
  assert.equal(nextHalfStar(undefined, 1), 1);
  assert.equal(nextHalfStar(1, -1), 1);
  assert.equal(nextHalfStar(10, 1), 10);
});
