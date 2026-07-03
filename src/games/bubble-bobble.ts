import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const BUBBLE_BOBBLE_GAME: GameEntry = {
  id: "bublbobl1",
  titleKo: "보글보글",
  titleEn: "Bubble Bobble",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "bublbobl1.zip",
  romVersion: "ce4495598356f1832c76761f9163db6d8b709f0218e9d0869f1e09cca4032e5a",
  thumbnailFile: "bubbobr1.jpg",
  sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=5&sca=arcade",
  controllerProfile: "platformFire",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("bublbobl1.zip"),
  startupAssist: ["coin", "start"]
};
