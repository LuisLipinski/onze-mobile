import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTeamFormation, sortTeamAssignments } from './team-formation.ts';

function assignment(id, displayName, assignedRole) {
  return {
    id,
    participantType: 'MEMBER',
    participantId: id,
    displayName,
    assignedRole,
    overallUsed: 25,
    coverage: 100,
    scoreSource: 'REAL',
    positionOrigin: 'PRIMARY',
    reason: 'PRIMARY_POSITION',
    manuallyChanged: false,
  };
}

test('FIELD ordena goleiro, defesa, meio e ataque de forma determinística', () => {
  const result = sortTeamAssignments([
    assignment('5', 'Centroavante', 'CENTER_FORWARD'),
    assignment('3', 'Meia', 'CENTRAL_MIDFIELDER'),
    assignment('2', 'Zagueiro', 'CENTER_DEFENDER'),
    assignment('1', 'Goleiro', 'GOALKEEPER'),
    assignment('4', 'Ponta', 'RIGHT_WINGER'),
  ], 'FIELD');

  assert.deepEqual(result.map((item) => item.assignedRole), [
    'GOALKEEPER',
    'CENTER_DEFENDER',
    'CENTRAL_MIDFIELDER',
    'RIGHT_WINGER',
    'CENTER_FORWARD',
  ]);
});

test('FUT7 preserva ordem por setores e lados', () => {
  const result = sortTeamAssignments([
    assignment('7', 'Ataque', 'CENTER_FORWARD'),
    assignment('6', 'Meia esquerda', 'LEFT_MIDFIELDER'),
    assignment('4', 'Meia central', 'CENTRAL_MIDFIELDER'),
    assignment('5', 'Meia direita', 'RIGHT_MIDFIELDER'),
    assignment('2', 'Defesa esquerda', 'LEFT_DEFENDER'),
    assignment('3', 'Defesa direita', 'RIGHT_DEFENDER'),
    assignment('1', 'Goleiro', 'GOALKEEPER'),
  ], 'FUT7');

  assert.deepEqual(result.map((item) => item.assignedRole), [
    'GOALKEEPER',
    'RIGHT_DEFENDER',
    'LEFT_DEFENDER',
    'RIGHT_MIDFIELDER',
    'CENTRAL_MIDFIELDER',
    'LEFT_MIDFIELDER',
    'CENTER_FORWARD',
  ]);
});

test('FUTSAL ordena GOL, FIXO, alas e PIVÔ', () => {
  const result = sortTeamAssignments([
    assignment('5', 'Pivô', 'PIVOT'),
    assignment('4', 'Ala esquerda', 'LEFT_WINGER_FUTSAL'),
    assignment('3', 'Ala direita', 'RIGHT_WINGER_FUTSAL'),
    assignment('2', 'Fixo', 'FIXO'),
    assignment('1', 'Goleiro', 'GOALKEEPER'),
  ], 'FUTSAL');

  assert.deepEqual(result.map((item) => item.assignedRole), [
    'GOALKEEPER', 'FIXO', 'RIGHT_WINGER_FUTSAL', 'LEFT_WINGER_FUTSAL', 'PIVOT',
  ]);
});

test('FIELD mapeia 4-3-3 e envia duplicata excedente para reservas', () => {
  const formation = buildTeamFormation([
    assignment('1', 'Goleiro', 'GOALKEEPER'),
    assignment('2', 'LD', 'RIGHT_BACK'),
    assignment('3', 'Z1', 'CENTER_DEFENDER'),
    assignment('4', 'Z2', 'CENTER_DEFENDER'),
    assignment('5', 'LE', 'LEFT_BACK'),
    assignment('6', 'MD', 'RIGHT_MIDFIELDER'),
    assignment('7', 'MC', 'CENTRAL_MIDFIELDER'),
    assignment('8', 'ME', 'LEFT_MIDFIELDER'),
    assignment('9', 'PD', 'RIGHT_WINGER'),
    assignment('10', 'CA', 'CENTER_FORWARD'),
    assignment('11', 'PE', 'LEFT_WINGER'),
    assignment('12', 'CA reserva', 'CENTER_FORWARD'),
  ], 'FIELD');

  assert.equal(formation.fieldPlayers.length, 11);
  assert.deepEqual(formation.reserves.map((item) => item.displayName), ['CA reserva']);
  assert.equal(formation.fieldPlayers.find((item) => item.assignment.displayName === 'Goleiro')?.slotId, 'gk');
});

test('FUT7 usa 2-3-1 e não sobrepõe excedentes', () => {
  const formation = buildTeamFormation([
    assignment('1', 'GOL', 'GOALKEEPER'),
    assignment('2', 'ZD', 'RIGHT_DEFENDER'),
    assignment('3', 'ZE', 'LEFT_DEFENDER'),
    assignment('4', 'MD', 'RIGHT_MIDFIELDER'),
    assignment('5', 'MC', 'CENTRAL_MIDFIELDER'),
    assignment('6', 'ME', 'LEFT_MIDFIELDER'),
    assignment('7', 'CA', 'CENTER_FORWARD'),
    assignment('8', 'Outro CA', 'CENTER_FORWARD'),
    assignment('9', 'Terceiro CA', 'CENTER_FORWARD'),
  ], 'FUT7');

  assert.equal(formation.fieldPlayers.length, 7);
  assert.deepEqual(formation.reserves.map((item) => item.displayName), ['Outro CA', 'Terceiro CA']);
  assert.equal(new Set(formation.fieldPlayers.map((item) => item.slotId)).size, 7);
});

test('FUTSAL mapeia função atribuída e overflow para reservas', () => {
  const formation = buildTeamFormation([
    assignment('1', 'GOL', 'GOALKEEPER'),
    assignment('2', 'Fixo', 'FIXO'),
    assignment('3', 'AD', 'RIGHT_WINGER_FUTSAL'),
    assignment('4', 'AE', 'LEFT_WINGER_FUTSAL'),
    assignment('5', 'Pivô', 'PIVOT'),
    assignment('6', 'Segundo pivô', 'PIVOT'),
  ], 'FUTSAL');

  assert.equal(formation.fieldPlayers.length, 5);
  assert.deepEqual(formation.reserves.map((item) => item.displayName), ['Segundo pivô']);
  assert.equal(formation.fieldPlayers.find((item) => item.assignment.displayName === 'Pivô')?.slotId, 'pivot');
});
