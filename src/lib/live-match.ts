import type { FootballMatch, LiveMatchState } from './api';

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

export function liveScoreSideLabel(match: FootballMatch, sideNumber: number) {
  if (match.matchType === 'VERSUS_EXTERNAL') {
    return sideNumber === 1 ? match.groupName : 'Adversário';
  }
  return `Time ${sideNumber}`;
}
