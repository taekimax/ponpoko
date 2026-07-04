import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";
import {
  createNativeEmulator,
  DirectRuntimeUnavailableError,
  type NativeRuntimeAdapter
} from "../src/emulator";
import {
  FakeNativeEmulator,
  type EmulatorInput,
  type NativeEmulatorSnapshot,
  type NativeEmulatorState
} from "../src/native-emulator";

describe("NativeEmulator contract", () => {
  it("keeps lifecycle and generic input state inside the runtime boundary", async () => {
    const emulator = new FakeNativeEmulator();
    const target = { id: "game" } as HTMLElement;

    emulator.attach(target);
    await emulator.load(CATALOG[0], new ArrayBuffer(4));
    await emulator.unlockAudio();
    await emulator.start();
    emulator.press("left");
    emulator.press("action1");
    emulator.pause();
    emulator.reset();
    emulator.dispose();

    expect(emulator.calls.map((call) => call.method)).toEqual([
      "attach",
      "load",
      "unlockAudio",
      "start",
      "press",
      "press",
      "pause",
      "release",
      "release",
      "reset",
      "dispose"
    ]);
    expect(emulator.inputCalls).toEqual([
      { input: "left", type: "press" },
      { input: "action1", type: "press" },
      { input: "left", type: "release" },
      { input: "action1", type: "release" }
    ]);
    expect(emulator.getSnapshot()).toMatchObject({
      activeInputs: [],
      gameId: "ponpoko",
      runtimeName: "fake",
      state: "disposed"
    });
  });

  it("tries the direct Ponpoko adapter with the complete ROM ArrayBuffer before falling back", async () => {
    const direct = new RecordingRuntime("direct-mame2003-plus", new DirectRuntimeUnavailableError("not wired"));
    const fallback = new RecordingRuntime("emulatorjs");
    const emulator = createNativeEmulator({ direct, fallback });
    const target = { textContent: "" } as HTMLElement;
    const rom = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;

    emulator.attach(target);
    await emulator.unlockAudio();
    await emulator.load(CATALOG[0], rom);
    await emulator.start();

    expect(direct.calls).toEqual(["attach", "unlockAudio", "load"]);
    expect(fallback.calls).toEqual(["attach", "unlockAudio", "load", "start"]);
    expect(direct.loads).toEqual([{ gameId: "ponpoko", rom }]);
    expect(fallback.loads).toEqual([{ gameId: "ponpoko", rom }]);
    expect(emulator.getSnapshot()).toMatchObject({
      gameId: "ponpoko",
      runtimeName: "emulatorjs",
      state: "running"
    });
  });
});

class RecordingRuntime implements NativeRuntimeAdapter {
  readonly calls: string[] = [];
  readonly loads: Array<{ gameId: string; rom: Blob | ArrayBuffer }> = [];
  private readonly activeInputs = new Set<EmulatorInput>();
  private gameId: string | undefined;
  private state: NativeEmulatorState = "idle";

  constructor(
    private readonly runtimeName: string,
    private readonly loadError?: Error
  ) {}

  attach(_target: HTMLElement): void {
    this.calls.push("attach");
  }

  async load(game: typeof CATALOG[number], rom: Blob | ArrayBuffer): Promise<void> {
    this.calls.push("load");
    this.gameId = game.id;
    this.loads.push({ gameId: game.id, rom });
    if (this.loadError) {
      throw this.loadError;
    }
    this.state = "ready";
  }

  async unlockAudio(): Promise<void> {
    this.calls.push("unlockAudio");
  }

  async start(): Promise<void> {
    this.calls.push("start");
    this.state = "running";
  }

  pause(): void {
    this.calls.push("pause");
    this.state = "paused";
  }

  reset(): void {
    this.calls.push("reset");
  }

  async saveState(): Promise<Uint8Array | null> {
    this.calls.push("saveState");
    return null;
  }

  async loadState(_state: Uint8Array): Promise<boolean> {
    this.calls.push("loadState");
    return false;
  }

  press(input: EmulatorInput): void {
    this.calls.push(`press:${input}`);
    this.activeInputs.add(input);
  }

  release(input: EmulatorInput): void {
    this.calls.push(`release:${input}`);
    this.activeInputs.delete(input);
  }

  dispose(): void {
    this.calls.push("dispose");
    this.activeInputs.clear();
    this.state = "disposed";
  }

  getSnapshot(): NativeEmulatorSnapshot {
    return {
      activeInputs: [...this.activeInputs],
      gameId: this.gameId,
      runtimeName: this.runtimeName,
      state: this.state,
      timings: {}
    };
  }

  getBootProgressRuntime(): undefined {
    return undefined;
  }

  hasLoaderScript(): boolean {
    return false;
  }

  isInputReady(_minFrame: number): boolean {
    return false;
  }

  async reloadConfiguredState(_stateUrl?: string): Promise<boolean> {
    return false;
  }

  readDebugInfo() {
    return {
      core: "none",
      failed: false,
      frame: 0,
      inputLog: [],
      loadStateUrl: "none",
      paused: false,
      started: false,
      videoHeight: null,
      videoWidth: null
    };
  }

  readResourceDebug() {
    return {
      coreDataRequests: 0,
      romRequests: 0,
      stateRequests: 0
    };
  }

  suppressRuntimeChrome(): void {
    this.calls.push("suppressRuntimeChrome");
  }
}
