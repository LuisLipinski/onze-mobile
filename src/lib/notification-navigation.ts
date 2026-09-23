export type MatchNotificationDestination = {
  pathname: '/match' | '/live-match';
  matchId: string;
};

export function matchNotificationDestination(
  data: Record<string, unknown> | null | undefined,
): MatchNotificationDestination | null {
  const matchId = data?.matchId;
  if (typeof matchId !== 'string' || !matchId.trim()) return null;
  return {
    pathname: data?.route === '/live-match' ? '/live-match' : '/match',
    matchId,
  };
}
