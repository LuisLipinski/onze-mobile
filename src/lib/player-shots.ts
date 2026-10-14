import type { GoalEvent, ShotEvent } from './api';

export type PlayerShotTotals = {
  assignmentId: string;
  name: string;
  shots: number;
  onTarget: number;
};

export function playerShotTotals(
  shotEvents: ShotEvent[], goals: GoalEvent[], sideNumber: number,
): PlayerShotTotals[] {
  const totals = new Map<string, PlayerShotTotals>();
  function add(id: string, name: string, onTarget: boolean) {
    const item = totals.get(id) ?? { assignmentId: id, name, shots: 0, onTarget: 0 };
    item.shots += 1;
    if (onTarget) item.onTarget += 1;
    totals.set(id, item);
  }
  for (const shot of shotEvents) {
    if (shot.sideNumber === sideNumber) {
      add(shot.playerAssignmentId, shot.playerDisplayName, shot.onTarget);
    }
  }
  for (const goal of goals) {
    if (goal.sideNumber === sideNumber && goal.shotRecorded && !goal.ownGoal) {
      add(goal.scorerAssignmentId, goal.scorerDisplayName ?? 'Jogador', true);
    }
  }
  return [...totals.values()].sort((a, b) => b.shots - a.shots || a.name.localeCompare(b.name));
}
