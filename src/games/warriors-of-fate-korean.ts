import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const WARRIORS_OF_FATE_KOREAN_GAME: GameEntry = {
  bootTimeoutSeconds: 300,
  id: "wofj_korean_v1_20",
  titleKo: "천지를 먹다 II 한국어",
  titleEn: "Warriors of Fate Korean v1.20",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "wofj.zip",
  romVersion: "346984d6e6f2f54d11228ab82350e07b82577be0c3c995fd41e12ba40ae9e906",
  thumbnailFile: "wofj.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "arcadeThreeButton",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("wofj.zip"),
  startupAssist: ["coin", "start"]
};
