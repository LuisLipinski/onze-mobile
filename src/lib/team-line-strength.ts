export type TeamStrengthLine = 'DEFENSE' | 'MIDFIELD' | 'ATTACK' | 'OTHER';

type ScoredAssignment = {
  assignedRole: string;
  overallUsed: number | null;
};

export type TeamLineStrengths = {
  defense: number | null;
  midfield: number | null;
  attack: number | null;
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
): TeamLineStrengths {
  const values: Record<Exclude<TeamStrengthLine, 'OTHER'>, number[]> = {
    DEFENSE: [],
    MIDFIELD: [],
    ATTACK: [],
  };

  for (const assignment of assignments) {
    if (assignment.overallUsed == null) continue;
    const line = teamStrengthLineForRole(assignment.assignedRole);
    if (line === 'OTHER') continue;
    values[line].push(assignment.overallUsed);
  }

  return {
    defense: average(values.DEFENSE),
    midfield: average(values.MIDFIELD),
    attack: average(values.ATTACK),
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
