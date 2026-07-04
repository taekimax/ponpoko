import type { ControllerProfileId, GameEntry } from "./catalog";

export type ControlAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
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

export interface ControlZone {
  id: string;
  label: string;
  action: ControlAction;
  area: "left" | "right" | "up" | "down";
}

export interface ControlButton {
  id: string;
  inactive?: boolean;
  label: string;
  action: ControlAction;
  tone: "primary" | "secondary" | "danger";
}

export interface ControllerProfile {
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

const UNIVERSAL_DPAD_ZONES: ControlZone[] = [
  { id: "stick-up", label: "위", action: "up", area: "up" },
  { id: "stick-right", label: "오른쪽", action: "right", area: "right" },
  { id: "stick-down", label: "아래", action: "down", area: "down" },
  { id: "stick-left", label: "왼쪽", action: "left", area: "left" }
];

const BUTTON_TONES: ControlButton["tone"][] = ["primary", "secondary", "danger", "primary", "secondary", "danger"];
const BUTTON_ACTIONS: ControlAction[] = ["button1", "button2", "button3", "button4", "button5", "button6"];

function createUniversalButtons(buttons: Array<Partial<ControlButton> & Pick<ControlButton, "label">>): ControlButton[] {
  return BUTTON_ACTIONS.map((defaultAction, index) => ({
    action: buttons[index]?.action ?? defaultAction,
    id: `button-${index + 1}`,
    inactive: buttons[index]?.inactive ?? false,
    label: buttons[index]?.label ?? "·",
    tone: buttons[index]?.tone ?? BUTTON_TONES[index]
  }));
}

export const CONTROL_PROFILES: Record<ControllerProfileId, ControllerProfile> = {
  platformJump: {
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
    ])
  },
  platformFire: {
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
    ])
  },
  puzzleShoot: {
    id: "puzzleShoot",
    label: "D패드 + 6버튼",
    hint: "왼쪽 D패드 이동 · 오른쪽 발사/와이어",
    zonePlacement: "virtualStick",
    zones: UNIVERSAL_DPAD_ZONES,
    buttons: createUniversalButtons([
      { action: "fire", label: "발사", tone: "primary" },
      { action: "wire", label: "와이어", tone: "secondary" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" },
      { inactive: true, label: "·" }
    ])
  },
  arcadeThreeButton: {
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
    ])
  },
  arcadeSixButton: {
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
    ])
  },
  sfcSixButton: {
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
    ])
  }
};

export function getControllerProfile(game: GameEntry): ControllerProfile {
  return CONTROL_PROFILES[game.controllerProfile];
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

function getKeyboardActionKeys(action: ControlAction): string[] {
  if (action === "button1" || action === "fire" || action === "jump" || action === "action" || action === "rotate") {
    return ["Q"];
  }

  if (action === "button2" || action === "attack" || action === "wire") {
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
