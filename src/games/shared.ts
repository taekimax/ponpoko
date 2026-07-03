import type { ControlAction } from "../controllers";

export type ControllerProfileId =
  | "platformJump"
  | "platformFire"
  | "puzzleShoot";

export type GameId = "ponpoko" | "pbobble" | "pang" | "bublbobl1";

export interface EmulatorJsGameConfig {
  defaultOptions: Record<string, string>;
  forceLegacyCores: boolean;
  loadStateUrl?: string;
}

export interface RuntimeDebugConfig {
  coreDataFragment: string;
  romFragment: string;
  stateFragment?: string;
}

export interface GameEntry {
  id: GameId;
  titleKo: string;
  titleEn: string;
  core: "mame2003_plus";
  rotation: 0;
  romFile: string;
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

export function createMame2003PlusDebugConfig(romFile: string, stateFragment?: string): RuntimeDebugConfig {
  return {
    coreDataFragment: "/emulatorjs/cores/mame2003_plus-legacy-wasm.data",
    romFragment: `/roms/${romFile}`,
    stateFragment
  };
}
