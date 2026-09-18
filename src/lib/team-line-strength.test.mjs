import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateTeamLineStrengths,
  calculateTeamStrength,
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

test('keeps the normal average when the field formation has complete line coverage', () => {
  const result = calculateTeamLineStrengths([
    { assignedRole: 'CENTER_DEFENDER', overallUsed: 30 },
    { assignedRole: 'CENTER_DEFENDER', overallUsed: 32 },
    { assignedRole: 'RIGHT_BACK', overallUsed: 26 },
    { assignedRole: 'LEFT_BACK', overallUsed: 28 },
    { assignedRole: 'CENTRAL_MIDFIELDER', overallUsed: 27 },
    { assignedRole: 'DEFENSIVE_MIDFIELDER', overallUsed: 29 },
    { assignedRole: 'PLAYMAKER', overallUsed: 28 },
    { assignedRole: 'CENTER_FORWARD', overallUsed: 31 },
    { assignedRole: 'RIGHT_WINGER', overallUsed: 30 },
    { assignedRole: 'LEFT_WINGER', overallUsed: 29 },
    { assignedRole: 'GOALKEEPER', overallUsed: 40 },
  ], 'FIELD');

  assert.deepEqual(result, {
    defense: 29,
    midfield: 28,
    attack: 30,
  });
});

test('penalizes missing defensive coverage instead of making one stronger defender look better', () => {
  const twoDefenders = calculateTeamLineStrengths([
    { assignedRole: 'CENTER_DEFENDER', overallUsed: 33 },
    { assignedRole: 'CENTER_DEFENDER', overallUsed: 38 },
  ], 'FUT7');

  const oneDefender = calculateTeamLineStrengths([
    { assignedRole: 'CENTER_DEFENDER', overallUsed: 38 },
  ], 'FUT7');

  assert.equal(twoDefenders.defense, 36);
  assert.equal(oneDefender.defense, 19);
});

test('does not give an automatic quantity bonus after the expected line coverage is reached', () => {
  const result = calculateTeamLineStrengths([
    { assignedRole: 'CENTER_DEFENDER', overallUsed: 38 },
    { assignedRole: 'LEFT_DEFENDER', overallUsed: 34 },
    { assignedRole: 'RIGHT_DEFENDER', overallUsed: 36 },
  ], 'FUT7');

  assert.equal(result.defense, 36);
});

test('returns zero for an empty line and null when the line exists but has no score', () => {
  const result = calculateTeamLineStrengths([
    { assignedRole: 'FIXO', overallUsed: 24 },
    { assignedRole: 'RIGHT_WINGER_FUTSAL', overallUsed: 26 },
    { assignedRole: 'PIVOT', overallUsed: null },
  ], 'FUTSAL');

  assert.deepEqual(result, {
    defense: 24,
    midfield: 13,
    attack: null,
  });

  const withoutAttack = calculateTeamLineStrengths([
    { assignedRole: 'FIXO', overallUsed: 24 },
    { assignedRole: 'RIGHT_WINGER_FUTSAL', overallUsed: 26 },
  ], 'FUTSAL');

  assert.equal(withoutAttack.attack, 0);
});

test('penalizes an incomplete team so removing a weak player cannot raise team strength', () => {
  const complete = calculateTeamStrength([
    { assignedRole: 'GOALKEEPER', overallUsed: 40 },
    { assignedRole: 'RIGHT_DEFENDER', overallUsed: 40 },
    { assignedRole: 'LEFT_DEFENDER', overallUsed: 40 },
    { assignedRole: 'RIGHT_MIDFIELDER', overallUsed: 40 },
    { assignedRole: 'CENTRAL_MIDFIELDER', overallUsed: 40 },
    { assignedRole: 'LEFT_MIDFIELDER', overallUsed: 40 },
    { assignedRole: 'CENTER_FORWARD', overallUsed: 20 },
  ], 'FUT7');

  const incomplete = calculateTeamStrength([
    { assignedRole: 'GOALKEEPER', overallUsed: 40 },
    { assignedRole: 'RIGHT_DEFENDER', overallUsed: 40 },
    { assignedRole: 'LEFT_DEFENDER', overallUsed: 40 },
    { assignedRole: 'RIGHT_MIDFIELDER', overallUsed: 40 },
    { assignedRole: 'CENTRAL_MIDFIELDER', overallUsed: 40 },
    { assignedRole: 'LEFT_MIDFIELDER', overallUsed: 40 },
  ], 'FUT7');

  assert.equal(complete, 37);
  assert.equal(incomplete, 34);
});
