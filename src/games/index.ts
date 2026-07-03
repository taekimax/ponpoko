import { PONPOKO_GAME } from "./ponpoko";
import { PUZZLE_BOBBLE_GAME } from "./puzzle-bobble";
import { SUPER_PANG_GAME } from "./super-pang";
import type { GameEntry } from "./shared";

export const GAME_CATALOG = [
  PONPOKO_GAME,
  PUZZLE_BOBBLE_GAME,
  SUPER_PANG_GAME
] satisfies GameEntry[];

export type {
  ControllerProfileId,
  EmulatorJsGameConfig,
  GameEntry,
  GameId,
  RuntimeDebugConfig
} from "./shared";
