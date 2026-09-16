import { ApiRequestError } from './api';
import { withGlobalLoading } from './global-loading';

export type MinimumPlayerDecisionStatus = {
  matchId: string;
  confirmedPlayers: number;
  minimumPlayers: number;
  signupDeadline: string;
  paymentDeadline: string | null;
  decisionRequired: boolean;
  belowMinimumApproved: boolean;
};

export type ExtendSignupDeadlineInput = {
  signupDeadlineDate: string;
  signupDeadlineTime: string;
  paymentDeadlineDate?: string;
  paymentDeadlineTime?: string;
};

const DEFAULT_API_URL = 'https://onze-organizador-de-pelada.onrender.com';
const REQUEST_TIMEOUT_MS = 60_000;

function apiUrl() {
  return (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/$/, '');
}

async function decisionRequest<T>(
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
          payload.message ?? 'Não foi possível atualizar a decisão sobre o mínimo de jogadores.',
          response.status,
          payload.code,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('O servidor demorou mais que o esperado para responder. Tente novamente.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }, loadingMessage ? {
    title: 'Atualizando a partida...',
    message: loadingMessage,
  } : {});
}

export function getMinimumPlayerDecisionStatus(token: string, matchId: string) {
  return decisionRequest<MinimumPlayerDecisionStatus>(
    token,
    `/api/matches/${matchId}/minimum-player-decision`,
    { method: 'GET' },
  );
}

export function approveMatchBelowMinimum(token: string, matchId: string) {
  return decisionRequest<MinimumPlayerDecisionStatus>(
    token,
    `/api/matches/${matchId}/minimum-player-decision/approve`,
    { method: 'PUT' },
    'Registrando que esta ocorrência continuará mesmo abaixo do mínimo.',
  );
}

export function extendMatchSignupDeadline(
  token: string,
  matchId: string,
  input: ExtendSignupDeadlineInput,
) {
  return decisionRequest<MinimumPlayerDecisionStatus>(
    token,
    `/api/matches/${matchId}/minimum-player-decision/extend`,
    {
      method: 'PUT',
      body: JSON.stringify({
        signupDeadlineDate: input.signupDeadlineDate,
        signupDeadlineTime: input.signupDeadlineTime,
        paymentDeadlineDate: input.paymentDeadlineDate ?? null,
        paymentDeadlineTime: input.paymentDeadlineTime ?? null,
      }),
    },
    'Salvando os novos prazos desta ocorrência.',
  );
}
