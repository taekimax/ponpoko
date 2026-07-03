import type { ControlAction } from "./controllers";
import type { GameEntry } from "./catalog";

export function getStartupAssistSequence(game: GameEntry): ControlAction[] {
  return [...game.startupAssist];
}
