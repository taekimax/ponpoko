import type { ControlAction } from "./controllers";

interface KeyBinding {
  key: string;
  code: string;
}

interface EmulatorRuntime {
  gameManager?: {
    simulateInput?: (player: number, input: number, pressed: number) => void;
  };
}

interface DebugInputLogEntry {
  input: number;
  pressed: 0 | 1;
}

declare global {
  interface Window {
    EJS_emulator?: EmulatorRuntime;
    __ponpokoInputLog?: DebugInputLogEntry[];
  }
}

const ACTION_KEYS: Record<ControlAction, KeyBinding> = {
  left: { key: "ArrowLeft", code: "ArrowLeft" },
  right: { key: "ArrowRight", code: "ArrowRight" },
  up: { key: "ArrowUp", code: "ArrowUp" },
  down: { key: "ArrowDown", code: "ArrowDown" },
  jump: { key: "a", code: "KeyA" },
  attack: { key: "s", code: "KeyS" },
  special: { key: "z", code: "KeyZ" },
  action: { key: "a", code: "KeyA" },
  rotate: { key: "a", code: "KeyA" },
  fastDrop: { key: "ArrowDown", code: "ArrowDown" },
  fire: { key: "a", code: "KeyA" },
  wire: { key: "s", code: "KeyS" },
  ok: { key: "Enter", code: "Enter" },
  back: { key: "Escape", code: "Escape" },
  start: { key: "Enter", code: "Enter" },
  coin: { key: "v", code: "KeyV" }
};

const ACTION_INPUTS: Record<ControlAction, number> = {
  left: 6,
  right: 7,
  up: 4,
  down: 5,
  jump: 0,
  attack: 1,
  special: 8,
  action: 0,
  rotate: 0,
  fastDrop: 5,
  fire: 0,
  wire: 1,
  ok: 3,
  back: 2,
  start: 3,
  coin: 2
};

const SUSTAINED_ACTIONS = new Set<ControlAction>(["left", "right"]);
const SUSTAIN_INTERVAL_MS = 120;

export class InputManager {
  private readonly activeCounts = new Map<string, number>();
  private readonly activeInputCounts = new Map<number, number>();
  private readonly sustainTimers = new Map<number, number>();

  press(action: ControlAction): void {
    const binding = ACTION_KEYS[action];
    const inputId = ACTION_INPUTS[action];
    const nextCount = (this.activeCounts.get(binding.code) ?? 0) + 1;
    const nextInputCount = (this.activeInputCounts.get(inputId) ?? 0) + 1;
    this.activeCounts.set(binding.code, nextCount);
    this.activeInputCounts.set(inputId, nextInputCount);

    if (nextCount === 1) {
      this.dispatch("keydown", binding);
    }

    if (nextInputCount === 1) {
      this.simulateInput(inputId, 1);
      if (SUSTAINED_ACTIONS.has(action)) {
        this.startSustain(inputId);
      }
    }
  }

  release(action: ControlAction): void {
    const binding = ACTION_KEYS[action];
    const inputId = ACTION_INPUTS[action];
    const currentCount = this.activeCounts.get(binding.code) ?? 0;
    const currentInputCount = this.activeInputCounts.get(inputId) ?? 0;

    if (currentCount <= 1) {
      this.activeCounts.delete(binding.code);
      this.dispatch("keyup", binding);
    } else {
      this.activeCounts.set(binding.code, currentCount - 1);
    }

    if (currentInputCount <= 1) {
      this.activeInputCounts.delete(inputId);
      this.stopSustain(inputId);
      this.simulateInput(inputId, 0);
    } else {
      this.activeInputCounts.set(inputId, currentInputCount - 1);
    }
  }

  tap(action: ControlAction, durationMs = 80): void {
    this.press(action);
    window.setTimeout(() => this.release(action), durationMs);
  }

  async tapSequence(actions: ControlAction[], durationMs = 90, gapMs = 80): Promise<void> {
    for (const action of actions) {
      this.press(action);
      await delay(durationMs);
      this.release(action);
      await delay(gapMs);
    }
  }

  releaseAll(): void {
    for (const code of [...this.activeCounts.keys()]) {
      const binding = Object.values(ACTION_KEYS).find((candidate) => candidate.code === code);
      if (binding) {
        this.dispatch("keyup", binding);
      }
    }
    this.activeCounts.clear();

    for (const inputId of [...this.activeInputCounts.keys()]) {
      this.stopSustain(inputId);
      this.simulateInput(inputId, 0);
    }
    this.activeInputCounts.clear();
  }

  private dispatch(type: "keydown" | "keyup", binding: KeyBinding): void {
    const event = new KeyboardEvent(type, {
      key: binding.key,
      code: binding.code,
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(event);
    document.dispatchEvent(event);
    document.body.dispatchEvent(event);
  }

  private simulateInput(inputId: number, pressed: 0 | 1): void {
    recordDebugInput(inputId, pressed);
    window.EJS_emulator?.gameManager?.simulateInput?.(0, inputId, pressed);
  }

  private startSustain(inputId: number): void {
    if (this.sustainTimers.has(inputId)) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!this.activeInputCounts.has(inputId)) {
        this.stopSustain(inputId);
        return;
      }

      this.simulateInput(inputId, 1);
    }, SUSTAIN_INTERVAL_MS);

    this.sustainTimers.set(inputId, timer);
  }

  private stopSustain(inputId: number): void {
    const timer = this.sustainTimers.get(inputId);
    if (timer === undefined) {
      return;
    }

    window.clearInterval(timer);
    this.sustainTimers.delete(inputId);
  }
}

function recordDebugInput(input: number, pressed: 0 | 1): void {
  const log = window.__ponpokoInputLog ?? [];
  log.push({ input, pressed });
  window.__ponpokoInputLog = log.slice(-12);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
