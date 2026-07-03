import { describe, expect, it } from "vitest";
import { formatBootDebugLines, isBootDebugEnabled, type BootDebugState } from "../src/boot-debug";

describe("boot debug diagnostics", () => {
  it("only enables the debug panel when the bootDebug query parameter is set", () => {
    expect(isBootDebugEnabled("?bootDebug=1")).toBe(true);
    expect(isBootDebugEnabled("?foo=1&bootDebug=true")).toBe(true);
    expect(isBootDebugEnabled("?bootDebug=0")).toBe(false);
    expect(isBootDebugEnabled("")).toBe(false);
  });

  it("formats runtime and input state for real-device Safari diagnosis", () => {
    const state: BootDebugState = {
      core: "mame2003_plus",
      failed: false,
      frame: 1528,
      inputLog: [
        { input: 6, pressed: 1 },
        { input: 6, pressed: 0 }
      ],
      loadStateUrl: "/ponpoko/states/ponpoko-start.state?v=20260701",
      overlayVisible: false,
      paused: false,
      resources: {
        coreDataRequests: 1,
        romRequests: 1,
        stateRequests: 1
      },
      runtimePrep: "controls-enabled",
      started: true,
      status: "플레이 중",
      touchLog: [
        { action: "left", type: "down" },
        { action: "left", type: "up" }
      ],
      touchZones: {
        count: 3,
        enabled: true,
        surface: "bottom",
        visible: false
      },
      videoHeight: 224,
      videoWidth: 288
    };

    expect(formatBootDebugLines(state)).toEqual([
      "status=플레이 중",
      "frame=1528 started=true paused=false failed=false",
      "core=mame2003_plus video=288x224",
      "state=/ponpoko/states/ponpoko-start.state?v=20260701",
      "resources=rom:1 state:1 coreData:1",
      "prep=controls-enabled",
      "overlay=false",
      "touchZones=3 enabled=true visible=false surface=bottom",
      "touches=left:down left:up",
      "inputs=6:1 6:0"
    ]);
  });
});
