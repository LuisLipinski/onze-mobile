import {
  beginGlobalLoading,
  withGlobalLoading,
} from './global-loading';
import type { GlobalLoadingOptions } from './global-loading';
import type { DominantFoot, PlayerPosition } from './sports-profile';

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
  | 'SCHEDULE_GAMES'
  | 'EDIT_PLAYER_PROFILES';
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
  primaryPosition: PlayerPosition | null;
  secondaryPosition: PlayerPosition | null;
  positions: PlayerPosition[];
  canPlayGoalkeeper: boolean;
  dominantFoot: DominantFoot | null;
  technicalLevel: number | null;
  sportsProfileComplete: boolean;
};

export type SportsProfile = {
  membershipId: string;
  userId: string;
  displayName: string;
  primaryPosition: PlayerPosition | null;
  secondaryPosition: PlayerPosition | null;
  positions: PlayerPosition[];
  canPlayGoalkeeper: boolean;
  dominantFoot: DominantFoot | null;
  technicalLevel: number | null;
  complete: boolean;
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
export type MatchType = 'INTERNAL' | 'VERSUS_EXTERNAL';
export type MatchModality = 'FIELD' | 'FUT7' | 'FUTSAL';
export type MatchStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type LiveScoreSide = { sideNumber: number; score: number };
export type LiveMatchState = {
  matchId: string;
  status: MatchStatus;
  startedAt: string | null;
  finishedAt: string | null;
  scores: LiveScoreSide[];
  canManage: boolean;
};
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
  primaryPosition: PlayerPosition | null;
  secondaryPosition: PlayerPosition | null;
  canPlayGoalkeeper: boolean;
  isGoalkeeper: boolean;
  paymentExempt: boolean;
  paymentStatus: PaymentStatus | null;
  paymentSettlementStatus: PaymentSettlementStatus | null;
  creditAppliedAmount: number | null;
  remainingPaymentAmount: number | null;
  creditAllocationStatus: CreditAllocationStatus | null;
  paymentDeadlineRemovedAt: string | null;
  replacementRequiredAt: string | null;
  replacementUserId: string | null;
  replacementDisplayName: string | null;
  replacementFilledAt: string | null;
  addedAsReplacementAt: string | null;
  replacementForUserId: string | null;
  settlementAvailable: boolean;
  currentUser: boolean;
};

export type RentalGoalkeeper = {
  id: string;
  displayName: string;
  createdAt: string;
};

export type PlayerSkill =
  | 'PASSING'
  | 'LONG_PASSING'
  | 'CROSSING'
  | 'BALL_CONTROL'
  | 'DRIBBLING'
  | 'FINISHING'
  | 'SPEED'
  | 'AGILITY'
  | 'STRENGTH'
  | 'HEADING'
  | 'TACKLING'
  | 'DEFENSIVE_POSITIONING'
  | 'ATTACKING_POSITIONING'
  | 'VISION'
  | 'GOALKEEPER_REFLEXES'
  | 'GOALKEEPER_POSITIONING'
  | 'GOALKEEPER_RUSHING_OUT';

export type TechnicalOverall = {
  overall: number | null;
  coverage: number;
  reliable: boolean;
  estimated: boolean;
  resolvedPosition: PlayerPosition | null;
  missingEssentialSkills: PlayerSkill[];
};

export type PositionTechnicalOverall = TechnicalOverall & {
  position: PlayerPosition;
};

export type TechnicalProfile = {
  membershipId: string;
  userId: string;
  displayName: string;
  primaryPosition: PlayerPosition | null;
  secondaryPosition: PlayerPosition | null;
  ratings: Partial<Record<PlayerSkill, number>>;
  generalOverall: TechnicalOverall;
  positionOveralls: PositionTechnicalOverall[];
  importantSkills: Partial<Record<PlayerPosition, PlayerSkill[]>>;
  technicalProfileUpdatedAt: string | null;
};

export type TechnicalConfiguration = {
  positionImportantSkills: Record<PlayerPosition, PlayerSkill[]>;
  futsalImportantSkills: Record<string, PlayerSkill[]>;
  minimumRating: number;
  maximumRating: number;
  pointsPerRatingUnit: number;
};

export type MatchGuest = {
  id: string;
  displayName: string;
  primaryPosition: PlayerPosition;
  secondaryPosition: PlayerPosition | null;
  evaluated: boolean | null;
  createdAt: string;
};

export type GuestTechnicalProfile = Omit<TechnicalProfile, 'membershipId' | 'userId'> & {
  guestId: string;
};

export type TeamParticipantType = 'MEMBER' | 'GUEST' | 'RENTAL_GOALKEEPER';
export type ScoreSource = 'REAL' | 'ESTIMATED';
export type TeamPositionOrigin = 'PRIMARY' | 'SECONDARY' | 'ALTERNATIVE' | 'GOALKEEPER' | 'MANUAL';
export type TeamAssignmentReason =
  | 'PRIMARY_POSITION'
  | 'SECONDARY_POSITION'
  | 'BEST_AVAILABLE_POSITION'
  | 'TEAM_BALANCE'
  | 'GOALKEEPER_REQUIRED'
  | 'MANUAL_ADMIN_CHANGE';

export type TeamAssignment = {
  id: string;
  participantType: TeamParticipantType;
  participantId: string;
  displayName: string;
  assignedRole: string;
  overallUsed: number | null;
  coverage: number | null;
  scoreSource: ScoreSource | null;
  positionOrigin: TeamPositionOrigin | null;
  reason: TeamAssignmentReason | null;
  manuallyChanged: boolean;
};

export type GeneratedTeam = {
  teamNumber: number;
  estimatedStrength: number | null;
  realEvaluations: number | null;
  estimatedEvaluations: number | null;
  assignments: TeamAssignment[];
};

export type MatchTeams = {
  matchId: string;
  modality: MatchModality;
  teamCount: number;
  confirmedPlayers: number;
  minimumPlayers: number;
  idealPlayers: number;
  reducedTeams: boolean;
  technicalDetailsVisible: boolean;
  teams: GeneratedTeam[];
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
  matchType: MatchType;
  teamCount: number | null;
  requiredGoalkeepers: number;
  modality: MatchModality;
  minimumPlayers: number;
  idealPlayers: number;
  missingMinimumPlayers: number;
  currentGoalkeepers: number;
  missingGoalkeepers: number;
  goalkeeperDecisionRequired: boolean;
  secondaryGoalkeeperDecisionRequired: boolean;
  paymentRequired: boolean;
  goalkeeperPays: boolean;
  paymentAmount: number | null;
  pixKey: string | null;
  notes: string | null;
  status: MatchStatus;
  startedAt: string | null;
  finishedAt: string | null;
  attendanceOpensAt: string;
  attendanceOpen: boolean;
  signupDeadline: string;
  signupOpen: boolean;
  paymentDeadline: string | null;
  paymentOpen: boolean;
  canReportPayment: boolean;
  canJoin: boolean;
  canWithdraw: boolean;
  myAttendance: AttendanceStatus | null;
  myPaymentStatus: PaymentStatus | null;
  myPaymentSettlementStatus: PaymentSettlementStatus | null;
  myCreditAppliedAmount: number | null;
  myRemainingPaymentAmount: number | null;
  myCreditAllocationStatus: CreditAllocationStatus | null;
  myPaymentDeadlineRemovedAt: string | null;
  goingCount: number;
  notGoingCount: number;
  attendances: MatchAttendance[];
  rentalGoalkeepers: RentalGoalkeeper[];
  guests: MatchGuest[];
  teamsGenerated: boolean;
  canViewTechnical: boolean;
  canManage: boolean;
};

export type CreateMatchInput = {
  date: string;
  startTime: string;
  timeZone: string;
  venue: string;
  maxPlayers: number;
  matchType: MatchType;
  teamCount?: number;
  requiredGoalkeepers: number;
  modality: MatchModality;
  minimumPlayers: number;
  signupDeadlineDate: string;
  signupDeadlineTime: string;
  paymentDeadlineDate?: string;
  paymentDeadlineTime?: string;
  paymentRequired: boolean;
  goalkeeperPays: boolean;
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

type ApiRequestOptions = RequestInit & {
  loading?: GlobalLoadingOptions | false;
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

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    loading = {},
    ...requestOptions
  } = options;
  const finishLoading = loading === false ? null : beginGlobalLoading(loading);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const isMultipart = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;

  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
        ...requestOptions.headers,
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
    finishLoading?.();
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
    loading: {
      title: 'Entrando no Onze...',
      message: 'Estamos validando seu e-mail e sua senha.',
    },
  });
}

export function register(displayName: string, email: string, password: string) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ displayName, email, password }),
    loading: {
      title: 'Criando sua conta...',
      message: 'Estamos preparando seu acesso ao Onze.',
    },
  });
}

export function requestPasswordReset(email: string) {
  return request<MessageResponse>('/api/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
    loading: {
      title: 'Enviando o código...',
      message: 'Estamos preparando as instruções de recuperação.',
    },
  });
}

export function confirmPasswordReset(email: string, code: string, newPassword: string) {
  return request<MessageResponse>('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
    loading: {
      title: 'Atualizando sua senha...',
      message: 'Estamos confirmando o código e protegendo sua conta.',
    },
  });
}

export function getCurrentUser(accessToken: string) {
  return request<User>('/api/auth/me', {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando sua sessão...',
      message: 'Estamos validando seu acesso com o servidor.',
    },
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
    loading: {
      title: 'Criando seu grupo...',
      message: 'Estamos preparando a pelada e seu acesso de administrador.',
    },
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
    loading: {
      title: 'Salvando o grupo...',
      message: 'Estamos atualizando as configurações da pelada.',
    },
  });
}

export function listGroups(accessToken: string) {
  return request<Group[]>('/api/groups', {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando seus grupos...',
      message: 'Estamos buscando as peladas vinculadas à sua conta.',
    },
  });
}

export function listGroupMembers(accessToken: string, groupId: string) {
  return request<GroupMember[]>(`/api/groups/${groupId}/members`, {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando os jogadores...',
      message: 'Estamos atualizando os membros e administradores do grupo.',
    },
  });
}

export function getOwnSportsProfile(accessToken: string, groupId: string) {
  return request<SportsProfile>(`/api/groups/${groupId}/members/me/sports-profile`, {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando seu perfil...',
      message: 'Estamos buscando suas preferências esportivas neste grupo.',
    },
  });
}

export function updateOwnSportsProfile(
  accessToken: string,
  groupId: string,
  profile: {
    primaryPosition: PlayerPosition;
    secondaryPosition?: PlayerPosition;
    canPlayGoalkeeper: boolean;
    dominantFoot: DominantFoot;
  },
) {
  return request<SportsProfile>(`/api/groups/${groupId}/members/me/sports-profile`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify(profile),
    loading: {
      title: 'Salvando seu perfil...',
      message: 'Estamos atualizando suas posições e preferências no grupo.',
    },
  });
}

export function getMemberSportsProfile(
  accessToken: string,
  groupId: string,
  membershipId: string,
) {
  return request<SportsProfile>(`/api/groups/${groupId}/members/${membershipId}/sports-profile`, {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando o perfil...',
      message: 'Estamos buscando os dados esportivos deste jogador.',
    },
  });
}

export function updateMemberSportsProfile(
  accessToken: string,
  groupId: string,
  membershipId: string,
  profile: {
    primaryPosition: PlayerPosition;
    secondaryPosition?: PlayerPosition;
    canPlayGoalkeeper: boolean;
    dominantFoot: DominantFoot;
    technicalLevel?: number;
  },
) {
  return request<SportsProfile>(`/api/groups/${groupId}/members/${membershipId}/sports-profile`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify(profile),
    loading: {
      title: 'Salvando o perfil...',
      message: 'Estamos atualizando o perfil e a avaliação técnica do jogador.',
    },
  });
}

export function getMemberTechnicalProfile(
  accessToken: string,
  groupId: string,
  membershipId: string,
) {
  return request<TechnicalProfile>(
    `/api/groups/${groupId}/members/${membershipId}/technical-profile`,
    {
      headers: authenticatedHeaders(accessToken),
      loading: {
        title: 'Carregando avaliação...',
        message: 'Estamos calculando habilidades, overall e cobertura.',
      },
    },
  );
}

export function updateMemberTechnicalProfile(
  accessToken: string,
  groupId: string,
  membershipId: string,
  ratings: Partial<Record<PlayerSkill, number>>,
) {
  return request<TechnicalProfile>(
    `/api/groups/${groupId}/members/${membershipId}/technical-profile`,
    {
      method: 'PUT',
      headers: authenticatedHeaders(accessToken),
      body: JSON.stringify({ ratings }),
      loading: {
        title: 'Salvando avaliação...',
        message: 'Estamos recalculando os overalls sem preencher habilidades ausentes.',
      },
    },
  );
}

export function getTechnicalConfiguration(accessToken: string) {
  return request<TechnicalConfiguration>('/api/technical/configuration', {
    headers: authenticatedHeaders(accessToken),
    loading: false,
  });
}

export function promoteGroupMember(accessToken: string, groupId: string, membershipId: string) {
  return request<GroupMember>(`/api/groups/${groupId}/members/${membershipId}/promote`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Promovendo administrador...',
      message: 'Estamos atualizando a função deste membro.',
    },
  });
}

export function demoteGroupAdmin(accessToken: string, groupId: string, membershipId: string) {
  return request<GroupMember>(`/api/groups/${groupId}/members/${membershipId}/demote`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Atualizando o administrador...',
      message: 'Estamos aplicando a alteração de função.',
    },
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
    loading: {
      title: 'Salvando permissões...',
      message: 'Estamos atualizando os acessos deste administrador.',
    },
  });
}

export function removeGroupMember(accessToken: string, groupId: string, membershipId: string) {
  return request<void>(`/api/groups/${groupId}/members/${membershipId}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Removendo o jogador...',
      message: 'Estamos atualizando os membros do grupo.',
    },
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
    loading: {
      title: 'Transferindo a administração...',
      message: 'Estamos registrando o novo Administrador Principal.',
    },
  });
}

export function leaveGroup(accessToken: string, groupId: string) {
  return request<void>(`/api/groups/${groupId}/members/me`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Saindo do grupo...',
      message: 'Estamos concluindo sua saída da pelada.',
    },
  });
}

export function createGroupInvite(accessToken: string, groupId: string) {
  return request<GroupInvite>(`/api/groups/${groupId}/invite`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Preparando o convite...',
      message: 'Estamos buscando o link do grupo.',
    },
  });
}

export function regenerateGroupInvite(accessToken: string, groupId: string) {
  return request<GroupInvite>(`/api/groups/${groupId}/invite/regenerate`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Gerando um novo convite...',
      message: 'O convite anterior será substituído assim que concluirmos.',
    },
  });
}

export function joinGroup(accessToken: string, code: string) {
  return request<JoinGroupResponse>('/api/groups/join', {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
    loading: {
      title: 'Entrando no grupo...',
      message: 'Estamos validando o convite e adicionando você à pelada.',
    },
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

  return withGlobalLoading(
    () => new Promise<Group>((resolve, reject) => {
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
    }),
    {
      title: 'Enviando a foto...',
      message: 'Aguarde a confirmação antes de continuar.',
    },
  );
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
    loading: {
      title: match.recurrence === 'WEEKLY' ? 'Criando os jogos semanais...' : 'Marcando o jogo...',
      message: 'Estamos salvando data, local, vagas e prazos.',
    },
  });
}

export function listUpcomingMatches(accessToken: string) {
  return request<FootballMatch[]>('/api/matches/upcoming', {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando os próximos jogos...',
      message: 'Estamos atualizando sua agenda de peladas.',
    },
  });
}

export function listGroupMatches(accessToken: string, groupId: string) {
  return request<FootballMatch[]>(`/api/groups/${groupId}/matches`, {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando os jogos...',
      message: 'Estamos atualizando as partidas deste grupo.',
    },
  });
}

export function listGroupCredits(accessToken: string, groupId: string) {
  return request<PlayerCredit[]>(`/api/groups/${groupId}/credits`, {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando os créditos...',
      message: 'Estamos conferindo os saldos dos jogadores.',
    },
  });
}

export function getMatch(accessToken: string, matchId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}`, {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando o jogo...',
      message: 'Estamos atualizando presença, pagamentos e vagas.',
    },
  });
}

export function startLiveMatch(accessToken: string, matchId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}/live/start`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    loading: { title: 'Iniciando a partida...', message: 'Estamos abrindo o jogo ao vivo.' },
  });
}

export function finishLiveMatch(accessToken: string, matchId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}/live/finish`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    loading: { title: 'Finalizando a partida...', message: 'Estamos salvando o encerramento do jogo.' },
  });
}

export function resetLiveMatch(accessToken: string, matchId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}/live/reset`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    loading: { title: 'Resetando a partida...', message: 'Estamos voltando o jogo para agendado.' },
  });
}

export function getLiveMatch(accessToken: string, matchId: string) {
  return request<LiveMatchState>(`/api/matches/${matchId}/live`, {
    headers: authenticatedHeaders(accessToken),
    loading: false,
  });
}

export function updateLiveMatchScore(
  accessToken: string,
  matchId: string,
  sideNumber: number,
  score: number,
) {
  return request<LiveMatchState>(`/api/matches/${matchId}/live/score`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ sideNumber, score }),
    loading: false,
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
    loading: {
      title: status === 'GOING' ? 'Confirmando sua presença...' : 'Atualizando sua presença...',
      message: status === 'GOING'
        ? 'Estamos reservando sua vaga no jogo.'
        : 'Estamos aplicando as regras de saída e reposição.',
    },
  });
}

export function reportMatchPayment(accessToken: string, matchId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}/payment/reported`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Informando o pagamento...',
      message: 'Estamos avisando o administrador para conferir.',
    },
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
    loading: {
      title: 'Confirmando o pagamento...',
      message: 'Estamos atualizando a situação financeira do jogador.',
    },
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
    loading: {
      title: 'Resolvendo o acerto...',
      message: 'Estamos aplicando a decisão financeira selecionada.',
    },
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
    loading: {
      title: 'Resolvendo os acertos...',
      message: 'Estamos atualizando os jogadores selecionados.',
    },
  });
}

export function addMatchReplacement(
  accessToken: string,
  matchId: string,
  departedUserId: string,
  replacementUserId: string,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/replacements/${departedUserId}`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ replacementUserId }),
    loading: {
      title: 'Adicionando o substituto...',
      message: 'Estamos preenchendo a vaga e liberando o acerto aplicável.',
    },
  });
}

export function updateMatchGoalkeeper(
  accessToken: string,
  matchId: string,
  playerUserId: string,
  isGoalkeeper: boolean,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/goalkeepers/${playerUserId}`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ isGoalkeeper }),
    loading: {
      title: isGoalkeeper ? 'Definindo o goleiro...' : 'Atualizando o goleiro...',
      message: 'Estamos aplicando as regras de presença e pagamento desta partida.',
    },
  });
}

export function addRentalGoalkeeper(
  accessToken: string,
  matchId: string,
  displayName: string,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/rental-goalkeepers`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ displayName: displayName.trim() }),
    loading: {
      title: 'Adicionando goleiro...',
      message: 'Estamos reservando uma vaga para o goleiro de aluguel.',
    },
  });
}

export function removeRentalGoalkeeper(
  accessToken: string,
  matchId: string,
  rentalGoalkeeperId: string,
) {
  return request<FootballMatch>(
    `/api/matches/${matchId}/rental-goalkeepers/${rentalGoalkeeperId}`,
    {
      method: 'DELETE',
      headers: authenticatedHeaders(accessToken),
      loading: {
        title: 'Removendo goleiro...',
        message: 'Estamos liberando a vaga desta partida.',
      },
    },
  );
}

export function updateMatchPlayerConfiguration(
  accessToken: string,
  matchId: string,
  modality: MatchModality,
  minimumPlayers: number,
) {
  return request<FootballMatch>(`/api/matches/${matchId}/player-configuration`, {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ modality, minimumPlayers }),
    loading: {
      title: 'Atualizando a partida...',
      message: 'Estamos salvando modalidade e quantidade mínima de jogadores.',
    },
  });
}

export function addMatchGuest(
  accessToken: string,
  matchId: string,
  guest: {
    displayName: string;
    primaryPosition: PlayerPosition;
    secondaryPosition?: PlayerPosition;
    ratings?: Partial<Record<PlayerSkill, number>>;
  },
) {
  return request<FootballMatch>(`/api/matches/${matchId}/guests`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify(guest),
    loading: {
      title: 'Adicionando convidado...',
      message: 'Estamos reservando a vaga e registrando as informações disponíveis.',
    },
  });
}

export function removeMatchGuest(accessToken: string, matchId: string, guestId: string) {
  return request<FootballMatch>(`/api/matches/${matchId}/guests/${guestId}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Removendo convidado...',
      message: 'Estamos liberando a vaga desta partida.',
    },
  });
}

export function getGuestTechnicalProfile(
  accessToken: string,
  matchId: string,
  guestId: string,
) {
  return request<GuestTechnicalProfile>(
    `/api/matches/${matchId}/guests/${guestId}/technical-profile`,
    { headers: authenticatedHeaders(accessToken) },
  );
}

export function updateGuestTechnicalProfile(
  accessToken: string,
  matchId: string,
  guestId: string,
  ratings: Partial<Record<PlayerSkill, number>>,
) {
  return request<GuestTechnicalProfile>(
    `/api/matches/${matchId}/guests/${guestId}/technical-profile`,
    {
      method: 'PUT',
      headers: authenticatedHeaders(accessToken),
      body: JSON.stringify({ ratings }),
    },
  );
}

export function getMatchTeams(accessToken: string, matchId: string) {
  return request<MatchTeams>(`/api/matches/${matchId}/teams`, {
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Carregando os times...',
      message: 'Estamos atualizando escalações e indicadores.',
    },
  });
}

export function generateMatchTeams(accessToken: string, matchId: string) {
  return request<MatchTeams>(`/api/matches/${matchId}/teams/generate`, {
    method: 'POST',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Formando os times...',
      message: 'Estamos preenchendo funções e equilibrando força e incerteza.',
    },
  });
}

export function updateMatchTeamAssignment(
  accessToken: string,
  matchId: string,
  assignmentId: string,
  teamNumber: number,
  assignedRole: string,
) {
  return request<MatchTeams>(
    `/api/matches/${matchId}/teams/assignments/${assignmentId}`,
    {
      method: 'PUT',
      headers: authenticatedHeaders(accessToken),
      body: JSON.stringify({ teamNumber, assignedRole }),
      loading: {
        title: 'Alterando o time...',
        message: 'Estamos recalculando a força estimada das equipes.',
      },
    },
  );
}

export function cancelMatch(accessToken: string, matchId: string) {
  return request<void>(`/api/matches/${matchId}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Cancelando o jogo...',
      message: 'Estamos atualizando a partida e avisando os jogadores.',
    },
  });
}

export function endMatchSeries(accessToken: string, seriesId: string) {
  return request<void>(`/api/match-series/${seriesId}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
    loading: {
      title: 'Encerrando a série...',
      message: 'Estamos cancelando as próximas ocorrências semanais.',
    },
  });
}

export function registerPushToken(accessToken: string, token: string) {
  return request<void>('/api/devices/push-token', {
    method: 'PUT',
    headers: authenticatedHeaders(accessToken),
    body: JSON.stringify({ token }),
    loading: false,
  });
}

export function unregisterPushToken(accessToken: string, token: string) {
  return request<void>(`/api/devices/push-token?token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: authenticatedHeaders(accessToken),
    loading: false,
  });
}

export function hasGroupPermission(
  membership: Pick<Group, 'role' | 'permissions'> | Pick<GroupMember, 'role' | 'permissions'>,
  permission: GroupAdminPermission,
) {
  return membership.role === 'PRIMARY_ADMIN'
    || (membership.role === 'ADMIN' && (membership.permissions ?? []).includes(permission));
}
