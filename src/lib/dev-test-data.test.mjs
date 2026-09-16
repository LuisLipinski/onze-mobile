import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEV_TEST_PLAYER_PRESETS,
  DEV_TEST_SCENARIOS,
} from './dev-test-data-catalog.ts';

test('offers the expected player presets for futsal, fut7 and field', () => {
  assert.deepEqual(
    DEV_TEST_PLAYER_PRESETS.map((preset) => preset.count),
    [10, 14, 22],
  );
});

test('exposes every deterministic test scenario once', () => {
  const values = DEV_TEST_SCENARIOS.map((scenario) => scenario.value);
  assert.equal(values.length, 6);
  assert.equal(new Set(values).size, values.length);
  assert.deepEqual(values, [
    'BALANCED',
    'ATTACK_VS_DEFENSE',
    'UNEVEN',
    'SPECIALISTS',
    'SECONDARY_POSITIONS',
    'GOALKEEPER_PRIORITY',
  ]);
});

test('keeps scenario labels and descriptions visible for testers', () => {
  for (const scenario of DEV_TEST_SCENARIOS) {
    assert.ok(scenario.label.trim().length > 0);
    assert.ok(scenario.description.trim().length > 0);
  }
});
