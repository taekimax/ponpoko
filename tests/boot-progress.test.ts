import { describe, expect, it } from "vitest";
import {
  getBootProgressCopy,
  getBootProgressSnapshot,
  shouldEnableRuntimeControls,
  shouldRequestRuntimePreparation,
  shouldStopBoot
} from "../src/boot-progress";

describe("emulator boot progress", () => {
  const safariFreezeWarning = "처음 실행은 잠시 멈춘 것처럼 보일 수 있습니다.";

  it("warns immediately when MAME core initialization can block iPhone Safari timers", () => {
    const snapshot = getBootProgressSnapshot(
      { hasCanvas: false, hasLoaderScript: true },
      { started: false }
    );

    expect(getBootProgressCopy(snapshot, 0)).toEqual({
      phase: "MAME 코어를 초기화하는 중입니다.",
      detail: `EmulatorJS가 MAME 코어와 ROM 데이터를 준비하고 있습니다. ${safariFreezeWarning}`
    });
  });

  it("keeps reporting elapsed progress when the runtime exists but frame reads are not ready", () => {
    const snapshot = getBootProgressSnapshot(
      { hasCanvas: false, hasLoaderScript: true },
      {
        gameManager: {
          getFrameNum: () => {
            throw new Error("runtime not ready");
          }
        },
        started: false
      }
    );

    expect(snapshot.frame).toBe(0);
    expect(snapshot.hasGameManager).toBe(true);
    expect(getBootProgressCopy(snapshot, 0)).toEqual({
      phase: "게임 런타임을 연결하는 중입니다.",
      detail: `입력/화면/오디오 런타임이 만들어졌고 게임 데이터를 메모리에 배치하고 있습니다. ${safariFreezeWarning}`
    });
  });

  it("stops waiting when EmulatorJS reports failure or no frame appears for too long", () => {
    const failedSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      { failedToStart: true, started: false }
    );
    const longRunningSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      { started: false }
    );
    const activeSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      {
        gameManager: {
          getFrameNum: () => 60
        },
        started: true
      }
    );

    expect(shouldStopBoot(failedSnapshot, 1)).toBe(true);
    expect(shouldStopBoot(longRunningSnapshot, 149)).toBe(false);
    expect(shouldStopBoot(longRunningSnapshot, 150)).toBe(true);
    expect(shouldStopBoot(activeSnapshot, 180)).toBe(false);
  });

  it("caps explicit game boot timeouts at the app-wide 150 second wait", () => {
    const longRunningSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      { started: false }
    );

    expect(shouldStopBoot(longRunningSnapshot, 149, { timeoutSeconds: 180 })).toBe(false);
    expect(shouldStopBoot(longRunningSnapshot, 150, { timeoutSeconds: 180 })).toBe(true);
    expect(shouldStopBoot(longRunningSnapshot, 179, { timeoutSeconds: 180 })).toBe(true);
  });

  it("still allows explicit boot timeouts shorter than 150 seconds", () => {
    const longRunningSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      { started: false }
    );

    expect(shouldStopBoot(longRunningSnapshot, 89, { timeoutSeconds: 90 })).toBe(false);
    expect(shouldStopBoot(longRunningSnapshot, 90, { timeoutSeconds: 90 })).toBe(true);
  });

  it("enables controls when runtime progress is visible even if the start event is missed", () => {
    const earlyWarningSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      {
        gameManager: {
          getFrameNum: () => 4
        },
        started: false
      }
    );
    const activeFrameSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      {
        gameManager: {
          getFrameNum: () => 60
        },
        started: false
      }
    );
    const startedSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      { started: true }
    );
    const waitingSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      { started: false }
    );

    expect(shouldEnableRuntimeControls(earlyWarningSnapshot)).toBe(false);
    expect(shouldEnableRuntimeControls(activeFrameSnapshot)).toBe(true);
    expect(shouldEnableRuntimeControls(startedSnapshot)).toBe(false);
    expect(shouldEnableRuntimeControls(waitingSnapshot)).toBe(false);
  });

  it("requests runtime preparation after the first frame so startup prompts can be acknowledged", () => {
    const firstFrameSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      {
        gameManager: {
          getFrameNum: () => 4
        },
        started: false
      }
    );
    const waitingSnapshot = getBootProgressSnapshot(
      { hasCanvas: true, hasLoaderScript: true },
      { started: false }
    );

    expect(shouldRequestRuntimePreparation(firstFrameSnapshot)).toBe(true);
    expect(shouldRequestRuntimePreparation(waitingSnapshot)).toBe(false);
  });
});
