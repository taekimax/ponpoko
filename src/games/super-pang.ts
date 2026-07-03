import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const SUPER_PANG_GAME: GameEntry = {
  id: "spangj",
  titleKo: "슈퍼 팡",
  titleEn: "Super Pang",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "spangj.zip",
  thumbnailFile: "pang.jpg",
  sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=357",
  controllerProfile: "puzzleShoot",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("spangj.zip"),
  startupAssist: ["coin", "start"]
};
