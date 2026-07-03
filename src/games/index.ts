import { BUBBLE_BOBBLE_GAME } from "./bubble-bobble";
import { PONPOKO_GAME } from "./ponpoko";
import { SUPER_PANG_GAME } from "./super-pang";
import type { GameEntry } from "./shared";

export const GAME_CATALOG = [
  PONPOKO_GAME,
  BUBBLE_BOBBLE_GAME,
  SUPER_PANG_GAME
] satisfies GameEntry[];

export type {
  ControllerProfileId,
  EmulatorJsGameConfig,
  GameEntry,
  GameId,
  RuntimeDebugConfig
} from "./shared";
