import {
  createMame2003PlusDebugConfig,
  SHARED_EMULATOR_CONFIG,
  type GameEntry
} from "./shared";

export const METAL_SLUG_GAME: GameEntry = {
  id: "mslug",
  titleKo: "메탈 슬러그",
  titleEn: "Metal Slug",
  core: "mame2003_plus",
  rotation: 0,
  romFile: "mslug.zip",
  romVersion: "44fe2003ff1987516738cc89854ee3fe0280f4c38fb29113f2374b78100443b9",
  thumbnailFile: "mslug.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "arcadeThreeButton",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("mslug.zip"),
  startupAssist: ["coin", "start"]
};
