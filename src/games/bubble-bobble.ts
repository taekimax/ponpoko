import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const BUBBLE_BOBBLE_GAME: GameEntry = {
  id: "bublbobl",
  titleKo: "보글보글",
  titleEn: "Bubble Bobble",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "bublbobl.zip",
  romVersion: "c23a70a5f12e695fec513fee682441accba5ea44a811ff43289ed894ec8ce505",
  thumbnailFile: "bubbobr1.jpg",
  sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=5&sca=arcade",
  controllerProfile: "platformFire",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("bublbobl.zip"),
  startupAssist: ["coin", "start"]
};
