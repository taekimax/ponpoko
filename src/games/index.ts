import { BUBBLE_BOBBLE_GAME } from "./bubble-bobble";
import { PONPOKO_GAME } from "./ponpoko";
import { PUZZLE_BOBBLE_GAME } from "./puzzle-bobble";
import { SUPER_PANG_GAME } from "./super-pang";
import { SUPER_MARIO_WORLD_SFC_GAME } from "./super-mario-world-sfc";
import { STREET_FIGHTER_II_CE_GAME } from "./street-fighter-ii-ce";
import { WARRIORS_OF_FATE_KOREAN_GAME } from "./warriors-of-fate-korean";
import type { GameEntry } from "./shared";

export const GAME_CATALOG = [
  PONPOKO_GAME,
  PUZZLE_BOBBLE_GAME,
  SUPER_PANG_GAME,
  BUBBLE_BOBBLE_GAME,
  SUPER_MARIO_WORLD_SFC_GAME,
  STREET_FIGHTER_II_CE_GAME,
  WARRIORS_OF_FATE_KOREAN_GAME
] satisfies GameEntry[];

export type {
  ControllerProfileId,
  EmulatorJsGameConfig,
  GameEntry,
  GameId,
  RuntimeDebugConfig
} from "./shared";
