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

export interface ControllerProfile {
  id: ControllerProfileId;
  label: string;
  hint: string;
  zones: ControlZone[];
  buttons: ControlButton[];
}

const dpadZones: ControlZone[] = [
  { id: "zone-up", label: "위", action: "up", area: "up" },
  { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
  { id: "zone-right", label: "오른쪽", action: "right", area: "right" },
  { id: "zone-down", label: "아래", action: "down", area: "down" }
];

export const CONTROL_PROFILES: Record<ControllerProfileId, ControllerProfile> = {
  platformJump: {
    id: "platformJump",
    label: "3분할 점프",
    hint: "왼쪽 화면은 왼쪽 이동, 가운데는 점프, 오른쪽은 오른쪽 이동입니다.",
    zones: [
      { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
      { id: "zone-jump", label: "점프", action: "jump", area: "center" },
      { id: "zone-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: []
  },
  platformFire: {
    id: "platformFire",
    label: "이동 + 점프/공격",
    hint: "좌우 이동은 화면 좌우, 점프와 공격은 하단 버튼입니다.",
    zones: [
      { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
      { id: "zone-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [
      { id: "button-jump", label: "점프", action: "jump", tone: "secondary" },
      { id: "button-attack", label: "공격", action: "attack", tone: "primary" }
    ]
  },
  dpadOneButton: {
    id: "dpadOneButton",
    label: "4방향 + 액션",
    hint: "왼쪽 패드로 이동하고 오른쪽 버튼으로 액션을 사용합니다.",
    zones: dpadZones,
    buttons: [
      { id: "button-action", label: "액션", action: "action", tone: "primary" }
    ]
  },
  tetris: {
    id: "tetris",
    label: "테트리스",
    hint: "좌우로 이동하고, 아래는 빠른 낙하, 회전 버튼을 사용합니다.",
    zones: [
      { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
      { id: "zone-down", label: "아래", action: "down", area: "center" },
      { id: "zone-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [
      { id: "button-rotate", label: "회전", action: "rotate", tone: "primary" },
      { id: "button-drop", label: "빠른 낙하", action: "fastDrop", tone: "secondary" }
    ]
  },
  beatEmUp: {
    id: "beatEmUp",
    label: "벨트스크롤",
    hint: "4방향 이동과 공격, 점프, 특수 버튼을 사용합니다.",
    zones: dpadZones,
    buttons: [
      { id: "button-attack", label: "공격", action: "attack", tone: "primary" },
      { id: "button-jump", label: "점프", action: "jump", tone: "secondary" },
      { id: "button-special", label: "특수", action: "special", tone: "danger" }
    ]
  },
  puzzleAim: {
    id: "puzzleAim",
    label: "조준 + 발사",
    hint: "좌우로 조준하고 발사 버튼을 사용합니다.",
    zones: [
      { id: "zone-left", label: "왼쪽", action: "left", area: "left" },
      { id: "zone-fire", label: "발사", action: "fire", area: "center" },
      { id: "zone-right", label: "오른쪽", action: "right", area: "right" }
    ],
    buttons: [
      { id: "button-fire", label: "발사", action: "fire", tone: "primary" }
    ]
  },
  puzzleShoot: {
    id: "puzzleShoot",
    label: "팡 전용",
    hint: "좌우로 이동하고 발사/와이어 버튼을 사용합니다.",
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
