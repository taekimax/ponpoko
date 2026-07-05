import {
  createEmulatorDebugConfig,
  type EmulatorJsGameConfig,
  type GameEntry
} from "./shared";

const METAL_SLUG_EMULATOR_CONFIG: EmulatorJsGameConfig = {
  defaultOptions: {},
  forceLegacyCores: true,
  parentRomFile: "neogeo.zip",
  parentRomVersion: "bef93f5f254f3dbcc38afe033919f4e22502beca92877fad42a10729f3de1274"
};

export const METAL_SLUG_GAME: GameEntry = {
  id: "mslug",
  titleKo: "메탈 슬러그",
  titleEn: "Metal Slug",
  core: "fbneo",
  rotation: 0,
  romFile: "mslug.zip",
  romVersion: "3ebe7ca4166f956a65ae98d86f9172f8b5d4462efa13723a5ea72fcf59adcbf8",
  thumbnailFile: "mslug.jpg",
  sourcePageUrl: "https://github.com/taekimax/ponpoko",
  controllerProfile: "arcadeThreeButton",
  emulator: METAL_SLUG_EMULATOR_CONFIG,
  runtimeDebug: createEmulatorDebugConfig("fbneo", "mslug.zip"),
  startupAssist: ["coin", "start"]
};
