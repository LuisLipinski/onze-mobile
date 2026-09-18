export type TeamStrengthLine = 'DEFENSE' | 'MIDFIELD' | 'ATTACK' | 'OTHER';
export type TeamStrengthModality = 'FIELD' | 'FUT7' | 'FUTSAL';

type ScoredAssignment = {
  assignedRole: string;
  overallUsed: number | null;
};

export type TeamLineStrengths = {
  defense: number | null;
  midfield: number | null;
  attack: number | null;
};

const LINE_CAPACITY: Record<
  TeamStrengthModality,
  Record<Exclude<TeamStrengthLine, 'OTHER'>, number>
> = {
  FIELD: {
    DEFENSE: 4,
    MIDFIELD: 3,
    ATTACK: 3,
  },
  FUT7: {
    DEFENSE: 2,
    MIDFIELD: 3,
    ATTACK: 1,
  },
  FUTSAL: {
    DEFENSE: 1,
    MIDFIELD: 2,
    ATTACK: 1,
  },
};

const TEAM_CAPACITY: Record<TeamStrengthModality, number> = {
  FIELD: 11,
  FUT7: 7,
  FUTSAL: 5,
};

export function teamStrengthLineForRole(role: string): TeamStrengthLine {
  switch (role) {
    case 'DEFENDER':
    case 'RIGHT_DEFENDER':
    case 'LEFT_DEFENDER':
    case 'CENTER_DEFENDER':
    case 'RIGHT_BACK':
    case 'LEFT_BACK':
    case 'FIXO':
      return 'DEFENSE';
    case 'DEFENSIVE_MIDFIELDER':
    case 'MIDFIELDER':
    case 'RIGHT_MIDFIELDER':
    case 'LEFT_MIDFIELDER':
    case 'CENTRAL_MIDFIELDER':
    case 'PLAYMAKER':
    case 'RIGHT_WINGER_FUTSAL':
    case 'LEFT_WINGER_FUTSAL':
      return 'MIDFIELD';
    case 'ATTACKER':
    case 'RIGHT_WINGER':
    case 'LEFT_WINGER':
    case 'CENTER_FORWARD':
    case 'PIVOT':
      return 'ATTACK';
    default:
      return 'OTHER';
  }
}

export function calculateTeamLineStrengths(
  assignments: ScoredAssignment[],
  modality: TeamStrengthModality,
): TeamLineStrengths {
  const values: Record<Exclude<TeamStrengthLine, 'OTHER'>, number[]> = {
    DEFENSE: [],
    MIDFIELD: [],
    ATTACK: [],
  };
  const players: Record<Exclude<TeamStrengthLine, 'OTHER'>, number> = {
    DEFENSE: 0,
    MIDFIELD: 0,
    ATTACK: 0,
  };

  for (const assignment of assignments) {
    const line = teamStrengthLineForRole(assignment.assignedRole);
    if (line === 'OTHER') continue;

    players[line] += 1;
    if (assignment.overallUsed != null) {
      values[line].push(assignment.overallUsed);
    }
  }

  return {
    defense: effectiveStrength(values.DEFENSE, players.DEFENSE, LINE_CAPACITY[modality].DEFENSE),
    midfield: effectiveStrength(values.MIDFIELD, players.MIDFIELD, LINE_CAPACITY[modality].MIDFIELD),
    attack: effectiveStrength(values.ATTACK, players.ATTACK, LINE_CAPACITY[modality].ATTACK),
  };
}

export function calculateTeamStrength(
  assignments: ScoredAssignment[],
  modality: TeamStrengthModality,
): number | null {
  const scoredValues = assignments
    .map((assignment) => assignment.overallUsed)
    .filter((value): value is number => value != null);

  if (!assignments.length) return null;
  if (!scoredValues.length) return null;

  const average = scoredValues.reduce((sum, value) => sum + value, 0) / scoredValues.length;
  const coverage = Math.min(assignments.length / TEAM_CAPACITY[modality], 1);

  return Math.round(average * coverage);
}

function effectiveStrength(
  scoredValues: number[],
  playerCount: number,
  expectedPlayers: number,
): number | null {
  if (playerCount === 0) return 0;
  if (!scoredValues.length) return null;

  const average = scoredValues.reduce((sum, value) => sum + value, 0) / scoredValues.length;
  const coverage = Math.min(playerCount / expectedPlayers, 1);

  return Math.round(average * coverage);
}
