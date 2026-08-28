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

export type GroupRole = 'PRIMARY_ADMIN' | 'ADMIN' | 'MEMBER';
export type GroupDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type GroupSchedule = {
  dayOfWeek: GroupDayOfWeek;
  startTime: string;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  city: string | null;
  mascot: string | null;
  venue: string | null;
  schedules: GroupSchedule[];
  role: GroupRole;
  createdAt: string;
};

export type GroupMember = {
  membershipId: string;
  userId: string;
  displayName: string;
  role: GroupRole;
  currentUser: boolean;
};

export type GroupInvite = {
  groupId: string;
  code: string;
  deepLink: string;
  shareUrl: string;
};

export type JoinGroupResponse = {
  groupId: string;
  groupName: string;
  role: GroupRole;
  alreadyMember: boolean;
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
  const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;

  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
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

    if (response.status === 204) {
      return undefined as T;
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

function authenticatedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
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
    headers: authenticatedHeaders(accessToken),
  });
}

export function createGroup(
  accessToken: string,
  name: string,
  description?: string,
) {
  return request<Group>('/api/groups', {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ name, description: description || null }),
  });
}

export function updateGroupDetails(
  accessToken: string,
  groupId: string,
  details: {
    city?: string;
    mascot?: string;
    venue?: string;
    schedules: GroupSchedule[];
  },
) {
  return request<Group>(`/api/groups/${groupId}/details`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({
      city: details.city || null,
      mascot: details.mascot || null,
      venue: details.venue || null,
      schedules: details.schedules,
    }),
  });
}

export function listGroups(accessToken: string) {
  return request<Group[]>('/api/groups', {
    headers: authenticatedHeaders(accessToken),
  });
}

export function listGroupMembers(accessToken: string, groupId: string) {
  return request<GroupMember[]>(`/api/groups/${groupId}/members`, {
    headers: authenticatedHeaders(accessToken),
  });
}

export function promoteGroupMember(accessToken: string, groupId: string, membershipId: string) {
  return request<GroupMember>(`/api/groups/${groupId}/members/${membershipId}/promote`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
  });
}

export function demoteGroupAdmin(accessToken: string, groupId: string, membershipId: string) {
  return request<GroupMember>(`/api/groups/${groupId}/members/${membershipId}/demote`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
  });
}

export function transferPrimaryAdmin(
  accessToken: string,
  groupId: string,
  replacementMemberId: string,
) {
  return request<GroupMember[]>(`/api/groups/${groupId}/primary-admin`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ replacementMemberId }),
  });
}

export function leaveGroup(accessToken: string, groupId: string) {
  return request<void>(`/api/groups/${groupId}/members/me`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
  });
}

export function createGroupInvite(accessToken: string, groupId: string) {
  return request<GroupInvite>(`/api/groups/${groupId}/invite`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
  });
}

export function regenerateGroupInvite(accessToken: string, groupId: string) {
  return request<GroupInvite>(`/api/groups/${groupId}/invite/regenerate`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
  });
}

export function joinGroup(accessToken: string, code: string) {
  return request<JoinGroupResponse>('/api/groups/join', {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
}

export function uploadGroupPhoto(
  accessToken: string,
  groupId: string,
  photo: { uri: string; fileName?: string | null; mimeType?: string | null },
) {
  const mimeType = photo.mimeType?.startsWith('image/') ? photo.mimeType : 'image/jpeg';
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const fileName = photo.fileName?.trim() || `group-photo.${extension}`;
  const form = new FormData();
  form.append(
    'photo',
    {
      uri: photo.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob,
  );

  return request<Group>(`/api/groups/${groupId}/photo`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    body: form,
  });
}
