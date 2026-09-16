import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTeamPitchLayout,
  playersPerSide,
  sortTeamAssignments,
  teamSectorForRole,
} from './team-lineup-layout.ts';

function assignment(id, displayName, assignedRole) {
  return {
    id,
    participantType: 'MEMBER',
    participantId: `${id}-participant`,
    displayName,
    assignedRole,
    overallUsed: 30,
    coverage: 100,
    scoreSource: 'REAL',
    positionOrigin: 'PRIMARY',
    reason: 'PRIMARY_POSITION',
    manuallyChanged: false,
  };
}

test('orders field and fut7 as goalkeeper, defense, midfield and attack', () => {
  const result = sortTeamAssignments([
    assignment('a', 'Atacante', 'CENTER_FORWARD'),
    assignment('m', 'Meia', 'CENTRAL_MIDFIELDER'),
    assignment('g', 'Goleiro', 'GOALKEEPER'),
    assignment('d', 'Defensor', 'CENTER_DEFENDER'),
  ], 'FUT7');

  assert.deepEqual(result.map((item) => item.assignedRole), [
    'GOALKEEPER',
    'CENTER_DEFENDER',
    'CENTRAL_MIDFIELDER',
    'CENTER_FORWARD',
  ]);
});

test('orders futsal as goalkeeper, fixo, alas and pivot', () => {
  const result = sortTeamAssignments([
    assignment('p', 'Pivô', 'PIVOT'),
    assignment('ar', 'Ala direito', 'RIGHT_WINGER_FUTSAL'),
    assignment('g', 'Goleiro', 'GOALKEEPER'),
    assignment('f', 'Fixo', 'FIXO'),
    assignment('al', 'Ala esquerdo', 'LEFT_WINGER_FUTSAL'),
  ], 'FUTSAL');

  assert.deepEqual(result.map((item) => item.assignedRole), [
    'GOALKEEPER',
    'FIXO',
    'LEFT_WINGER_FUTSAL',
    'RIGHT_WINGER_FUTSAL',
    'PIVOT',
  ]);
});

test('maps roles to the expected tactical sectors', () => {
  assert.equal(teamSectorForRole('GOALKEEPER'), 'GOALKEEPER');
  assert.equal(teamSectorForRole('RIGHT_BACK'), 'DEFENSE');
  assert.equal(teamSectorForRole('CENTRAL_MIDFIELDER'), 'MIDFIELD');
  assert.equal(teamSectorForRole('CENTER_FORWARD'), 'ATTACK');
  assert.equal(teamSectorForRole('FIXO'), 'DEFENSE');
  assert.equal(teamSectorForRole('RIGHT_WINGER_FUTSAL'), 'MIDFIELD');
  assert.equal(teamSectorForRole('PIVOT'), 'ATTACK');
});

test('uses the correct simultaneous capacity for every modality', () => {
  assert.equal(playersPerSide('FIELD'), 11);
  assert.equal(playersPerSide('FUT7'), 7);
  assert.equal(playersPerSide('FUTSAL'), 5);
});

test('places a complete fut7 2-3-1 on the pitch', () => {
  const assignments = [
    assignment('gk', 'Goleiro', 'GOALKEEPER'),
    assignment('ld', 'Zagueiro E', 'LEFT_DEFENDER'),
    assignment('rd', 'Zagueiro D', 'RIGHT_DEFENDER'),
    assignment('lm', 'Meia E', 'LEFT_MIDFIELDER'),
    assignment('cm', 'Meia C', 'CENTRAL_MIDFIELDER'),
    assignment('rm', 'Meia D', 'RIGHT_MIDFIELDER'),
    assignment('cf', 'Centroavante', 'CENTER_FORWARD'),
  ];

  const layout = buildTeamPitchLayout(assignments, 'FUT7');

  assert.equal(layout.starters.length, 7);
  assert.equal(layout.reserves.length, 0);
  assert.deepEqual(new Set(layout.starters.map((item) => item.slotId)), new Set([
    'gk', 'ld', 'rd', 'lm', 'cm', 'rm', 'cf',
  ]));
});

test('puts players above modality capacity in reserves without losing the list entry', () => {
  const assignments = [
    assignment('gk', 'Goleiro', 'GOALKEEPER'),
    assignment('ld', 'Zagueiro E', 'LEFT_DEFENDER'),
    assignment('rd', 'Zagueiro D', 'RIGHT_DEFENDER'),
    assignment('lm', 'Meia E', 'LEFT_MIDFIELDER'),
    assignment('cm', 'Meia C', 'CENTRAL_MIDFIELDER'),
    assignment('rm', 'Meia D', 'RIGHT_MIDFIELDER'),
    assignment('cf', 'Centroavante', 'CENTER_FORWARD'),
    assignment('extra', 'Reserva', 'ATTACKER'),
  ];

  const layout = buildTeamPitchLayout(assignments, 'FUT7');

  assert.equal(layout.starters.length, 7);
  assert.equal(layout.reserves.length, 1);
  assert.equal(layout.reserves[0].displayName, 'Reserva');
});

test('keeps reduced teams entirely on the pitch when there are open slots', () => {
  const layout = buildTeamPitchLayout([
    assignment('gk', 'Goleiro', 'GOALKEEPER'),
    assignment('d', 'Defensor', 'CENTER_DEFENDER'),
    assignment('m', 'Meia', 'MIDFIELDER'),
    assignment('a', 'Atacante', 'ATTACKER'),
  ], 'FIELD');

  assert.equal(layout.starters.length, 4);
  assert.equal(layout.reserves.length, 0);
});
