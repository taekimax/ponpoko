import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const SUPER_PANG_GAME: GameEntry = {
  id: "spang",
  titleKo: "슈퍼 팡",
  titleEn: "Super Pang!",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "spang.zip",
  romVersion: "acd4dd9b95f6113fd61477824045f0478bf9469dfd41ff6465c4383966812e71",
  thumbnailFile: "spang.jpg",
  sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=357",
  controllerProfile: "puzzleShoot",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("spang.zip"),
  startupAssist: ["coin", "start"]
};
