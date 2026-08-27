export type User = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
};

type MessageResponse = {
  message: string;
};

type ApiError = {
  code?: string;
  message?: string;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const DEFAULT_API_URL = 'https://onze-organizador-de-pelada.onrender.com';
const REQUEST_TIMEOUT_MS = 60_000;

function getApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const value = configuredUrl || DEFAULT_API_URL;
  return value.replace(/\/$/, '');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let payload: ApiError = {};
      try {
        payload = (await response.json()) as ApiError;
      } catch {
        // The API may return no JSON for infrastructure-level errors.
      }
      throw new ApiRequestError(
        payload.message ?? 'Não foi possível concluir a operação.',
        response.status,
        payload.code,
      );
    }

    return (await response.json()) as T;
  } catch (exception) {
    if (controller.signal.aborted) {
      throw new Error('O servidor demorou mais que o esperado para responder. Tente novamente.');
    }
    throw exception;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(displayName: string, email: string, password: string) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ displayName, email, password }),
  });
}

export function requestPasswordReset(email: string) {
  return request<MessageResponse>('/api/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function confirmPasswordReset(email: string, code: string, newPassword: string) {
  return request<MessageResponse>('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export function getCurrentUser(accessToken: string) {
  return request<User>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
