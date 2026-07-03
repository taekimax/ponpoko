import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const STREET_FIGHTER_II_CE_GAME: GameEntry = {
  id: "sf2ce",
  titleKo: "스트리트 파이터 II CE",
  titleEn: "Street Fighter II' Champion Edition",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "sf2ce.zip",
  romVersion: "82e5451619c1328e57987dd00be7ac5337361e60a0c48a9e69823ca7b59d15ad",
  thumbnailFile: "sf2ce.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "arcadeSixButton",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("sf2ce.zip"),
  startupAssist: ["coin", "start"]
};
