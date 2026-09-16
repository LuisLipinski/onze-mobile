import type { MatchModality, TeamAssignment } from './api';

export type TeamSector = 'GOALKEEPER' | 'DEFENSE' | 'MIDFIELD' | 'ATTACK' | 'OTHER';

export type PitchPlacement = {
  assignment: TeamAssignment;
  slotId: string;
  x: number;
  y: number;
};

export type TeamPitchLayout = {
  starters: PitchPlacement[];
  reserves: TeamAssignment[];
  capacity: number;
};

type PitchSlot = {
  id: string;
  roles: string[];
  sector: TeamSector;
  x: number;
  y: number;
};

const FIELD_SLOTS: PitchSlot[] = [
  { id: 'gk', roles: ['GOALKEEPER'], sector: 'GOALKEEPER', x: 50, y: 91 },
  { id: 'lb', roles: ['LEFT_BACK', 'LEFT_DEFENDER'], sector: 'DEFENSE', x: 15, y: 72 },
  { id: 'lcb', roles: ['CENTER_DEFENDER', 'DEFENDER'], sector: 'DEFENSE', x: 38, y: 68 },
  { id: 'rcb', roles: ['CENTER_DEFENDER', 'DEFENDER'], sector: 'DEFENSE', x: 62, y: 68 },
  { id: 'rb', roles: ['RIGHT_BACK', 'RIGHT_DEFENDER'], sector: 'DEFENSE', x: 85, y: 72 },
  { id: 'dm', roles: ['DEFENSIVE_MIDFIELDER', 'MIDFIELDER'], sector: 'MIDFIELD', x: 25, y: 48 },
  { id: 'cm', roles: ['CENTRAL_MIDFIELDER', 'MIDFIELDER'], sector: 'MIDFIELD', x: 50, y: 44 },
  { id: 'am', roles: ['PLAYMAKER', 'MIDFIELDER'], sector: 'MIDFIELD', x: 75, y: 48 },
  { id: 'lw', roles: ['LEFT_WINGER', 'ATTACKER'], sector: 'ATTACK', x: 18, y: 20 },
  { id: 'cf', roles: ['CENTER_FORWARD', 'ATTACKER'], sector: 'ATTACK', x: 50, y: 14 },
  { id: 'rw', roles: ['RIGHT_WINGER', 'ATTACKER'], sector: 'ATTACK', x: 82, y: 20 },
];

const FUT7_SLOTS: PitchSlot[] = [
  { id: 'gk', roles: ['GOALKEEPER'], sector: 'GOALKEEPER', x: 50, y: 91 },
  { id: 'ld', roles: ['LEFT_DEFENDER', 'LEFT_BACK', 'DEFENDER', 'CENTER_DEFENDER'], sector: 'DEFENSE', x: 32, y: 69 },
  { id: 'rd', roles: ['RIGHT_DEFENDER', 'RIGHT_BACK', 'DEFENDER', 'CENTER_DEFENDER'], sector: 'DEFENSE', x: 68, y: 69 },
  { id: 'lm', roles: ['LEFT_MIDFIELDER', 'LEFT_WINGER', 'MIDFIELDER'], sector: 'MIDFIELD', x: 20, y: 44 },
  { id: 'cm', roles: ['CENTRAL_MIDFIELDER', 'MIDFIELDER', 'PLAYMAKER', 'DEFENSIVE_MIDFIELDER'], sector: 'MIDFIELD', x: 50, y: 41 },
  { id: 'rm', roles: ['RIGHT_MIDFIELDER', 'RIGHT_WINGER', 'MIDFIELDER'], sector: 'MIDFIELD', x: 80, y: 44 },
  { id: 'cf', roles: ['CENTER_FORWARD', 'ATTACKER'], sector: 'ATTACK', x: 50, y: 16 },
];

const FUTSAL_SLOTS: PitchSlot[] = [
  { id: 'gk', roles: ['GOALKEEPER'], sector: 'GOALKEEPER', x: 50, y: 91 },
  { id: 'fixo', roles: ['FIXO'], sector: 'DEFENSE', x: 50, y: 67 },
  { id: 'ala-left', roles: ['LEFT_WINGER_FUTSAL'], sector: 'MIDFIELD', x: 25, y: 43 },
  { id: 'ala-right', roles: ['RIGHT_WINGER_FUTSAL'], sector: 'MIDFIELD', x: 75, y: 43 },
  { id: 'pivot', roles: ['PIVOT'], sector: 'ATTACK', x: 50, y: 17 },
];

const DEFENSE_ROLES = new Set([
  'DEFENDER',
  'RIGHT_DEFENDER',
  'LEFT_DEFENDER',
  'CENTER_DEFENDER',
  'RIGHT_BACK',
  'LEFT_BACK',
  'FIXO',
]);

const MIDFIELD_ROLES = new Set([
  'DEFENSIVE_MIDFIELDER',
  'MIDFIELDER',
  'RIGHT_MIDFIELDER',
  'LEFT_MIDFIELDER',
  'CENTRAL_MIDFIELDER',
  'PLAYMAKER',
  'RIGHT_WINGER_FUTSAL',
  'LEFT_WINGER_FUTSAL',
]);

const ATTACK_ROLES = new Set([
  'ATTACKER',
  'RIGHT_WINGER',
  'LEFT_WINGER',
  'CENTER_FORWARD',
  'PIVOT',
]);

const FIELD_ROLE_ORDER: Record<string, number> = {
  GOALKEEPER: 0,
  LEFT_BACK: 100,
  LEFT_DEFENDER: 105,
  CENTER_DEFENDER: 110,
  DEFENDER: 115,
  RIGHT_DEFENDER: 120,
  RIGHT_BACK: 125,
  DEFENSIVE_MIDFIELDER: 200,
  LEFT_MIDFIELDER: 210,
  MIDFIELDER: 220,
  CENTRAL_MIDFIELDER: 225,
  PLAYMAKER: 230,
  RIGHT_MIDFIELDER: 240,
  LEFT_WINGER: 300,
  ATTACKER: 310,
  CENTER_FORWARD: 315,
  RIGHT_WINGER: 320,
};

const FUTSAL_ROLE_ORDER: Record<string, number> = {
  GOALKEEPER: 0,
  FIXO: 100,
  LEFT_WINGER_FUTSAL: 200,
  RIGHT_WINGER_FUTSAL: 210,
  PIVOT: 300,
};

export function teamSectorForRole(role: string): TeamSector {
  if (role === 'GOALKEEPER') return 'GOALKEEPER';
  if (DEFENSE_ROLES.has(role)) return 'DEFENSE';
  if (MIDFIELD_ROLES.has(role)) return 'MIDFIELD';
  if (ATTACK_ROLES.has(role)) return 'ATTACK';
  return 'OTHER';
}

export function playersPerSide(modality: MatchModality) {
  switch (modality) {
    case 'FIELD': return 11;
    case 'FUTSAL': return 5;
    default: return 7;
  }
}

export function sortTeamAssignments(
  assignments: TeamAssignment[],
  modality: MatchModality,
) {
  const order = modality === 'FUTSAL' ? FUTSAL_ROLE_ORDER : FIELD_ROLE_ORDER;
  return [...assignments].sort((left, right) => {
    const leftOrder = order[left.assignedRole] ?? sectorFallbackOrder(left.assignedRole);
    const rightOrder = order[right.assignedRole] ?? sectorFallbackOrder(right.assignedRole);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    const byName = left.displayName.localeCompare(right.displayName, 'pt-BR');
    if (byName !== 0) return byName;
    return left.participantId.localeCompare(right.participantId);
  });
}

export function buildTeamPitchLayout(
  assignments: TeamAssignment[],
  modality: MatchModality,
): TeamPitchLayout {
  const slots = slotsForModality(modality).map((slot) => ({ ...slot, used: false }));
  const starters: PitchPlacement[] = [];
  const reserves: TeamAssignment[] = [];
  const ordered = sortTeamAssignments(assignments, modality);

  for (const assignment of ordered) {
    const sector = teamSectorForRole(assignment.assignedRole);
    let slotIndex = slots.findIndex(
      (slot) => !slot.used && slot.roles.includes(assignment.assignedRole),
    );
    if (slotIndex < 0) {
      slotIndex = slots.findIndex((slot) => !slot.used && slot.sector === sector);
    }
    if (slotIndex < 0) {
      slotIndex = slots.findIndex((slot) => !slot.used);
    }
    if (slotIndex < 0) {
      reserves.push(assignment);
      continue;
    }

    const slot = slots[slotIndex];
    slot.used = true;
    starters.push({
      assignment,
      slotId: slot.id,
      x: slot.x,
      y: slot.y,
    });
  }

  return {
    starters,
    reserves,
    capacity: slots.length,
  };
}

function slotsForModality(modality: MatchModality): PitchSlot[] {
  switch (modality) {
    case 'FIELD': return FIELD_SLOTS;
    case 'FUTSAL': return FUTSAL_SLOTS;
    default: return FUT7_SLOTS;
  }
}

function sectorFallbackOrder(role: string) {
  switch (teamSectorForRole(role)) {
    case 'GOALKEEPER': return 0;
    case 'DEFENSE': return 150;
    case 'MIDFIELD': return 250;
    case 'ATTACK': return 350;
    default: return 450;
  }
}
