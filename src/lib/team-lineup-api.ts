import { ApiRequestError } from './api';

export type MatchTeamReserves = {
  matchId: string;
  reserveAssignmentIds: string[];
};

const DEFAULT_API_URL = 'https://onze-organizador-de-pelada.onrender.com';
const REQUEST_TIMEOUT_MS = 60_000;

function apiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  return (configuredUrl || DEFAULT_API_URL).replace(/\/$/, '');
}

async function request<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${apiUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
    if (!response.ok) {
      let payload: { code?: string; message?: string } = {};
      try {
        payload = await response.json() as { code?: string; message?: string };
      } catch {
        // Infrastructure errors may not provide a JSON body.
      }
      throw new ApiRequestError(
        payload.message ?? 'Não foi possível concluir a operação.',
        response.status,
        payload.code,
      );
    }
    return await response.json() as T;
  } catch (exception) {
    if (controller.signal.aborted) {
      throw new Error('O servidor demorou mais que o esperado para responder. Tente novamente.');
    }
    throw exception;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getMatchTeamReserves(accessToken: string, matchId: string) {
  return request<MatchTeamReserves>(
    accessToken,
    `/api/matches/${matchId}/teams/reserves`,
  );
}

export function autoAssignMatchTeamReserves(accessToken: string, matchId: string) {
  return request<MatchTeamReserves>(
    accessToken,
    `/api/matches/${matchId}/teams/reserves/auto`,
    { method: 'POST' },
  );
}

export function updateMatchTeamReserves(
  accessToken: string,
  matchId: string,
  reserveAssignmentIds: string[],
) {
  return request<MatchTeamReserves>(
    accessToken,
    `/api/matches/${matchId}/teams/reserves`,
    {
      method: 'PUT',
      body: JSON.stringify({ reserveAssignmentIds }),
    },
  );
}
