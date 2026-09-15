import type {
  PlayerSkill,
  TeamAssignmentReason,
} from './api';

export const PLAYER_SKILL_GROUPS: ReadonlyArray<{
  label: string;
  skills: ReadonlyArray<{ value: PlayerSkill; label: string }>;
}> = [
  {
    label: 'TÉCNICA',
    skills: [
      { value: 'PASSING', label: 'Passe' },
      { value: 'LONG_PASSING', label: 'Lançamento' },
      { value: 'CROSSING', label: 'Cruzamento' },
      { value: 'BALL_CONTROL', label: 'Controle de bola' },
      { value: 'DRIBBLING', label: 'Drible' },
      { value: 'FINISHING', label: 'Finalização' },
      { value: 'VISION', label: 'Visão de jogo' },
    ],
  },
  {
    label: 'FÍSICO E POSICIONAMENTO',
    skills: [
      { value: 'SPEED', label: 'Velocidade' },
      { value: 'AGILITY', label: 'Agilidade' },
      { value: 'STRENGTH', label: 'Força' },
      { value: 'HEADING', label: 'Cabeceio' },
      { value: 'TACKLING', label: 'Dividida/Desarme' },
      { value: 'DEFENSIVE_POSITIONING', label: 'Posicionamento defensivo' },
      { value: 'ATTACKING_POSITIONING', label: 'Posicionamento ofensivo' },
    ],
  },
  {
    label: 'GOLEIRO',
    skills: [
      { value: 'GOALKEEPER_REFLEXES', label: 'Reflexo' },
      { value: 'GOALKEEPER_POSITIONING', label: 'Posicionamento no gol' },
      { value: 'GOALKEEPER_RUSHING_OUT', label: 'Saída do gol' },
    ],
  },
];

export const PLAYER_SKILLS = PLAYER_SKILL_GROUPS.flatMap((group) => group.skills);

export function halfStarsLabel(rating: number | null | undefined) {
  if (rating == null) return 'Não avaliado';
  return `${(rating / 2).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ★ · ${rating * 5}/50`;
}

export function nextHalfStar(rating: number | null | undefined, direction: -1 | 1) {
  if (rating == null) return direction > 0 ? 1 : undefined;
  const next = rating + direction;
  return next >= 1 && next <= 10 ? next : rating;
}

export const TEAM_REASON_LABELS: Record<TeamAssignmentReason, string> = {
  PRIMARY_POSITION: 'Posição principal priorizada.',
  SECONDARY_POSITION: 'Posição secundária utilizada.',
  BEST_AVAILABLE_POSITION: 'Melhor função alternativa disponível para completar a formação.',
  TEAM_BALANCE: 'Função escolhida para melhorar o equilíbrio entre os times.',
  GOALKEEPER_REQUIRED: 'Escalado no gol para atender a quantidade necessária de goleiros.',
  MANUAL_ADMIN_CHANGE: 'Alterado pelo administrador.',
};

export function teamAssignmentReasonText(reason: TeamAssignmentReason | null | undefined) {
  return reason ? TEAM_REASON_LABELS[reason] : 'Informação não disponível.';
}
