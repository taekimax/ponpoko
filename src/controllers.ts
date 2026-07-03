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
  zonePlacement: "stage" | "bottom" | "virtualStick";
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
  },
  arcadeThreeButton: {
    id: "arcadeThreeButton",
    label: "가상 스틱 + 3버튼",
    hint: "왼쪽 스틱 이동 · 오른쪽 버튼 3개",
    zonePlacement: "virtualStick",
    zones: [
      { id: "stick-up", label: "위", action: "up", area: "up" },
      { id: "stick-down", label: "아래", action: "down", area: "down" },
      { id: "stick-left", label: "왼쪽", action: "left", area: "left" },
      { id: "stick-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [
      { id: "button-1", label: "A", action: "button1", tone: "primary" },
      { id: "button-2", label: "B", action: "button2", tone: "secondary" },
      { id: "button-3", label: "C", action: "button3", tone: "danger" }
    ]
  },
  arcadeSixButton: {
    id: "arcadeSixButton",
    label: "가상 스틱 + 6버튼",
    hint: "왼쪽 스틱 이동 · 오른쪽 버튼 6개",
    zonePlacement: "virtualStick",
    zones: [
      { id: "stick-up", label: "위", action: "up", area: "up" },
      { id: "stick-down", label: "아래", action: "down", area: "down" },
      { id: "stick-left", label: "왼쪽", action: "left", area: "left" },
      { id: "stick-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [
      { id: "button-1", label: "LP", action: "button1", tone: "primary" },
      { id: "button-2", label: "MP", action: "button2", tone: "secondary" },
      { id: "button-3", label: "HP", action: "button3", tone: "danger" },
      { id: "button-4", label: "LK", action: "button4", tone: "primary" },
      { id: "button-5", label: "MK", action: "button5", tone: "secondary" },
      { id: "button-6", label: "HK", action: "button6", tone: "danger" }
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
