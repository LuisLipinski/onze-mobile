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

type ApiError = {
  code?: string;
  message?: string;
};

function getApiUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) {
    throw new Error('API do Onze ainda não está configurada neste build.');
  }
  return value.replace(/\/$/, '');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
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
    throw new Error(payload.message ?? 'Não foi possível concluir a operação.');
  }

  return (await response.json()) as T;
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

export function getCurrentUser(accessToken: string) {
  return request<User>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
