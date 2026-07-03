import type { GameEntry } from "./catalog";
import type { ControlAction } from "./controllers";

const DEFAULT_STARTUP_ASSIST_SEQUENCE: ControlAction[] = ["coin", "start"];

export function getStartupAssistSequence(game: GameEntry): ControlAction[] {
  if (game.id === "ponpoko") {
    return [];
  }

  return DEFAULT_STARTUP_ASSIST_SEQUENCE;
}
