export interface BootDebugInput {
  input: number;
  pressed: number;
}

export interface BootDebugTouch {
  action: string;
  type: "down" | "move" | "up";
}

export type BootDebugRuntimePrep =
  | "pending"
  | "finalizing"
  | "input-ready"
  | "warning-ack"
  | "state-reloaded"
  | "controls-enabled"
  | "failed";

export interface BootDebugState {
  core: string;
  failed: boolean;
  frame: number;
  inputLog: BootDebugInput[];
  loadStateUrl: string;
  overlayVisible: boolean;
  paused: boolean;
  resources: {
    coreDataRequests: number;
    romRequests: number;
    stateRequests: number;
  };
  runtimePrep: BootDebugRuntimePrep;
  started: boolean;
  status: string;
  touchZones: {
    count: number;
    enabled: boolean;
    surface: "bottom" | "none" | "stage" | "virtual";
    visible: boolean;
  };
  touchLog: BootDebugTouch[];
  videoHeight: number | null;
  videoWidth: number | null;
}

export function isBootDebugEnabled(search: string): boolean {
  const params = new URLSearchParams(search);
  const value = params.get("bootDebug");
  return value === "1" || value === "true";
}

export function formatBootDebugLines(state: BootDebugState): string[] {
  return [
    `status=${state.status}`,
    `frame=${state.frame} started=${state.started} paused=${state.paused} failed=${state.failed}`,
    `core=${state.core} video=${formatVideoSize(state.videoWidth, state.videoHeight)}`,
    `state=${state.loadStateUrl}`,
    `resources=rom:${state.resources.romRequests} state:${state.resources.stateRequests} coreData:${state.resources.coreDataRequests}`,
    `prep=${state.runtimePrep}`,
    `overlay=${state.overlayVisible}`,
    `touchZones=${state.touchZones.count} enabled=${state.touchZones.enabled} visible=${state.touchZones.visible} surface=${state.touchZones.surface}`,
    `touches=${formatTouches(state.touchLog)}`,
    `inputs=${formatInputs(state.inputLog)}`
  ];
}

function formatVideoSize(width: number | null, height: number | null): string {
  if (width === null || height === null) {
    return "unknown";
  }

  return `${width}x${height}`;
}

function formatInputs(inputs: BootDebugInput[]): string {
  if (inputs.length === 0) {
    return "none";
  }

  return inputs.map((input) => `${input.input}:${input.pressed}`).join(" ");
}

function formatTouches(touches: BootDebugTouch[]): string {
  if (touches.length === 0) {
    return "none";
  }

  return touches.map((touch) => `${touch.action}:${touch.type}`).join(" ");
}
