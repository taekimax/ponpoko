import { describe, expect, it, vi } from "vitest";
import { resolveAutosaveStartDecision, shouldRestoreAutosave } from "../src/autosave-start";
import type { AutosaveRecord } from "../src/state-storage";

const autosave: AutosaveRecord = {
  gameId: "mslug",
  savedAt: 123_456,
  state: new Uint8Array([1, 2, 3]),
  version: 1
};

describe("autosave start decisions", () => {
  it("asks the user before starting when an autosave exists", async () => {
    const loadAutosave = vi.fn(async () => autosave);

    await expect(resolveAutosaveStartDecision("mslug", loadAutosave)).resolves.toEqual({
      autosave,
      kind: "prompt"
    });
    expect(loadAutosave).toHaveBeenCalledWith("mslug");
  });

  it("starts a new game immediately when there is no autosave", async () => {
    const loadAutosave = vi.fn(async () => null);

    await expect(resolveAutosaveStartDecision("spang", loadAutosave)).resolves.toEqual({
      kind: "start",
      mode: { kind: "new" }
    });
  });

  it("restores autosave only when the player chose continue", () => {
    expect(shouldRestoreAutosave({ autosave, kind: "autosave" })).toBe(true);
    expect(shouldRestoreAutosave({ kind: "new" })).toBe(false);
  });
});
