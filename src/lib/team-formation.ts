import type { MatchModality, TeamAssignment } from './api';

export type FormationPlayer = {
  assignment: TeamAssignment;
  slotId: string;
  x: number;
  y: number;
};

export type TeamFormation = {
  fieldPlayers: FormationPlayer[];
  reserves: TeamAssignment[];
};

type FormationSector = 'GOALKEEPER' | 'DEFENSE' | 'MIDFIELD' | 'ATTACK';

const OUTDOOR_ROLE_ORDER: Record<string, number> = {
  GOALKEEPER: 0,
  RIGHT_BACK: 10,
  RIGHT_DEFENDER: 11,
  CENTER_DEFENDER: 12,
  DEFENDER: 13,
  LEFT_DEFENDER: 14,
  LEFT_BACK: 15,
  DEFENSIVE_MIDFIELDER: 20,
  RIGHT_MIDFIELDER: 21,
  CENTRAL_MIDFIELDER: 22,
  MIDFIELDER: 23,
  PLAYMAKER: 24,
  LEFT_MIDFIELDER: 25,
  RIGHT_WINGER: 30,
  ATTACKER: 31,
  CENTER_FORWARD: 32,
  LEFT_WINGER: 33,
};

const FUTSAL_ROLE_ORDER: Record<string, number> = {
  GOALKEEPER: 0,
  FIXO: 10,
  RIGHT_WINGER_FUTSAL: 20,
  LEFT_WINGER_FUTSAL: 21,
  PIVOT: 30,
};

const DEFENSE_ROLES = new Set([
  'DEFENDER', 'RIGHT_DEFENDER', 'LEFT_DEFENDER', 'CENTER_DEFENDER', 'RIGHT_BACK', 'LEFT_BACK', 'FIXO',
]);
const MIDFIELD_ROLES = new Set([
  'DEFENSIVE_MIDFIELDER', 'MIDFIELDER', 'RIGHT_MIDFIELDER', 'LEFT_MIDFIELDER',
  'CENTRAL_MIDFIELDER', 'PLAYMAKER', 'RIGHT_WINGER_FUTSAL', 'LEFT_WINGER_FUTSAL',
]);
const ATTACK_ROLES = new Set([
  'ATTACKER', 'RIGHT_WINGER', 'LEFT_WINGER', 'CENTER_FORWARD', 'PIVOT',
]);

function roleOrder(modality: MatchModality, role: string) {
  const order = modality === 'FUTSAL' ? FUTSAL_ROLE_ORDER : OUTDOOR_ROLE_ORDER;
  return order[role] ?? 999;
}

export function sortTeamAssignments(
  assignments: readonly TeamAssignment[],
  modality: MatchModality,
): TeamAssignment[] {
  return [...assignments].sort((left, right) => {
    const roleDifference = roleOrder(modality, left.assignedRole) - roleOrder(modality, right.assignedRole);
    if (roleDifference !== 0) return roleDifference;
    const nameDifference = left.displayName.localeCompare(right.displayName, 'pt-BR');
    if (nameDifference !== 0) return nameDifference;
    return left.id.localeCompare(right.id);
  });
}

function formationOrder(
  assignments: readonly TeamAssignment[],
  modality: MatchModality,
): TeamAssignment[] {
  return [...assignments].sort((left, right) => {
    const roleDifference = roleOrder(modality, left.assignedRole) - roleOrder(modality, right.assignedRole);
    if (roleDifference !== 0) return roleDifference;
    const strengthDifference = (right.overallUsed ?? -1) - (left.overallUsed ?? -1);
    if (strengthDifference !== 0) return strengthDifference;
    const nameDifference = left.displayName.localeCompare(right.displayName, 'pt-BR');
    if (nameDifference !== 0) return nameDifference;
    return left.id.localeCompare(right.id);
  });
}

function fieldCapacity(modality: MatchModality) {
  if (modality === 'FIELD') return 11;
  if (modality === 'FUTSAL') return 5;
  return 7;
}

function sectorForRole(role: string): FormationSector {
  if (role === 'GOALKEEPER') return 'GOALKEEPER';
  if (DEFENSE_ROLES.has(role)) return 'DEFENSE';
  if (MIDFIELD_ROLES.has(role)) return 'MIDFIELD';
  if (ATTACK_ROLES.has(role)) return 'ATTACK';
  return 'MIDFIELD';
}

function baseX(sector: FormationSector) {
  switch (sector) {
    case 'GOALKEEPER': return 11;
    case 'DEFENSE': return 32;
    case 'MIDFIELD': return 58;
    case 'ATTACK': return 86;
  }
}

function distributeSector(
  assignments: TeamAssignment[],
  sector: FormationSector,
): FormationPlayer[] {
  if (!assignments.length) return [];
  const maxRows = 4;
  const columns = Math.ceil(assignments.length / maxRows);
  const players: FormationPlayer[] = [];
  let cursor = 0;

  for (let column = 0; column < columns; column++) {
    const remaining = assignments.length - cursor;
    const rows = Math.min(maxRows, remaining);
    const xOffset = columns === 1 ? 0 : (column - (columns - 1) / 2) * 8;
    for (let row = 0; row < rows; row++) {
      const assignment = assignments[cursor++];
      players.push({
        assignment,
        slotId: `${sector.toLowerCase()}-${column}-${row}`,
        x: Math.max(8, Math.min(92, baseX(sector) + xOffset)),
        y: ((row + 1) * 100) / (rows + 1),
      });
    }
  }
  return players;
}

export function buildTeamFormation(
  assignments: readonly TeamAssignment[],
  modality: MatchModality,
  reserveAssignmentIds: ReadonlySet<string> = new Set<string>(),
): TeamFormation {
  const sorted = formationOrder(assignments, modality);
  const explicitReserves = sorted.filter((assignment) => reserveAssignmentIds.has(assignment.id));
  const active = sorted.filter((assignment) => !reserveAssignmentIds.has(assignment.id));
  const capacity = fieldCapacity(modality);

  // Safety fallback for stale/missing reserve state: never squeeze more players than the modality supports.
  // Stronger players stay on the field; the backend normally persists the authoritative reserve choice.
  const rankedActive = [...active].sort((left, right) => {
    const strengthDifference = (right.overallUsed ?? -1) - (left.overallUsed ?? -1);
    if (strengthDifference !== 0) return strengthDifference;
    return left.id.localeCompare(right.id);
  });
  const activeIds = new Set(rankedActive.slice(0, capacity).map((assignment) => assignment.id));
  const fieldAssignments = active.filter((assignment) => activeIds.has(assignment.id));
  const overflowReserves = active.filter((assignment) => !activeIds.has(assignment.id));

  const bySector = new Map<FormationSector, TeamAssignment[]>([
    ['GOALKEEPER', []],
    ['DEFENSE', []],
    ['MIDFIELD', []],
    ['ATTACK', []],
  ]);
  for (const assignment of fieldAssignments) {
    bySector.get(sectorForRole(assignment.assignedRole))?.push(assignment);
  }
  bySector.forEach((items) => items.sort((left, right) => {
    const orderDifference = roleOrder(modality, left.assignedRole) - roleOrder(modality, right.assignedRole);
    if (orderDifference !== 0) return orderDifference;
    return left.displayName.localeCompare(right.displayName, 'pt-BR');
  }));

  const fieldPlayers: FormationPlayer[] = [
    ...distributeSector(bySector.get('GOALKEEPER') ?? [], 'GOALKEEPER'),
    ...distributeSector(bySector.get('DEFENSE') ?? [], 'DEFENSE'),
    ...distributeSector(bySector.get('MIDFIELD') ?? [], 'MIDFIELD'),
    ...distributeSector(bySector.get('ATTACK') ?? [], 'ATTACK'),
  ];

  return {
    fieldPlayers,
    reserves: sortTeamAssignments([...explicitReserves, ...overflowReserves], modality),
  };
}
