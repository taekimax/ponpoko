import type { ControlAction } from "./controllers";
import type { EmulatorInput, NativeEmulator } from "./native-emulator";

interface KeyboardInputBinding {
  code: string;
  input: EmulatorInput;
  key: string;
}

const KEYBOARD_INPUTS: KeyboardInputBinding[] = [
  { code: "ArrowLeft", input: "left", key: "ArrowLeft" },
  { code: "ArrowRight", input: "right", key: "ArrowRight" },
  { code: "ArrowUp", input: "up", key: "ArrowUp" },
  { code: "ArrowDown", input: "down", key: "ArrowDown" },
  { code: "KeyQ", input: "action1", key: "q" },
  { code: "KeyW", input: "action2", key: "w" },
  { code: "KeyE", input: "action3", key: "e" },
  { code: "KeyA", input: "action4", key: "a" },
  { code: "KeyS", input: "action5", key: "s" },
  { code: "KeyD", input: "action6", key: "d" },
  { code: "BracketLeft", input: "special1", key: "[" },
  { code: "BracketRight", input: "special2", key: "]" },
  { code: "Backslash", input: "special3", key: "\\" }
];

const CONTROL_INPUTS: Record<ControlAction, EmulatorInput> = {
  action: "action1",
  attack: "action2",
  back: "coin",
  coin: "coin",
  down: "down",
  fastDrop: "down",
  fire: "action1",
  jump: "action1",
  left: "left",
  ok: "start",
  right: "right",
  rotate: "action1",
  special: "action3",
  start: "start",
  up: "up",
  wire: "action2"
};

const SUSTAINED_INPUTS = new Set<EmulatorInput>(["left", "right"]);
const SUSTAIN_INTERVAL_MS = 120;

export class InputRouter {
  private readonly activeInputCounts = new Map<EmulatorInput, number>();
  private readonly activeKeys = new Map<string, EmulatorInput>();
  private readonly keyboardDisposers: Array<() => void> = [];
  private readonly sustainTimers = new Map<EmulatorInput, ReturnType<typeof setInterval>>();

  constructor(private readonly emulator: NativeEmulator) {}

  attachKeyboard(target: EventTarget = window): () => void {
    const keydown = (event: Event) => this.handleKeyDown(event as KeyboardEvent);
    const keyup = (event: Event) => this.handleKeyUp(event as KeyboardEvent);
    const blur = () => this.releaseAll();

    target.addEventListener("keydown", keydown);
    target.addEventListener("keyup", keyup);
    target.addEventListener("blur", blur);

    const dispose = () => {
      target.removeEventListener("keydown", keydown);
      target.removeEventListener("keyup", keyup);
      target.removeEventListener("blur", blur);
    };
    this.keyboardDisposers.push(dispose);
    return dispose;
  }

  pressControl(action: ControlAction): void {
    this.press(CONTROL_INPUTS[action]);
  }

  releaseControl(action: ControlAction): void {
    this.release(CONTROL_INPUTS[action]);
  }

  press(input: EmulatorInput): void {
    const nextCount = (this.activeInputCounts.get(input) ?? 0) + 1;
    this.activeInputCounts.set(input, nextCount);

    if (nextCount === 1) {
      this.emulator.press(input);
      this.startSustain(input);
    }
  }

  release(input: EmulatorInput): void {
    const currentCount = this.activeInputCounts.get(input) ?? 0;

    if (currentCount <= 1) {
      this.activeInputCounts.delete(input);
      this.stopSustain(input);
      this.emulator.release(input);
    } else {
      this.activeInputCounts.set(input, currentCount - 1);
    }
  }

  tapControl(action: ControlAction, durationMs = 80): void {
    this.pressControl(action);
    globalThis.setTimeout(() => this.releaseControl(action), durationMs);
  }

  async tapControlSequence(actions: ControlAction[], durationMs = 90, gapMs = 80): Promise<void> {
    for (const action of actions) {
      this.pressControl(action);
      await delay(durationMs);
      this.releaseControl(action);
      await delay(gapMs);
    }
  }

  releaseAll(): void {
    this.activeKeys.clear();
    for (const input of [...this.activeInputCounts.keys()]) {
      this.stopSustain(input);
      this.emulator.release(input);
    }
    this.activeInputCounts.clear();
  }

  dispose(): void {
    for (const dispose of this.keyboardDisposers.splice(0)) {
      dispose();
    }
    this.releaseAll();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const input = getKeyboardInput(event);
    if (!input) {
      return;
    }

    event.preventDefault();
    const keyId = getKeyboardEventId(event);
    if (event.repeat || this.activeKeys.has(keyId)) {
      return;
    }

    this.activeKeys.set(keyId, input);
    this.press(input);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const keyId = getKeyboardEventId(event);
    const input = this.activeKeys.get(keyId);
    if (!input) {
      return;
    }

    event.preventDefault();
    this.activeKeys.delete(keyId);
    this.release(input);
  }

  private startSustain(input: EmulatorInput): void {
    if (!SUSTAINED_INPUTS.has(input) || this.sustainTimers.has(input)) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      if (!this.activeInputCounts.has(input)) {
        this.stopSustain(input);
        return;
      }

      this.emulator.press(input);
    }, SUSTAIN_INTERVAL_MS);

    this.sustainTimers.set(input, timer);
  }

  private stopSustain(input: EmulatorInput): void {
    const timer = this.sustainTimers.get(input);
    if (timer === undefined) {
      return;
    }

    globalThis.clearInterval(timer);
    this.sustainTimers.delete(input);
  }
}

function getKeyboardInput(event: KeyboardEvent): EmulatorInput | null {
  const code = event.code;
  const key = event.key.toLowerCase();
  const binding = KEYBOARD_INPUTS.find((candidate) => candidate.code === code || candidate.key === key);
  return binding?.input ?? null;
}

function getKeyboardEventId(event: KeyboardEvent): string {
  return event.code || event.key.toLowerCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
