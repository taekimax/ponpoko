import type { GameEntry } from "./catalog";

export type NativeEmulatorState =
  | "idle"
  | "loading-rom"
  | "loading-runtime"
  | "ready"
  | "running"
  | "paused"
  | "failed"
  | "disposed";

export type EmulatorInput =
  | "left"
  | "right"
  | "up"
  | "down"
  | "action1"
  | "action2"
  | "action3"
  | "action4"
  | "action5"
  | "action6"
  | "special1"
  | "special2"
  | "special3"
  | "coin"
  | "start";

export type EmulatorPlayer = 0 | 1;

export interface ActiveEmulatorInput {
  input: EmulatorInput;
  player: EmulatorPlayer;
}

export interface NativeEmulatorSnapshot {
  state: NativeEmulatorState;
  gameId?: string;
  runtimeName?: string;
  frameCount?: number;
  fps?: number;
  canvasSize?: { width: number; height: number };
  audioState?: "locked" | "suspended" | "running" | "unknown";
  activeInputs: ActiveEmulatorInput[];
  timings: Partial<Record<"romFetchMs" | "runtimeLoadMs" | "firstFrameMs", number>>;
  lastError?: { code: string; message: string; cause?: unknown };
}

export interface NativeEmulator {
  attach(target: HTMLElement): void;
  load(game: GameEntry, rom: Blob | ArrayBuffer): Promise<void>;
  unlockAudio(): Promise<void>;
  start(): Promise<void>;
  pause(): void;
  reset(): void;
  saveState(): Promise<Uint8Array | null>;
  loadState(state: Uint8Array): Promise<boolean>;
  press(player: EmulatorPlayer, input: EmulatorInput): void;
  release(player: EmulatorPlayer, input: EmulatorInput): void;
  releasePlayer(player: EmulatorPlayer): void;
  dispose(): void;
  getSnapshot(): NativeEmulatorSnapshot;
}

export interface FakeNativeEmulatorCall {
  method:
    | "attach"
    | "dispose"
    | "load"
    | "pause"
    | "press"
    | "release"
    | "reset"
    | "start"
    | "unlockAudio";
  gameId?: string;
  input?: EmulatorInput;
  player?: EmulatorPlayer;
}

export interface FakeNativeEmulatorInputCall {
  input: EmulatorInput;
  player: EmulatorPlayer;
  type: "press" | "release";
}

type PlayerInputHandler = (
  player: EmulatorPlayer,
  input: EmulatorInput,
  pressed: boolean
) => void;

export class PlayerInputAdapter {
  private readonly activeInputs = new Map<EmulatorPlayer, Set<EmulatorInput>>();

  constructor(private readonly handleInput: PlayerInputHandler = () => {}) {}

  press(player: EmulatorPlayer, input: EmulatorInput): void {
    let playerInputs = this.activeInputs.get(player);
    if (!playerInputs) {
      playerInputs = new Set<EmulatorInput>();
      this.activeInputs.set(player, playerInputs);
    }

    if (playerInputs.has(input)) {
      return;
    }

    playerInputs.add(input);
    this.handleInput(player, input, true);
  }

  release(player: EmulatorPlayer, input: EmulatorInput): void {
    const playerInputs = this.activeInputs.get(player);
    if (!playerInputs?.delete(input)) {
      return;
    }

    if (playerInputs.size === 0) {
      this.activeInputs.delete(player);
    }
    this.handleInput(player, input, false);
  }

  releasePlayer(player: EmulatorPlayer): void {
    const playerInputs = this.activeInputs.get(player);
    if (!playerInputs) {
      return;
    }

    for (const input of [...playerInputs]) {
      this.release(player, input);
    }
  }

  releaseAll(): void {
    for (const player of [...this.activeInputs.keys()]) {
      this.releasePlayer(player);
    }
  }

  getActiveInputs(): ActiveEmulatorInput[] {
    return [...this.activeInputs].flatMap(([player, inputs]) =>
      [...inputs].map((input) => ({ input, player }))
    );
  }
}

export class FakeNativeEmulator implements NativeEmulator {
  readonly calls: FakeNativeEmulatorCall[] = [];
  readonly inputCalls: FakeNativeEmulatorInputCall[] = [];
  private readonly playerInputs = new PlayerInputAdapter((player, input, pressed) => {
    const method = pressed ? "press" : "release";
    this.calls.push({ input, method, player });
    this.inputCalls.push({ input, player, type: method });
  });
  private state: NativeEmulatorState = "idle";
  private gameId: string | undefined;
  private audioState: NativeEmulatorSnapshot["audioState"] = "locked";

  attach(_target: HTMLElement): void {
    this.calls.push({ method: "attach" });
  }

  async load(game: GameEntry, _rom: Blob | ArrayBuffer): Promise<void> {
    this.gameId = game.id;
    this.state = "ready";
    this.calls.push({ gameId: game.id, method: "load" });
  }

  async unlockAudio(): Promise<void> {
    this.audioState = "running";
    this.calls.push({ method: "unlockAudio" });
  }

  async start(): Promise<void> {
    this.state = "running";
    this.calls.push({ method: "start" });
  }

  pause(): void {
    this.calls.push({ method: "pause" });
    this.releaseActiveInputs();
    if (this.state !== "disposed") {
      this.state = "paused";
    }
  }

  reset(): void {
    this.calls.push({ method: "reset" });
    this.releaseActiveInputs();
  }

  async saveState(): Promise<Uint8Array | null> {
    return null;
  }

  async loadState(_state: Uint8Array): Promise<boolean> {
    return false;
  }

  press(player: EmulatorPlayer, input: EmulatorInput): void {
    this.playerInputs.press(player, input);
  }

  release(player: EmulatorPlayer, input: EmulatorInput): void {
    this.playerInputs.release(player, input);
  }

  releasePlayer(player: EmulatorPlayer): void {
    this.playerInputs.releasePlayer(player);
  }

  dispose(): void {
    this.releaseActiveInputs();
    this.state = "disposed";
    this.calls.push({ method: "dispose" });
  }

  getSnapshot(): NativeEmulatorSnapshot {
    return {
      activeInputs: this.playerInputs.getActiveInputs(),
      audioState: this.audioState,
      gameId: this.gameId,
      runtimeName: "fake",
      state: this.state,
      timings: {}
    };
  }

  private releaseActiveInputs(): void {
    this.playerInputs.releaseAll();
  }
}
