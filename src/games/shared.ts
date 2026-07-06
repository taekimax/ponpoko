import type { ControlAction } from "../controllers";

export type ControllerProfileId =
  | "platformJump"
  | "platformFire"
  | "puzzleShoot"
  | "arcadeTwoButton"
  | "arcadeThreeButton"
  | "arcadeSixButton"
  | "sfcSixButton";

export type GameId =
  | "ponpoko"
  | "pbobble"
  | "spang"
  | "bublbobl"
  | "mslug"
  | "s1945"
  | "snes_smwk"
  | "sf2ce"
  | "wofj_korean_v1_20";

export type EmulatorCore = "fbneo" | "mame2003_plus" | "snes9x";

export interface EmulatorJsGameConfig {
  defaultOptions: Record<string, string>;
  forceLegacyCores: boolean;
  loadStateUrl?: string;
  parentRomFile?: string;
  parentRomVersion?: string;
}

export interface RuntimeDebugConfig {
  coreDataFragment: string;
  romFragment: string;
  stateFragment?: string;
}

export interface GameEntry {
  bootTimeoutSeconds?: number;
  id: GameId;
  titleKo: string;
  titleEn: string;
  core: EmulatorCore;
  rotation: 0;
  romFile: string;
  romVersion: string;
  screenOrientation?: "horizontal" | "vertical";
  thumbnailFile: string;
  sourcePageUrl: string;
  controllerProfile: ControllerProfileId;
  emulator: EmulatorJsGameConfig;
  runtimeDebug: RuntimeDebugConfig;
  startupAssist: ControlAction[];
}

const SHARED_DEFAULT_OPTIONS = {
  "mame2003-plus_skip_disclaimer": "enabled",
  "mame2003-plus_skip_warnings": "enabled"
};

export const SHARED_EMULATOR_CONFIG: EmulatorJsGameConfig = {
  defaultOptions: SHARED_DEFAULT_OPTIONS,
  forceLegacyCores: true
};

export function createEmulatorDebugConfig(core: EmulatorCore, romFile: string, stateFragment?: string): RuntimeDebugConfig {
  return {
    coreDataFragment: `/emulatorjs/cores/${core}-legacy-wasm.data`,
    romFragment: `/roms/${romFile}`,
    stateFragment
  };
}

export function createMame2003PlusDebugConfig(romFile: string, stateFragment?: string): RuntimeDebugConfig {
  return createEmulatorDebugConfig("mame2003_plus", romFile, stateFragment);
}
