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
  | "ok"
  | "back"
  | "start"
  | "coin";

export interface ControlZone {
  id: string;
  label: string;
  action: ControlAction;
  area: "left" | "center" | "right" | "up" | "down";
}

export interface ControlButton {
  id: string;
  label: string;
  action: ControlAction;
  tone: "primary" | "secondary" | "danger";
}

export interface SwipeControls {
  up: ControlAction;
  down: ControlAction;
}

export interface ControllerProfile {
  id: ControllerProfileId;
  label: string;
  hint: string;
  zonePlacement: "stage" | "bottom";
  zones: ControlZone[];
  buttons: ControlButton[];
  swipe?: SwipeControls;
}

export interface KeyboardControlHint {
  id: string;
  keys: string[];
  label: string;
}

export const CONTROL_PROFILES: Record<ControllerProfileId, ControllerProfile> = {
  platformJump: {
    id: "platformJump",
    label: "3분할 점프",
    hint: "좌/우 홀드 · 가운데 점프 · 위/아래 스와이프",
    zonePlacement: "bottom",
    zones: [
      { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
      { id: "zone-jump", label: "점프", action: "jump", area: "center" },
      { id: "zone-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [],
    swipe: {
      down: "down",
      up: "up"
    }
  },
  platformFire: {
    id: "platformFire",
    label: "이동 + 점프/공격",
    hint: "좌/우 이동 · 점프/공격",
    zonePlacement: "stage",
    zones: [
      { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
      { id: "zone-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [
      { id: "button-jump", label: "점프", action: "jump", tone: "secondary" },
      { id: "button-attack", label: "공격", action: "attack", tone: "primary" }
    ]
  },
  puzzleShoot: {
    id: "puzzleShoot",
    label: "팡 전용",
    hint: "좌/우 이동 · 발사/와이어",
    zonePlacement: "stage",
    zones: [
      { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
      { id: "zone-fire", label: "발사", action: "fire", area: "center" },
      { id: "zone-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [
      { id: "button-fire", label: "발사", action: "fire", tone: "primary" },
      { id: "button-wire", label: "와이어", action: "wire", tone: "secondary" }
    ]
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
    ? profile.buttons.map((button) => ({ action: button.action, id: button.id, label: button.label }))
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
  if (action === "attack" || action === "wire") {
    return ["X"];
  }

  if (action === "special") {
    return ["C"];
  }

  return ["Space", "Z"];
}
