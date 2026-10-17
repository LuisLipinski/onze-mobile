export type MatchNotificationDestination = {
  pathname: '/match' | '/live-match';
  matchId: string;
} | { pathname: '/groups' };

export function matchNotificationDestination(
  data: Record<string, unknown> | null | undefined,
): MatchNotificationDestination | null {
  if (data?.notificationType === 'GROUP_DELETED' && data.route === '/groups') {
    return { pathname: '/groups' };
  }
  const matchId = data?.matchId;
  if (typeof matchId !== 'string' || !matchId.trim()) return null;
  return {
    pathname: data?.route === '/live-match' ? '/live-match' : '/match',
    matchId,
  };
}
