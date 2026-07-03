import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const NSS_SUPER_MARIO_WORLD_GAME: GameEntry = {
  id: "nss_smw",
  titleKo: "슈퍼 마리오 월드",
  titleEn: "Nintendo Super System: Super Mario World",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "nss_smw.zip",
  romVersion: "ebfb7ca0e432e310218986aad5aa697a4c8b5dafc1aefe3b0ad8fe4e09b91404",
  thumbnailFile: "nss_smw.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "arcadeThreeButton",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("nss_smw.zip"),
  startupAssist: ["coin", "start"]
};
