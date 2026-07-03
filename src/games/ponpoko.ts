import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const PONPOKO_START_STATE_URL = "/ponpoko/states/ponpoko-start.state?v=20260701";

export const PONPOKO_GAME: GameEntry = {
  id: "ponpoko",
  titleKo: "너구리",
  titleEn: "Ponpoko",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "ponpoko.zip",
  romVersion: "8d77d65d7b0a8594a185e4d2c28aec91cf0cb0ff47ef56108e85e4a52f90024f",
  thumbnailFile: "ponpoko.jpg",
  sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=89",
  controllerProfile: "platformJump",
  emulator: {
    ...SHARED_EMULATOR_CONFIG,
    loadStateUrl: PONPOKO_START_STATE_URL
  },
  runtimeDebug: createMame2003PlusDebugConfig("ponpoko.zip", "/states/ponpoko-start.state"),
  startupAssist: []
};
