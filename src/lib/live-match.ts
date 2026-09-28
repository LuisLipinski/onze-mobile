import type {
  CardEvent,
  FootballMatch,
  MatchPeriod,
  LiveMatchState,
  LiveMatchStreamEvent,
  LiveMatchSummary,
} from './api';

export function liveMatchElapsedSeconds(state: LiveMatchState, nowMs = Date.now()) {
  if (state.periods?.length) {
    const current = state.periods.find((period) => period.endedAt == null)
      ?? state.periods[state.periods.length - 1];
    return matchPeriodElapsedSeconds(current, nowMs);
  }
  if (!state.startedAt) return 0;
  const startMs = new Date(state.startedAt).getTime();
  const endMs = state.finishedAt ? new Date(state.finishedAt).getTime() : nowMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.min(10_800, Math.max(0, Math.floor((endMs - startMs) / 1000)));
}

export function matchPeriodElapsedSeconds(period: MatchPeriod, nowMs = Date.now()) {
  const startMs = new Date(period.startedAt).getTime();
  const endMs = period.endedAt ? new Date(period.endedAt).getTime() : nowMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

export function activeMatchPeriod(state: LiveMatchState) {
  return state.periods?.find((period) => period.endedAt == null) ?? null;
}

export function periodClock(period: MatchPeriod, nowMs = Date.now()) {
  const elapsedSeconds = matchPeriodElapsedSeconds(period, nowMs);
  const regulationSeconds = period.durationMinutes * 60;
  const addedElapsedSeconds = Math.max(0, elapsedSeconds - regulationSeconds);
  const plannedAddedSeconds = (period.addedTimeMinutes ?? 0) * 60;
  return {
    elapsedSeconds,
    regulationElapsedSeconds: Math.min(elapsedSeconds, regulationSeconds),
    addedElapsedSeconds,
    plannedAddedSeconds,
    regulationFinished: elapsedSeconds >= regulationSeconds,
    canFinish: elapsedSeconds >= regulationSeconds + plannedAddedSeconds,
  };
}

export function periodLabel(period: Pick<MatchPeriod, 'periodType' | 'periodNumber'>) {
  const ordinal = `${period.periodNumber}º`;
  return period.periodType === 'OVERTIME'
    ? `${ordinal} tempo da prorrogação`
    : `${ordinal} tempo`;
}

export function formatMatchTimer(totalSeconds: number) {
  const normalized = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;
  const minuteSecond = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${minuteSecond}` : minuteSecond;
}

export function scheduledHomeMatches(
  matches: FootballMatch[],
  liveMatches: LiveMatchSummary[],
) {
  const liveIds = new Set(liveMatches.map((match) => match.matchId));
  return matches.filter((match) => match.status === 'SCHEDULED' && !liveIds.has(match.id));
}

export function applyLiveMatchSummaryEvent(
  liveMatches: LiveMatchSummary[],
  event: LiveMatchStreamEvent,
) {
  const withoutMatch = liveMatches.filter((match) => match.matchId !== event.matchId);
  if (!event.summary || event.summary.status !== 'IN_PROGRESS') return withoutMatch;
  return [...withoutMatch, event.summary].sort(
    (left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt),
  );
}

export function mergeLiveMatchStreamEvent(
  current: LiveMatchState,
  event: LiveMatchStreamEvent,
) {
  if (!event.liveMatch
      || event.matchId !== current.matchId
      || event.liveMatch.version <= current.version) return current;
  return { ...event.liveMatch, canManage: current.canManage };
}

export function liveSummaryScoreLabel(match: LiveMatchSummary) {
  if (match.scores.length === 2) {
    return `${match.scores[0].score} × ${match.scores[1].score}`;
  }
  return match.scores
    .map((side) => `T${side.sideNumber} ${side.score}`)
    .join('  •  ');
}

export function liveScoreSideLabel(
  match: FootballMatch,
  sideNumber: number,
  customName?: string | null,
) {
  if (customName?.trim()) return customName.trim();
  if (match.matchType === 'VERSUS_EXTERNAL') {
    return sideNumber === 1 ? match.groupName : 'Adversário';
  }
  return `Time ${sideNumber}`;
}

function chronologicalCards(cardEvents: CardEvent[]) {
  return [...cardEvents].sort((a, b) => (
    a.elapsedSeconds - b.elapsedSeconds
      || a.createdAt.localeCompare(b.createdAt)
      || a.id.localeCompare(b.id)
  ));
}

export function sentOffPlayerAssignmentIds(cardEvents: CardEvent[]) {
  const sentOff = new Set<string>();
  const yellowCounts = new Map<string, number>();

  chronologicalCards(cardEvents).forEach((event) => {
    if (event.cardType === 'RED') {
      sentOff.add(event.playerAssignmentId);
      return;
    }
    const count = (yellowCounts.get(event.playerAssignmentId) ?? 0) + 1;
    yellowCounts.set(event.playerAssignmentId, count);
    if (count >= 2) sentOff.add(event.playerAssignmentId);
  });

  return sentOff;
}

export function secondYellowCardEventIds(cardEvents: CardEvent[]) {
  const secondYellowIds = new Set<string>();
  const yellowCounts = new Map<string, number>();

  chronologicalCards(cardEvents).forEach((event) => {
    if (event.cardType !== 'YELLOW') return;
    const count = (yellowCounts.get(event.playerAssignmentId) ?? 0) + 1;
    yellowCounts.set(event.playerAssignmentId, count);
    if (count === 2) secondYellowIds.add(event.id);
  });

  return secondYellowIds;
}
