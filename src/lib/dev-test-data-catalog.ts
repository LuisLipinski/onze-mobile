export type DevTestScenario =
  | 'BALANCED'
  | 'ATTACK_VS_DEFENSE'
  | 'UNEVEN'
  | 'SPECIALISTS'
  | 'SECONDARY_POSITIONS'
  | 'GOALKEEPER_PRIORITY';

export const DEV_TEST_PLAYER_PRESETS = [
  { count: 10, label: 'Futsal · 10' },
  { count: 14, label: 'Fut7 · 14' },
  { count: 22, label: 'Campo · 22' },
] as const;

export const DEV_TEST_SCENARIOS: Array<{
  value: DevTestScenario;
  label: string;
  description: string;
}> = [
  {
    value: 'BALANCED',
    label: 'Equilibrado',
    description: 'Notas e posições variadas, sem extremos.',
  },
  {
    value: 'ATTACK_VS_DEFENSE',
    label: 'Ataque × defesa',
    description: 'Alterna jogadores fortes no ataque e fortes na defesa.',
  },
  {
    value: 'UNEVEN',
    label: 'Forças desiguais',
    description: 'Mistura jogadores fortes, médios e fracos para desafiar o balanceamento.',
  },
  {
    value: 'SPECIALISTS',
    label: 'Especialistas',
    description: 'Habilidades da posição muito fortes e complementares mais baixas.',
  },
  {
    value: 'SECONDARY_POSITIONS',
    label: 'Posições secundárias',
    description: 'Adiciona flexibilidade entre defesa, meio e ataque.',
  },
  {
    value: 'GOALKEEPER_PRIORITY',
    label: 'Prioridade de goleiros',
    description: 'Inclui goleiro principal, secundário e candidatos emergenciais.',
  },
];
