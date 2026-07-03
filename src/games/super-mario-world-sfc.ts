import {
  createEmulatorDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const SUPER_MARIO_WORLD_SFC_GAME: GameEntry = {
  id: "snes_smwk",
  titleKo: "슈퍼 마리오 월드 한국어",
  titleEn: "Super Mario World Korean",
  core: "snes9x",
  rotation: 0,
  romFile: "snes_smwk.zip",
  romVersion: "2b2eb0710c393750f660df34eb8af3dd936258eb993530858d85f065f349170d",
  thumbnailFile: "snes_smwk.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "sfcSixButton",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createEmulatorDebugConfig("snes9x", "snes_smwk.zip"),
  startupAssist: []
};
