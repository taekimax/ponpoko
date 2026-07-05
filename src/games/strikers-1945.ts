import {
  createEmulatorDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const STRIKERS_1945_GAME: GameEntry = {
  id: "s1945",
  titleKo: "스트라이커즈 1945",
  titleEn: "Strikers 1945",
  core: "fbneo",
  rotation: 0,
  romFile: "s1945.zip",
  romVersion: "b59a040b61763b5a1dc83b5e8db368cf778ddfdfd7ce593f0b1b00eb25c69f1d",
  screenOrientation: "vertical",
  thumbnailFile: "s1945.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "arcadeTwoButton",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createEmulatorDebugConfig("fbneo", "s1945.zip"),
  startupAssist: ["coin", "start"]
};
