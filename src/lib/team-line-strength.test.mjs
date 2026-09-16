import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateTeamLineStrengths,
  teamStrengthLineForRole,
} from './team-line-strength.ts';

test('maps field, fut7 and futsal roles to the expected team lines', () => {
  assert.equal(teamStrengthLineForRole('CENTER_DEFENDER'), 'DEFENSE');
  assert.equal(teamStrengthLineForRole('LEFT_BACK'), 'DEFENSE');
  assert.equal(teamStrengthLineForRole('FIXO'), 'DEFENSE');

  assert.equal(teamStrengthLineForRole('DEFENSIVE_MIDFIELDER'), 'MIDFIELD');
  assert.equal(teamStrengthLineForRole('PLAYMAKER'), 'MIDFIELD');
  assert.equal(teamStrengthLineForRole('RIGHT_WINGER_FUTSAL'), 'MIDFIELD');

  assert.equal(teamStrengthLineForRole('CENTER_FORWARD'), 'ATTACK');
  assert.equal(teamStrengthLineForRole('LEFT_WINGER'), 'ATTACK');
  assert.equal(teamStrengthLineForRole('PIVOT'), 'ATTACK');

  assert.equal(teamStrengthLineForRole('GOALKEEPER'), 'OTHER');
});

test('calculates rounded defense, midfield and attack strengths without goalkeeper', () => {
  const result = calculateTeamLineStrengths([
    { assignedRole: 'CENTER_DEFENDER', overallUsed: 30 },
    { assignedRole: 'LEFT_BACK', overallUsed: 26 },
    { assignedRole: 'CENTRAL_MIDFIELDER', overallUsed: 27 },
    { assignedRole: 'PLAYMAKER', overallUsed: 28 },
    { assignedRole: 'CENTER_FORWARD', overallUsed: 31 },
    { assignedRole: 'GOALKEEPER', overallUsed: 40 },
  ]);

  assert.deepEqual(result, {
    defense: 28,
    midfield: 28,
    attack: 31,
  });
});

test('returns null for a line without a scored player', () => {
  const result = calculateTeamLineStrengths([
    { assignedRole: 'FIXO', overallUsed: 24 },
    { assignedRole: 'RIGHT_WINGER_FUTSAL', overallUsed: 26 },
    { assignedRole: 'PIVOT', overallUsed: null },
  ]);

  assert.deepEqual(result, {
    defense: 24,
    midfield: 26,
    attack: null,
  });
});
