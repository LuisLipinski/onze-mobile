import type { CardEvent, FoulEvent, GoalEvent } from './api';

export type LiveTimelineEvent = (GoalEvent & { kind: 'GOAL' })
  | (CardEvent & { kind: 'CARD' })
  | (FoulEvent & { kind: 'FOUL'; sideNumber: number })
  | (FoulEvent & { kind: 'PENALTY_MISS'; sideNumber: number });

export function penaltyAwardDescription(event: FoulEvent) {
  return `${event.offenderDisplayName} fez pênalti no jogador ${event.victimDisplayName ?? 'adversário'}`;
}

export function penaltyMissDescription(event: FoulEvent) {
  return `${event.takerDisplayName ?? 'O cobrador'} perdeu o pênalti`;
}

export function buildLiveTimelineEvents(goals: GoalEvent[], cards: CardEvent[],
  fouls: FoulEvent[]): LiveTimelineEvent[] {
  const penalties = fouls.filter((event) => event.penalty);
  return [
    ...goals.map((event) => ({ ...event, kind: 'GOAL' as const })),
    ...cards.map((event) => ({ ...event, kind: 'CARD' as const })),
    ...penalties.map((event) => ({ ...event, kind: 'FOUL' as const,
      sideNumber: event.victimSideNumber ?? event.offenderSideNumber })),
    ...penalties.filter((event) => event.scored === false).map((event) => ({
      ...event, kind: 'PENALTY_MISS' as const,
      sideNumber: event.victimSideNumber ?? event.offenderSideNumber,
      elapsedSeconds: event.resolutionElapsedSeconds ?? event.elapsedSeconds,
      periodType: event.resolutionPeriodType ?? event.periodType,
      periodNumber: event.resolutionPeriodNumber ?? event.periodNumber,
      periodElapsedSeconds: event.resolutionPeriodElapsedSeconds ?? event.periodElapsedSeconds,
      createdAt: event.resolvedAt ?? event.createdAt,
    })),
  ].sort((a, b) => b.elapsedSeconds - a.elapsedSeconds
    || b.createdAt.localeCompare(a.createdAt)
    || (b.kind === 'GOAL' || b.kind === 'PENALTY_MISS' ? 1 : 0)
      - (a.kind === 'GOAL' || a.kind === 'PENALTY_MISS' ? 1 : 0));
}
