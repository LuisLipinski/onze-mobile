import { ApiRequestError } from './api';
import {
  DEV_TEST_PLAYER_PRESETS,
  DEV_TEST_SCENARIOS,
  DevTestScenario,
} from './dev-test-data-catalog';
import { withGlobalLoading } from './global-loading';

export {
  DEV_TEST_PLAYER_PRESETS,
  DEV_TEST_SCENARIOS,
};
export type { DevTestScenario };

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
