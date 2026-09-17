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

type FormationSlot = {
  id: string;
  x: number;
  y: number;
  roles: readonly string[];
};

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

// Horizontal field: goalkeeper on the left, attack on the right.
// Vertical spacing inside each line keeps even an 11-player formation readable on mobile.
const FIELD_SLOTS: readonly FormationSlot[] = [
  { id: 'gk', x: 8, y: 50, roles: ['GOALKEEPER'] },
  { id: 'rb', x: 30, y: 84, roles: ['RIGHT_BACK', 'RIGHT_DEFENDER', 'DEFENDER'] },
  { id: 'rcb', x: 30, y: 62, roles: ['CENTER_DEFENDER', 'RIGHT_DEFENDER', 'DEFENDER'] },
  { id: 'lcb', x: 30, y: 38, roles: ['CENTER_DEFENDER', 'LEFT_DEFENDER', 'DEFENDER'] },
  { id: 'lb', x: 30, y: 16, roles: ['LEFT_BACK', 'LEFT_DEFENDER', 'DEFENDER'] },
  { id: 'rm', x: 55, y: 78, roles: ['RIGHT_MIDFIELDER', 'MIDFIELDER', 'PLAYMAKER'] },
  { id: 'cm', x: 55, y: 50, roles: ['CENTRAL_MIDFIELDER', 'DEFENSIVE_MIDFIELDER', 'MIDFIELDER', 'PLAYMAKER'] },
  { id: 'lm', x: 55, y: 22, roles: ['LEFT_MIDFIELDER', 'MIDFIELDER', 'PLAYMAKER'] },
  { id: 'rw', x: 82, y: 78, roles: ['RIGHT_WINGER', 'ATTACKER'] },
  { id: 'cf', x: 82, y: 50, roles: ['CENTER_FORWARD', 'ATTACKER'] },
  { id: 'lw', x: 82, y: 22, roles: ['LEFT_WINGER', 'ATTACKER'] },
];

const FUT7_SLOTS: readonly FormationSlot[] = [
  { id: 'gk', x: 8, y: 50, roles: ['GOALKEEPER'] },
  { id: 'rd', x: 32, y: 68, roles: ['RIGHT_DEFENDER', 'RIGHT_BACK', 'CENTER_DEFENDER', 'DEFENDER'] },
  { id: 'ld', x: 32, y: 32, roles: ['LEFT_DEFENDER', 'LEFT_BACK', 'CENTER_DEFENDER', 'DEFENDER'] },
  { id: 'rm', x: 58, y: 78, roles: ['RIGHT_MIDFIELDER', 'MIDFIELDER', 'PLAYMAKER'] },
  { id: 'cm', x: 58, y: 50, roles: ['CENTRAL_MIDFIELDER', 'DEFENSIVE_MIDFIELDER', 'MIDFIELDER', 'PLAYMAKER'] },
  { id: 'lm', x: 58, y: 22, roles: ['LEFT_MIDFIELDER', 'MIDFIELDER', 'PLAYMAKER'] },
  { id: 'cf', x: 84, y: 50, roles: ['CENTER_FORWARD', 'ATTACKER', 'RIGHT_WINGER', 'LEFT_WINGER'] },
];

const FUTSAL_SLOTS: readonly FormationSlot[] = [
  { id: 'gk', x: 8, y: 50, roles: ['GOALKEEPER'] },
  { id: 'fixo', x: 32, y: 50, roles: ['FIXO'] },
  { id: 'ala-r', x: 58, y: 72, roles: ['RIGHT_WINGER_FUTSAL'] },
  { id: 'ala-l', x: 58, y: 28, roles: ['LEFT_WINGER_FUTSAL'] },
  { id: 'pivot', x: 84, y: 50, roles: ['PIVOT'] },
];

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

function slotsFor(modality: MatchModality) {
  if (modality === 'FIELD') return FIELD_SLOTS;
  if (modality === 'FUTSAL') return FUTSAL_SLOTS;
  return FUT7_SLOTS;
}

export function buildTeamFormation(
  assignments: readonly TeamAssignment[],
  modality: MatchModality,
  reserveAssignmentIds: ReadonlySet<string> = new Set<string>(),
): TeamFormation {
  const sorted = formationOrder(assignments, modality);
  const availableSlots = slotsFor(modality).map((slot) => ({ ...slot, occupied: false }));
  const fieldPlayers: FormationPlayer[] = [];
  const reserves: TeamAssignment[] = [];

  for (const assignment of sorted) {
    if (reserveAssignmentIds.has(assignment.id)) {
      reserves.push(assignment);
      continue;
    }

    const slot = availableSlots.find((candidate) => (
      !candidate.occupied && candidate.roles.includes(assignment.assignedRole)
    ));
    if (!slot) {
      reserves.push(assignment);
      continue;
    }
    slot.occupied = true;
    fieldPlayers.push({
      assignment,
      slotId: slot.id,
      x: slot.x,
      y: slot.y,
    });
  }

  return {
    fieldPlayers,
    reserves: sortTeamAssignments(reserves, modality),
  };
}
