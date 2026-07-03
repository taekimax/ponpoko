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

export interface NativeEmulatorSnapshot {
  state: NativeEmulatorState;
  gameId?: string;
  runtimeName?: string;
  frameCount?: number;
  fps?: number;
  canvasSize?: { width: number; height: number };
  audioState?: "locked" | "suspended" | "running" | "unknown";
  activeInputs: EmulatorInput[];
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
  press(input: EmulatorInput): void;
  release(input: EmulatorInput): void;
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
}

export interface FakeNativeEmulatorInputCall {
  input: EmulatorInput;
  type: "press" | "release";
}

export class FakeNativeEmulator implements NativeEmulator {
  readonly calls: FakeNativeEmulatorCall[] = [];
  readonly inputCalls: FakeNativeEmulatorInputCall[] = [];
  private readonly activeInputs = new Set<EmulatorInput>();
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

  press(input: EmulatorInput): void {
    if (this.activeInputs.has(input)) {
      return;
    }

    this.activeInputs.add(input);
    this.calls.push({ input, method: "press" });
    this.inputCalls.push({ input, type: "press" });
  }

  release(input: EmulatorInput): void {
    if (!this.activeInputs.has(input)) {
      return;
    }

    this.activeInputs.delete(input);
    this.calls.push({ input, method: "release" });
    this.inputCalls.push({ input, type: "release" });
  }

  dispose(): void {
    this.releaseActiveInputs();
    this.state = "disposed";
    this.calls.push({ method: "dispose" });
  }

  getSnapshot(): NativeEmulatorSnapshot {
    return {
      activeInputs: [...this.activeInputs],
      audioState: this.audioState,
      gameId: this.gameId,
      runtimeName: "fake",
      state: this.state,
      timings: {}
    };
  }

  private releaseActiveInputs(): void {
    for (const input of [...this.activeInputs]) {
      this.release(input);
    }
  }
}
