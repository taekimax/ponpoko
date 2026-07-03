import { describe, expect, it } from "vitest";
import { shouldEnableControlsAfterPrepFailure } from "../src/runtime-prep";

describe("runtime prep fallback", () => {
  it("enables controls instead of leaving the boot overlay stuck after active frames are visible", () => {
    expect(shouldEnableControlsAfterPrepFailure({ failed: false, frame: 120, started: true })).toBe(true);
  });

  it("does not enable controls when prep fails before gameplay is active", () => {
    expect(shouldEnableControlsAfterPrepFailure({ failed: false, frame: 0, started: false })).toBe(false);
    expect(shouldEnableControlsAfterPrepFailure({ failed: true, frame: 120, started: true })).toBe(false);
  });
});
