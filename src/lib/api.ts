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
export type GroupAdminPermission =
  | 'ADD_MEMBERS'
  | 'REMOVE_MEMBERS'
  | 'PROMOTE_MEMBERS'
  | 'EDIT_GROUP'
  | 'SCHEDULE_GAMES';
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
  defaultPaymentAmount: number | null;
  defaultPixKey: string | null;
  schedules: GroupSchedule[];
  role: GroupRole;
  permissions: GroupAdminPermission[];
  createdAt: string;
};

export type GroupMember = {
  membershipId: string;
  userId: string;
  displayName: string;
  role: GroupRole;
  permissions: GroupAdminPermission[];
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

export type MatchRecurrence = 'NONE' | 'WEEKLY';
export type MatchStatus = 'SCHEDULED' | 'CANCELLED';
export type AttendanceStatus = 'PENDING' | 'GOING' | 'NOT_GOING';
export type PaymentStatus = 'PENDING' | 'REPORTED' | 'PAID' | 'CANCELLED';
export type CreditAllocationStatus = 'RESERVED' | 'APPLIED';
export type PaymentSettlementStatus =
  | 'REVIEW_REQUIRED'
  | 'PENDING'
  | 'NOT_RECEIVED'
  | 'REFUNDED'
  | 'CREDITED'
  | 'RETAINED';
export type PaymentSettlementResolution = 'NOT_RECEIVED' | 'REFUNDED' | 'CREDITED' | 'RETAINED';

export type MatchAttendance = {
  userId: string;
  displayName: string;
  status: AttendanceStatus;
  paymentStatus: PaymentStatus | null;
  paymentSettlementStatus: PaymentSettlementStatus | null;
  creditAppliedAmount: number | null;
  remainingPaymentAmount: number | null;
  creditAllocationStatus: CreditAllocationStatus | null;
  currentUser: boolean;
};

export type PlayerCredit = {
  userId: string;
  displayName: string;
  availableAmount: number;
  allocatedAmount: number;
  allocationStatus: CreditAllocationStatus | null;
  allocatedMatchId: string | null;
  allocatedMatchStartsAt: string | null;
  currentUser: boolean;
};

export type FootballMatch = {
  id: string;
  groupId: string;
  groupName: string;
  seriesId: string | null;
  recurrence: MatchRecurrence;
  seriesActive: boolean;
  startsAt: string;
  timeZone: string;
  venue: string;
  maxPlayers: number;
  paymentRequired: boolean;
  paymentAmount: number | null;
  pixKey: string | null;
  notes: string | null;
  status: MatchStatus;
  attendanceOpensAt: string;
  attendanceOpen: boolean;
  myAttendance: AttendanceStatus | null;
  myPaymentStatus: PaymentStatus | null;
  myPaymentSettlementStatus: PaymentSettlementStatus | null;
  myCreditAppliedAmount: number | null;
  myRemainingPaymentAmount: number | null;
  myCreditAllocationStatus: CreditAllocationStatus | null;
  goingCount: number;
  notGoingCount: number;
  attendances: MatchAttendance[];
  canManage: boolean;
};

export type CreateMatchInput = {
  date: string;
  startTime: string;
  timeZone: string;
  venue: string;
  maxPlayers: number;
  paymentRequired: boolean;
  paymentAmount?: number;
  pixKey?: string;
  notes?: string;
  recurrence: MatchRecurrence;
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
    defaultPaymentAmount?: number;
    defaultPixKey?: string;
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
      defaultPaymentEnabled: details.defaultPaymentAmount != null && Boolean(details.defaultPixKey),
      defaultPaymentAmount: details.defaultPaymentAmount ?? null,
      defaultPixKey: details.defaultPixKey || null,
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

export function updateGroupAdminPermissions(
  accessToken: string,
  groupId: string,
  membershipId: string,
  permissions: GroupAdminPermission[],
) {
  return request<GroupMember>(`/api/groups/${groupId}/members/${membershipId}/permissions`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ permissions }),
  });
}

export function removeGroupMember(accessToken: string, groupId: string, membershipId: string) {
  return request<void>(`/api/groups/${groupId}/members/${membershipId}`, {
    method: 'DELETE',
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

  return new Promise<Group>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getApiUrl()}/api/groups/${groupId}/photo`);
    xhr.timeout = REQUEST_TIMEOUT_MS;
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    xhr.onload = () => {
      let payload: (ApiError & Partial<Group>) | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as ApiError & Partial<Group>;
      } catch {
        // The API may return no JSON for infrastructure-level errors.
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiRequestError(
          payload?.message ?? 'Não foi possível enviar a foto do grupo.',
          xhr.status,
          payload?.code,
        ));
        return;
      }

      if (!payload) {
        reject(new Error('O servidor não confirmou o envio da foto do grupo.'));
        return;
      }

      resolve(payload as Group);
    };
    xhr.onerror = () => reject(new Error('Não foi possível conectar ao servidor para enviar a foto.'));
    xhr.ontimeout = () => reject(new Error('O envio da foto demorou mais que o esperado. Tente novamente.'));
    xhr.send(form);
  });
}

export function createMatch(
  accessToken: string,
  groupId: string,
  match: CreateMatchInput,
) {
  return request<FootballMatch>(`/api/groups/${groupId}/matches`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({
      ...match,
      notes: match.notes?.trim() || null,
    }),
  });
}

export function listUpcomingMatches(accessToken: string) {
  return request<FootballMatch[]>('/api/matches/upcoming', {
    headers: authenticatedHeaders(accessToken),
  });
}

export function listGroupMatches(accessToken: string, groupId: string) {
  return request<FootballMatch[]>(`/api/groups/${groupId}/matches`, {
    headers: authenticatedHeaders(accessToken),
  });
}

export function listGroupCredits(accessToken: string, groupId: string) {
  return request<PlayerCredit[]>(`/api/groups/${groupId}/credits`, {
    headers: authenticatedHeaders(accessToken),
  });
}

export function getMatch(accessToken: string, matchId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}`, {
    headers: authenticatedHeaders(accessToken),
  });
}

export function updateMatchAttendance(
  accessToken: string,
  matchId: string,
  status: AttendanceStatus,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/attendance`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ status }),
  });
}

export function reportMatchPayment(accessToken: string, matchId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}/payment/reported`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
  });
}

export function confirmMatchPayment(
  accessToken: string,
  matchId: string,
  playerUserId: string,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/payments/${playerUserId}/confirm`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
  });
}

export function resolveMatchPaymentSettlement(
  accessToken: string,
  matchId: string,
  playerUserId: string,
  resolution: PaymentSettlementResolution,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/payments/${playerUserId}/settlement`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ resolution }),
  });
}

export function resolveMatchPaymentSettlements(
  accessToken: string,
  matchId: string,
  playerUserIds: string[],
  resolution: PaymentSettlementResolution,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/payment-settlements`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ playerUserIds, resolution }),
  });
}

export function cancelMatch(accessToken: string, matchId: string) {
  return request<void>(`/api/matches/${matchId}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
  });
}

export function endMatchSeries(accessToken: string, seriesId: string) {
  return request<void>(`/api/match-series/${seriesId}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
  });
}

export function registerPushToken(accessToken: string, token: string) {
  return request<void>('/api/devices/push-token', {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ token }),
  });
}

export function unregisterPushToken(accessToken: string, token: string) {
  return request<void>(`/api/devices/push-token?token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
  });
}

export function hasGroupPermission(
  membership: Pick<Group, 'role' | 'permissions'> | Pick<GroupMember, 'role' | 'permissions'>,
  permission: GroupAdminPermission,
) {
  return membership.role === 'PRIMARY_ADMIN'
    || (membership.role === 'ADMIN' && (membership.permissions ?? []).includes(permission));
}
