import assert from 'node:assert/strict';
import test from 'node:test';

import { minimumPlayerTeamWarning } from './minimum-player-team-warning.ts';

test('warns specifically when an approved match is still below minimum', () => {
  assert.equal(minimumPlayerTeamWarning(10, 14, 14), 'BELOW_MINIMUM');
});

test('distinguishes below ideal from below minimum', () => {
  assert.equal(minimumPlayerTeamWarning(12, 10, 14), 'BELOW_IDEAL');
  assert.equal(minimumPlayerTeamWarning(14, 10, 14), 'COMPLETE');
});
