import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTeamFormation, sortTeamAssignments } from './team-formation.ts';

function assignment(id, displayName, assignedRole, overallUsed = 25) {
  return {
    id,
    participantType: 'MEMBER',
    participantId: id,
    displayName,
    assignedRole,
    overallUsed,
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

test('FIELD mapeia 4-3-3 horizontal e respeita a reserva persistida', () => {
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
    assignment('10', 'CA', 'CENTER_FORWARD', 40),
    assignment('11', 'PE', 'LEFT_WINGER'),
    assignment('12', 'CA reserva', 'CENTER_FORWARD', 20),
  ], 'FIELD', new Set(['12']));

  assert.equal(formation.fieldPlayers.length, 11);
  assert.deepEqual(formation.reserves.map((item) => item.displayName), ['CA reserva']);
  const goalkeeper = formation.fieldPlayers.find((item) => item.assignment.displayName === 'Goleiro');
  const striker = formation.fieldPlayers.find((item) => item.assignment.displayName === 'CA');
  assert.ok(goalkeeper?.slotId.startsWith('goalkeeper-'));
  assert.ok((goalkeeper?.x ?? 100) < (striker?.x ?? 0));
});

test('FUT7 usa 2-3-1 e respeita os excedentes marcados como reservas', () => {
  const formation = buildTeamFormation([
    assignment('1', 'GOL', 'GOALKEEPER'),
    assignment('2', 'ZD', 'RIGHT_DEFENDER'),
    assignment('3', 'ZE', 'LEFT_DEFENDER'),
    assignment('4', 'MD', 'RIGHT_MIDFIELDER'),
    assignment('5', 'MC', 'CENTRAL_MIDFIELDER'),
    assignment('6', 'ME', 'LEFT_MIDFIELDER'),
    assignment('7', 'CA', 'CENTER_FORWARD', 40),
    assignment('8', 'Outro CA', 'CENTER_FORWARD', 30),
    assignment('9', 'Terceiro CA', 'CENTER_FORWARD', 20),
  ], 'FUT7', new Set(['8', '9']));

  assert.equal(formation.fieldPlayers.length, 7);
  assert.deepEqual(formation.reserves.map((item) => item.displayName), ['Outro CA', 'Terceiro CA']);
  assert.equal(new Set(formation.fieldPlayers.map((item) => item.slotId)).size, 7);
});

test('FUTSAL mapeia função atribuída e reserva persistida', () => {
  const formation = buildTeamFormation([
    assignment('1', 'GOL', 'GOALKEEPER'),
    assignment('2', 'Fixo', 'FIXO'),
    assignment('3', 'AD', 'RIGHT_WINGER_FUTSAL'),
    assignment('4', 'AE', 'LEFT_WINGER_FUTSAL'),
    assignment('5', 'Pivô', 'PIVOT', 40),
    assignment('6', 'Segundo pivô', 'PIVOT', 20),
  ], 'FUTSAL', new Set(['6']));

  assert.equal(formation.fieldPlayers.length, 5);
  assert.deepEqual(formation.reserves.map((item) => item.displayName), ['Segundo pivô']);
  assert.ok(formation.fieldPlayers.find((item) => item.assignment.displayName === 'Pivô')?.slotId.startsWith('attack-'));
});

test('reserva definida pelo administrador prevalece mesmo se for o jogador mais forte', () => {
  const strong = assignment('strong', 'Forte', 'CENTER_FORWARD', 45);
  const weak = assignment('weak', 'Fraco', 'CENTER_FORWARD', 20);

  const formation = buildTeamFormation(
    [strong, weak],
    'FUT7',
    new Set(['strong']),
  );

  assert.deepEqual(formation.reserves.map((item) => item.id), ['strong']);
  assert.deepEqual(formation.fieldPlayers.map((item) => item.assignment.id), ['weak']);
});

test('ajuste manual pode mudar a quantidade de jogadores por setor sem sobreposição de slot', () => {
  const formation = buildTeamFormation([
    assignment('1', 'GOL', 'GOALKEEPER'),
    assignment('2', 'Atacante 1', 'CENTER_FORWARD'),
    assignment('3', 'Atacante 2', 'CENTER_FORWARD'),
    assignment('4', 'Atacante 3', 'LEFT_WINGER'),
    assignment('5', 'Meia', 'CENTRAL_MIDFIELDER'),
    assignment('6', 'Zagueiro', 'CENTER_DEFENDER'),
    assignment('7', 'Lateral', 'RIGHT_BACK'),
  ], 'FUT7');

  assert.equal(formation.fieldPlayers.length, 7);
  assert.equal(new Set(formation.fieldPlayers.map((item) => item.slotId)).size, 7);
  assert.equal(formation.reserves.length, 0);
});

test('fallback não sobrepõe jogadores quando o estado de reservas estiver temporariamente ausente', () => {
  const formation = buildTeamFormation([
    assignment('1', 'GOL', 'GOALKEEPER', 30),
    assignment('2', 'A', 'CENTER_FORWARD', 40),
    assignment('3', 'B', 'CENTER_FORWARD', 39),
    assignment('4', 'C', 'CENTER_FORWARD', 38),
    assignment('5', 'D', 'CENTER_FORWARD', 37),
    assignment('6', 'E', 'CENTER_FORWARD', 36),
    assignment('7', 'F', 'CENTER_FORWARD', 35),
    assignment('8', 'G', 'CENTER_FORWARD', 10),
  ], 'FUT7');

  assert.equal(formation.fieldPlayers.length, 7);
  assert.equal(formation.reserves.length, 1);
  assert.equal(formation.reserves[0].id, '8');
  assert.equal(new Set(formation.fieldPlayers.map((item) => item.slotId)).size, 7);
});
