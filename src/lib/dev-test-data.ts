import { ApiRequestError } from './api';
import { withGlobalLoading } from './global-loading';

export type DevTestScenario =
  | 'BALANCED'
  | 'ATTACK_VS_DEFENSE'
  | 'UNEVEN'
  | 'SPECIALISTS'
  | 'SECONDARY_POSITIONS'
  | 'GOALKEEPER_PRIORITY';

export type DevTestStatus = {
  matchId: string;
  groupId: string;
  testPlayers: number;
  testPlayersGoing: number;
  occupiedSpots: number;
  maxPlayers: number;
  scenarios: DevTestScenario[];
};

export type GenerateTestPlayersResult = {
  created: number;
  reused: number;
  totalTestPlayers: number;
};

export type ApplyTestScenarioResult = {
  scenario: DevTestScenario;
  updatedPlayers: number;
};

export type MatchTestAttendanceResult = {
  added: number;
  alreadyGoing: number;
  removed: number;
  skippedCapacity: number;
  occupiedSpots: number;
  maxPlayers: number;
};

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

const DEFAULT_API_URL = 'https://onze-organizador-de-pelada.onrender.com';
const REQUEST_TIMEOUT_MS = 60_000;

function apiUrl() {
  return (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/$/, '');
}

async function devRequest<T>(
  token: string,
  path: string,
  options: RequestInit = {},
  loadingMessage?: string,
): Promise<T> {
  return withGlobalLoading(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${apiUrl()}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      if (!response.ok) {
        let payload: { code?: string; message?: string } = {};
        try {
          payload = (await response.json()) as typeof payload;
        } catch {
          // Infrastructure-level responses may not contain JSON.
        }
        throw new ApiRequestError(
          payload.message ?? (response.status === 404
            ? 'Ferramentas de teste não estão habilitadas neste ambiente.'
            : 'Não foi possível concluir a operação de teste.'),
          response.status,
          payload.code,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('A operação de teste demorou demais. Tente novamente.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, loadingMessage ? {
    title: 'Preparando teste...',
    message: loadingMessage,
  } : {});
}

export function getDevTestStatus(token: string, matchId: string) {
  return devRequest<DevTestStatus>(token, `/api/dev/test-data/matches/${matchId}`, {
    method: 'GET',
  }, 'Carregando a massa de teste.');
}

export function generateDevTestPlayers(token: string, matchId: string, count: number) {
  return devRequest<GenerateTestPlayersResult>(
    token,
    `/api/dev/test-data/matches/${matchId}/generate`,
    {
      method: 'POST',
      body: JSON.stringify({ count }),
    },
    `Garantindo ${count} jogadores de teste no grupo.`,
  );
}

export function applyDevTestScenario(
  token: string,
  matchId: string,
  scenario: DevTestScenario,
) {
  return devRequest<ApplyTestScenarioResult>(
    token,
    `/api/dev/test-data/matches/${matchId}/scenario`,
    {
      method: 'PUT',
      body: JSON.stringify({ scenario }),
    },
    'Atualizando posições e habilidades dos jogadores de teste.',
  );
}

export function addDevTestPlayersToMatch(token: string, matchId: string) {
  return devRequest<MatchTestAttendanceResult>(
    token,
    `/api/dev/test-data/matches/${matchId}/attendance`,
    { method: 'POST' },
    'Adicionando os jogadores de teste à partida.',
  );
}

export function removeDevTestPlayersFromMatch(token: string, matchId: string) {
  return devRequest<MatchTestAttendanceResult>(
    token,
    `/api/dev/test-data/matches/${matchId}/attendance`,
    { method: 'DELETE' },
    'Removendo os jogadores de teste desta partida.',
  );
}
