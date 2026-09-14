export type PlayerPosition = 'DEFENDER' | 'MIDFIELDER' | 'WINGER' | 'STRIKER';
export type DominantFoot = 'RIGHT' | 'LEFT' | 'BOTH';

export const PLAYER_POSITION_OPTIONS: ReadonlyArray<{
  value: PlayerPosition;
  label: string;
}> = [
  { value: 'DEFENDER', label: 'Zagueiro' },
  { value: 'MIDFIELDER', label: 'Meio-campo' },
  { value: 'WINGER', label: 'Ponta' },
  { value: 'STRIKER', label: 'Atacante' },
];

export const DOMINANT_FOOT_OPTIONS: ReadonlyArray<{
  value: DominantFoot;
  label: string;
}> = [
  { value: 'RIGHT', label: 'Direito' },
  { value: 'LEFT', label: 'Esquerdo' },
  { value: 'BOTH', label: 'Ambos' },
];

export const TECHNICAL_LEVEL_OPTIONS = [
  { value: 1, label: 'Iniciante' },
  { value: 2, label: 'Básico' },
  { value: 3, label: 'Intermediário' },
  { value: 4, label: 'Avançado' },
  { value: 5, label: 'Destaque' },
] as const;

export function togglePlayerPosition(
  positions: PlayerPosition[],
  position: PlayerPosition,
) {
  return positions.includes(position)
    ? positions.filter((item) => item !== position)
    : [...positions, position];
}

export function getSportsProfileValidationError(
  positions: PlayerPosition[],
  canPlayGoalkeeper: boolean,
  dominantFoot: DominantFoot | null,
) {
  if (!positions.length && !canPlayGoalkeeper) {
    return 'Escolha ao menos uma posição de linha ou marque que joga como goleiro.';
  }
  if (!dominantFoot) {
    return 'Escolha seu pé dominante.';
  }
  return null;
}

export function formatPlayingRoles(
  positions: PlayerPosition[] | null | undefined,
  canPlayGoalkeeper: boolean | null | undefined,
) {
  const labels = (positions ?? []).map((position) => (
    PLAYER_POSITION_OPTIONS.find((option) => option.value === position)?.label ?? position
  ));
  if (canPlayGoalkeeper) labels.push('Goleiro');
  return labels.length ? labels.join(' • ') : 'Perfil esportivo não preenchido';
}

export function formatDominantFoot(dominantFoot: DominantFoot | null | undefined) {
  if (!dominantFoot) return 'Não informado';
  return DOMINANT_FOOT_OPTIONS.find((option) => option.value === dominantFoot)?.label ?? dominantFoot;
}

export function formatTechnicalLevel(technicalLevel: number | null | undefined) {
  if (technicalLevel == null) return 'Ainda não avaliado';
  const option = TECHNICAL_LEVEL_OPTIONS.find((item) => item.value === technicalLevel);
  return option ? `${option.value} — ${option.label}` : `Nível ${technicalLevel}`;
}
