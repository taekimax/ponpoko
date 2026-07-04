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
  romVersion: "de703dd6573d84c42fa867ca09605b2ef5182d393f725ee41beadd9112574772",
  thumbnailFile: "mslug.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "arcadeThreeButton",
  emulator: SHARED_EMULATOR_CONFIG,
  runtimeDebug: createMame2003PlusDebugConfig("mslug.zip"),
  startupAssist: ["coin", "start"]
};
