import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const SUPER_PANG_GAME: GameEntry = {
  id: "pang",
  titleKo: "팡",
  titleEn: "Pang",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "pang.zip",
  thumbnailFile: "pang.jpg",
  sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=357",
  controllerProfile: "puzzleShoot",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("pang.zip"),
  startupAssist: ["coin", "start"]
};
