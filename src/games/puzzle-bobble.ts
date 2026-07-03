import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const PUZZLE_BOBBLE_GAME: GameEntry = {
  id: "pbobble",
  titleKo: "퍼즐 보블",
  titleEn: "Puzzle Bobble",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "pbobble.zip",
  thumbnailFile: "pbobble.jpg",
  sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=414",
  controllerProfile: "puzzleShoot",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("pbobble.zip"),
  startupAssist: ["coin", "start"]
};
