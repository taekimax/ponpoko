export interface BootProgressElements {
  hasCanvas: boolean;
  hasLoaderScript: boolean;
}

export interface BootProgressRuntime {
  failedToStart?: boolean;
  gameManager?: {
    getFrameNum?: () => number;
  };
  started?: boolean;
}

export interface BootProgressSnapshot {
  failed: boolean;
  frame: number;
  hasCanvas: boolean;
  hasEmulator: boolean;
  hasGameManager: boolean;
  hasLoaderScript: boolean;
  started: boolean;
}

const IPHONE_SAFARI_BLOCKING_WARNING =
  "처음 실행은 잠시 멈춘 것처럼 보일 수 있습니다.";
const BOOT_TIMEOUT_SECONDS = 120;
const ACTIVE_GAMEPLAY_FRAME_THRESHOLD = 60;

export interface BootProgressOptions {
  timeoutSeconds?: number;
}

export function getBootProgressSnapshot(
  elements: BootProgressElements,
  emulator: BootProgressRuntime | undefined
): BootProgressSnapshot {
  return {
    failed: emulator?.failedToStart === true,
    frame: readFrameNumber(emulator),
    hasCanvas: elements.hasCanvas,
    hasEmulator: Boolean(emulator),
    hasGameManager: Boolean(emulator?.gameManager),
    hasLoaderScript: elements.hasLoaderScript,
    started: emulator?.started === true
  };
}

export function getBootProgressCopy(snapshot: BootProgressSnapshot, elapsedSeconds: number): { detail: string; phase: string } {
  if (snapshot.failed) {
    return {
      phase: "에뮬레이터 오류를 감지했습니다.",
      detail: "코어 또는 ROM 초기화에 실패했습니다. 잠시 뒤에도 그대로이면 메뉴로 돌아가 다시 실행해 주세요."
    };
  }

  if (snapshot.frame > 0 || snapshot.started) {
    return {
      phase: "첫 화면을 확인하는 중입니다.",
      detail: "게임 프레임이 진행 중입니다. 곧 조작 화면이 활성화됩니다."
    };
  }

  if (snapshot.hasCanvas) {
    return {
      phase: "비디오 캔버스를 연결하는 중입니다.",
      detail: delayedDetail(elapsedSeconds, "MAME 런타임이 화면 출력을 준비하고 첫 프레임을 기다리고 있습니다.")
    };
  }

  if (snapshot.hasGameManager) {
    return {
      phase: "게임 런타임을 연결하는 중입니다.",
      detail: withSafariBlockingWarning("입력/화면/오디오 런타임이 만들어졌고 게임 데이터를 메모리에 배치하고 있습니다.")
    };
  }

  if (snapshot.hasEmulator) {
    return {
      phase: "MAME 코어를 초기화하는 중입니다.",
      detail: withSafariBlockingWarning("EmulatorJS가 MAME 코어와 ROM 데이터를 준비하고 있습니다.")
    };
  }

  if (snapshot.hasLoaderScript) {
    return {
      phase: "EmulatorJS 로더를 실행하는 중입니다.",
      detail: delayedDetail(elapsedSeconds, "브라우저가 같은 origin에서 받은 에뮬레이터 로더를 실행하고 있습니다.")
    };
  }

  return {
    phase: "에뮬레이터 로더를 불러오는 중입니다.",
    detail: delayedDetail(elapsedSeconds, "EmulatorJS 로더 스크립트를 같은 origin에서 내려받고 있습니다.")
  };
}

export function shouldStopBoot(
  snapshot: BootProgressSnapshot,
  elapsedSeconds: number,
  options: BootProgressOptions = {}
): boolean {
  if (shouldEnableRuntimeControls(snapshot)) {
    return false;
  }

  return snapshot.failed || elapsedSeconds >= (options.timeoutSeconds ?? BOOT_TIMEOUT_SECONDS);
}

export function shouldEnableRuntimeControls(snapshot: BootProgressSnapshot): boolean {
  return !snapshot.failed && snapshot.frame >= ACTIVE_GAMEPLAY_FRAME_THRESHOLD;
}

function readFrameNumber(emulator: BootProgressRuntime | undefined): number {
  try {
    return emulator?.gameManager?.getFrameNum?.() ?? 0;
  } catch {
    return 0;
  }
}

function delayedDetail(elapsedSeconds: number, detail: string): string {
  if (elapsedSeconds < 20) {
    return detail;
  }

  return `${detail} 처음 실행하거나 네트워크가 느리면 30초 이상 걸릴 수 있습니다.`;
}

function withSafariBlockingWarning(detail: string): string {
  return `${detail} ${IPHONE_SAFARI_BLOCKING_WARNING}`;
}
