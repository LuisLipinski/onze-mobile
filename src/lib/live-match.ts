import type {
  CardEvent,
  FootballMatch,
  LiveMatchState,
  LiveMatchSummary,
} from './api';

export function liveMatchElapsedSeconds(state: LiveMatchState, nowMs = Date.now()) {
  if (!state.startedAt) return 0;
  const startMs = new Date(state.startedAt).getTime();
  const endMs = state.finishedAt ? new Date(state.finishedAt).getTime() : nowMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.min(10_800, Math.max(0, Math.floor((endMs - startMs) / 1000)));
}

export function formatMatchTimer(totalSeconds: number) {
  const normalized = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;
  const minuteSecond = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${minuteSecond}` : minuteSecond;
}

export function livePollDelayMs(unchangedPolls: number) {
  if (unchangedPolls <= 1) return 5_000;
  if (unchangedPolls <= 3) return 8_000;
  return 12_000;
}

export function scheduledHomeMatches(
  matches: FootballMatch[],
  liveMatches: LiveMatchSummary[],
) {
  const liveIds = new Set(liveMatches.map((match) => match.matchId));
  return matches.filter((match) => match.status === 'SCHEDULED' && !liveIds.has(match.id));
}

export function liveSummaryScoreLabel(match: LiveMatchSummary) {
  if (match.scores.length === 2) {
    return `${match.scores[0].score} × ${match.scores[1].score}`;
  }
  return match.scores
    .map((side) => `T${side.sideNumber} ${side.score}`)
    .join('  •  ');
}

export function liveScoreSideLabel(match: FootballMatch, sideNumber: number) {
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
