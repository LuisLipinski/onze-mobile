import type { FootballMatch, MatchModality } from './api';

const DEFAULT_API_URL = 'https://onze-organizador-de-pelada.onrender.com';
const REQUEST_TIMEOUT_MS = 60_000;

function getApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  return (configuredUrl || DEFAULT_API_URL).replace(/\/$/, '');
}

export async function updateMatchPlayerConfiguration(
  accessToken: string,
  matchId: string,
  modality: MatchModality,
  minimumPlayers: number,
  maxPlayers: number,
): Promise<FootballMatch> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiUrl()}/api/matches/${matchId}/player-configuration`, {
      method: 'PUT',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ modality, minimumPlayers, maxPlayers }),
    });

    if (!response.ok) {
      let message = 'Não foi possível salvar a configuração de jogadores.';
      try {
        const payload = await response.json() as { message?: string };
        if (payload.message) message = payload.message;
      } catch {
        // Infraestrutura pode responder sem JSON.
      }
      throw new Error(message);
    }

    return await response.json() as FootballMatch;
  } catch (exception) {
    if (controller.signal.aborted) {
      throw new Error('O servidor demorou mais que o esperado para responder. Tente novamente.');
    }
    throw exception;
  } finally {
    clearTimeout(timeoutId);
  }
}
