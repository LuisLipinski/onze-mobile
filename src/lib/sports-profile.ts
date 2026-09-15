export type PlayerPosition =
  | 'GOALKEEPER'
  | 'DEFENDER'
  | 'RIGHT_DEFENDER'
  | 'LEFT_DEFENDER'
  | 'CENTER_DEFENDER'
  | 'RIGHT_BACK'
  | 'LEFT_BACK'
  | 'DEFENSIVE_MIDFIELDER'
  | 'MIDFIELDER'
  | 'RIGHT_MIDFIELDER'
  | 'LEFT_MIDFIELDER'
  | 'CENTRAL_MIDFIELDER'
  | 'PLAYMAKER'
  | 'ATTACKER'
  | 'RIGHT_WINGER'
  | 'LEFT_WINGER'
  | 'CENTER_FORWARD';

export type DominantFoot = 'RIGHT' | 'LEFT' | 'BOTH';

export type PlayerPositionOption = {
  value: PlayerPosition;
  label: string;
};

export const PLAYER_POSITION_GROUPS: ReadonlyArray<{
  label: string;
  options: ReadonlyArray<PlayerPositionOption>;
}> = [
  {
    label: 'GOLEIRO',
    options: [{ value: 'GOALKEEPER', label: 'Goleiro' }],
  },
  {
    label: 'DEFESA',
    options: [
      { value: 'DEFENDER', label: 'Zagueiro' },
      { value: 'RIGHT_DEFENDER', label: 'Zagueiro direito' },
      { value: 'LEFT_DEFENDER', label: 'Zagueiro esquerdo' },
      { value: 'CENTER_DEFENDER', label: 'Zagueiro central' },
      { value: 'RIGHT_BACK', label: 'Lateral direito' },
      { value: 'LEFT_BACK', label: 'Lateral esquerdo' },
    ],
  },
  {
    label: 'MEIO-CAMPO',
    options: [
      { value: 'DEFENSIVE_MIDFIELDER', label: 'Volante' },
      { value: 'MIDFIELDER', label: 'Meio-campo' },
      { value: 'RIGHT_MIDFIELDER', label: 'Meia direita' },
      { value: 'LEFT_MIDFIELDER', label: 'Meia esquerda' },
      { value: 'CENTRAL_MIDFIELDER', label: 'Meia central' },
      { value: 'PLAYMAKER', label: 'Armador' },
    ],
  },
  {
    label: 'ATAQUE',
    options: [
      { value: 'ATTACKER', label: 'Atacante' },
      { value: 'RIGHT_WINGER', label: 'Ponta direita' },
      { value: 'LEFT_WINGER', label: 'Ponta esquerda' },
      { value: 'CENTER_FORWARD', label: 'Centroavante' },
    ],
  },
];

export const PLAYER_POSITION_OPTIONS = PLAYER_POSITION_GROUPS.flatMap((group) => group.options);

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

export function getSportsProfileValidationError(
  primaryPosition: PlayerPosition | null,
  secondaryPosition: PlayerPosition | null,
  wantsSecondaryPosition: boolean,
  dominantFoot: DominantFoot | null,
) {
  if (!primaryPosition) return 'Escolha sua posição principal.';
  if (wantsSecondaryPosition && !secondaryPosition) return 'Escolha sua segunda posição.';
  if (secondaryPosition === primaryPosition) return 'A segunda posição deve ser diferente da principal.';
  if (!dominantFoot) return 'Escolha seu pé dominante.';
  return null;
}

export function shouldOfferGoalkeeperAvailability(
  primaryPosition: PlayerPosition | null,
  secondaryPosition: PlayerPosition | null,
) {
  return primaryPosition !== 'GOALKEEPER' && secondaryPosition !== 'GOALKEEPER';
}

export function normalizedCanPlayGoalkeeper(
  primaryPosition: PlayerPosition | null,
  secondaryPosition: PlayerPosition | null,
  requestedValue: boolean,
) {
  return shouldOfferGoalkeeperAvailability(primaryPosition, secondaryPosition) && requestedValue;
}

export function positionLabel(position: PlayerPosition | null | undefined) {
  if (!position) return 'Não informada';
  return PLAYER_POSITION_OPTIONS.find((option) => option.value === position)?.label ?? position;
}

export function formatPlayingRoles(
  positions: PlayerPosition[] | null | undefined,
  canPlayGoalkeeper: boolean | null | undefined,
) {
  const labels = (positions ?? []).map(positionLabel);
  if (canPlayGoalkeeper) labels.push('Posso jogar no gol');
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
