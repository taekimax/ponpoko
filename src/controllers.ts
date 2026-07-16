import type { ControllerProfileId, GameEntry } from "./catalog";
import type { EmulatorInput } from "./native-emulator";

export type ControlAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
  | "jumpUp"
  | "attack"
  | "special"
  | "action"
  | "rotate"
  | "fastDrop"
  | "fire"
  | "wire"
  | "button1"
  | "button2"
  | "button3"
  | "button4"
  | "button5"
  | "button6"
  | "ok"
  | "back"
  | "start"
  | "coin";

export type DpadAction = Extract<ControlAction, "left" | "right" | "up" | "down">;
export type DpadMode = "fourWay" | "eightWay";

export interface ControlZone {
  id: string;
  label: string;
  action: DpadAction;
  area: "left" | "right" | "up" | "down";
}

export interface ControlButton {
  id: string;
  input: EmulatorInput;
  inactive?: boolean;
  label: string;
  action: ControlAction;
  tone: "primary" | "secondary" | "danger";
}

export interface ControllerProfile {
  dpadMode: DpadMode;
  id: ControllerProfileId;
  label: string;
  hint: string;
  zonePlacement: "stage" | "bottom" | "virtualStick";
  zones: ControlZone[];
  buttons: ControlButton[];
}

export interface KeyboardControlHint {
  id: string;
  keys: string[];
  label: string;
}

export type SpecialControl =
  | {
      id: "coin" | "ok" | "start";
      label: string;
      type: "control";
      action: Extract<ControlAction, "coin" | "ok" | "start">;
    }
  | {
      id: "save";
      label: string;
      type: "saveState";
    }
  | {
      id: "load";
      label: string;
      type: "loadState";
    };

export const SPECIAL_CONTROLS: SpecialControl[] = [
  { action: "coin", id: "coin", label: "동전", type: "control" },
  { action: "start", id: "start", label: "시작", type: "control" },
  { action: "ok", id: "ok", label: "OK", type: "control" },
  { id: "save", label: "저장", type: "saveState" },
  { id: "load", label: "불러오기", type: "loadState" }
];

const UNIVERSAL_DPAD_ZONES: ControlZone[] = [
  { id: "stick-up", label: "위", action: "up", area: "up" },
  { id: "stick-right", label: "오른쪽", action: "right", area: "right" },
  { id: "stick-down", label: "아래", action: "down", area: "down" },
  { id: "stick-left", label: "왼쪽", action: "left", area: "left" }
];

const BUTTON_TONES: ControlButton["tone"][] = ["primary", "secondary", "danger", "primary", "secondary", "danger"];
const BUTTON_ACTIONS: ControlAction[] = ["button1", "button2", "button3", "button4", "button5", "button6"];
const CLASSIC_ARCADE_BUTTON_INPUTS: EmulatorInput[] = ["action1", "action3", "action2", "action4", "action5", "action6"];
const STANDARD_RETROPAD_BUTTON_INPUTS: EmulatorInput[] = ["action1", "action2", "action3", "action4", "action5", "action6"];

function createUniversalButtons(
  buttons: Array<Partial<ControlButton> & Pick<ControlButton, "label">>,
  inputs: EmulatorInput[]
): ControlButton[] {
  return BUTTON_ACTIONS.map((defaultAction, index) => ({
    action: buttons[index]?.action ?? defaultAction,
    id: `button-${index + 1}`,
    input: inputs[index],
    inactive: buttons[index]?.inactive ?? false,
    label: buttons[index]?.label ?? "·",
    tone: buttons[index]?.tone ?? BUTTON_TONES[index]
  }));
}

export const CONTROL_PROFILES: Record<ControllerProfileId, ControllerProfile> = {
  platformJump: {
    dpadMode: "fourWay",
    id: "platformJump",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 점프",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { action: "jump", label: "점프", tone: "primary" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  platformFire: {
    dpadMode: "fourWay",
    id: "platformFire",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 점프/공격",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { action: "jump", label: "점프", tone: "primary" },
      { action: "attack", label: "공격", tone: "secondary" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  bubbleBobble: {
    dpadMode: "fourWay",
    id: "bubbleBobble",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 발사/점프",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { action: "fire", label: "발사", tone: "primary" },
      { action: "jumpUp", label: "점프", tone: "secondary" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  puzzleShoot: {
    dpadMode: "fourWay",
    id: "puzzleShoot",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 발사",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { action: "fire", label: "발사", tone: "primary" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  arcadeTwoButton: {
    dpadMode: "eightWay",
    id: "arcadeTwoButton",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 샷/폭탄",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { label: "샷" },
      { label: "폭탄" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  arcadeThreeButton: {
    dpadMode: "eightWay",
    id: "arcadeThreeButton",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 버튼 3개",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { label: "A" },
      { label: "B" },
      { label: "C" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  arcadeSixButton: {
    dpadMode: "eightWay",
    id: "arcadeSixButton",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 버튼 6개",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { label: "LP" },
      { label: "MP" },
      { label: "HP" },
      { label: "LK" },
      { label: "MK" },
      { label: "HK" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  beatEmUp: {
    dpadMode: "eightWay",
    id: "beatEmUp",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 공격/점프",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { label: "공격" },
      { label: "점프" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ], CLASSIC_ARCADE_BUTTON_INPUTS)
  },
  sfcSixButton: {
    dpadMode: "eightWay",
    id: "sfcSixButton",
    label: "SFC 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 SFC 버튼",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { label: "B" },
      { label: "Y" },
      { label: "A" },
      { label: "X" },
      { label: "L" },
      { label: "R" }
    ], STANDARD_RETROPAD_BUTTON_INPUTS)
  }
};

export function getControllerProfile(game: GameEntry): ControllerProfile {
  return CONTROL_PROFILES[game.controllerProfile];
}

export function resolveDpadActions(mode: DpadMode, deltaX: number, deltaY: number): DpadAction[] {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const magnitude = Math.hypot(deltaX, deltaY);

  if (magnitude < 0.18) {
    return [];
  }

  const horizontal: DpadAction = deltaX >= 0 ? "right" : "left";
  const vertical: DpadAction = deltaY >= 0 ? "down" : "up";

  if (mode === "fourWay") {
    return absX >= absY ? [horizontal] : [vertical];
  }

  const normalizedX = absX / magnitude;
  const normalizedY = absY / magnitude;
  if (normalizedX >= 0.38 && normalizedY >= 0.38) {
    if (deltaX >= 0 && deltaY < 0) {
      return ["up", "right"];
    }
    if (deltaX >= 0 && deltaY >= 0) {
      return ["right", "down"];
    }
    if (deltaX < 0 && deltaY >= 0) {
      return ["down", "left"];
    }
    return ["left", "up"];
  }

  return absX >= absY ? [horizontal] : [vertical];
}

export function getKeyboardControlHints(profile: ControllerProfile): KeyboardControlHint[] {
  return [
    {
      id: "move",
      keys: ["←", "↑", "↓", "→"],
      label: "이동"
    },
    ...getKeyboardActionHints(profile),
    {
      id: "coin",
      keys: ["5"],
      label: "동전"
    },
    {
      id: "ok",
      keys: ["O"],
      label: "OK"
    },
    {
      id: "play",
      keys: ["Enter", "P"],
      label: "플레이"
    }
  ];
}

function getKeyboardActionHints(profile: ControllerProfile): KeyboardControlHint[] {
  const actions = profile.buttons.length > 0
    ? profile.buttons
        .filter((button) => !button.inactive)
        .map((button) => ({ action: button.action, id: button.id, label: button.label }))
    : profile.zones
        .filter((zone) => !["left", "right", "up", "down"].includes(zone.action))
        .map((zone) => ({ action: zone.action, id: zone.id, label: zone.label }));

  return actions.map((action) => ({
    id: action.id,
    keys: getKeyboardActionKeys(action.action),
    label: action.label
  }));
}

export function getKeyboardActionKeys(action: ControlAction): string[] {
  if (action === "up") {
    return ["↑"];
  }

  if (action === "down") {
    return ["↓"];
  }

  if (action === "left") {
    return ["←"];
  }

  if (action === "right") {
    return ["→"];
  }

  if (action === "button1" || action === "fire" || action === "jump" || action === "action" || action === "rotate") {
    return ["Q"];
  }

  if (action === "button2" || action === "attack" || action === "wire" || action === "jumpUp") {
    return ["W"];
  }

  if (action === "button3" || action === "special") {
    return ["E"];
  }

  if (action === "button4") {
    return ["A"];
  }

  if (action === "button5") {
    return ["S"];
  }

  if (action === "button6") {
    return ["D"];
  }

  return ["Q"];
}
