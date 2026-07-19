import {
  STREAM_CAPTURE_FPS,
  STREAM_CAPTURE_HEIGHT,
  STREAM_CAPTURE_WIDTH,
  type StreamCaptureAdapter,
  type StreamCaptureFrameSample,
  type StreamCaptureSession
} from "./stream-capture";

export const W2_LAN_DEFAULT_ROOM = "w2-a-to-b";
export const W2_LAN_SIGNALING_ROUTE = "/ponpoko/__w2_lan";

const AUDIO_ACTIVITY_THRESHOLD = 0.001;
const AUDIO_CHANGE_THRESHOLD = 0.00001;
const BYTE_AUDIO_SAMPLE_RESOLUTION = 1 / 128;
const HOST_SILENT_POLL_LIMIT = 10;
const POLL_INTERVAL_MS = 500;
const READINESS_EVIDENCE_MAX_AGE_MS = 2_000;
const VIDEO_ANALYSIS_WIDTH = 32;
const VIDEO_ANALYSIS_HEIGHT = 28;
const SAFE_ROOM = /^[a-z0-9-]{1,24}$/;

export type W2LanRole = "host" | "guest";

export interface W2LanConfig {
  role: W2LanRole;
  room: string;
}

export type W2LanStatus =
  | "idle"
  | "starting"
  | "waiting"
  | "fallback"
  | "ready"
  | "failed";

export type W2LanAudioDiagnostic =
  | "checking"
  | "normal"
  | "recent-normal"
  | "source-silent"
  | "rtp-stopped"
  | "receiver-silent"
  | "context-not-running"
  | "track-ended";

export interface W2LanCaptureSnapshot {
  role: W2LanRole;
  room: string;
  status: W2LanStatus;
  revision: number;
  width: number;
  height: number;
  fps: number;
  captureVideoTrackCount: number;
  captureAudioTrackCount: number;
  captureAudioContextState: AudioContextState | "unavailable";
  captureAudioLevelRms: number;
  captureAudioActivityObserved: boolean;
  receivedVideoTrackCount: number;
  receivedAudioTrackCount: number;
  receiverAudioContextState: AudioContextState | "unavailable";
  receiverAudioLevelRms: number;
  inboundVideoFramesDecoded: number;
  inboundAudioPacketsReceived: number;
  inboundAudioTotalEnergy: number;
  previewAdvancing: boolean;
  previewContentVisible: boolean;
  previewContentChanging: boolean;
  currentVideoEvidence: boolean;
  currentAudioEvidence: boolean;
  audioDiagnostic: W2LanAudioDiagnostic;
  guestReady: boolean;
  ready: boolean;
  fallbackAvailable: boolean;
  fallbackUsed: boolean;
  error: string | null;
}

export type W2LanSnapshot = W2LanCaptureSnapshot;

interface SignalState {
  revision: number;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  guestReady: boolean;
}

export interface W2LanCaptureEnvironment {
  document: Document;
  lifecycleTarget: Pick<Window, "addEventListener" | "removeEventListener">;
  fetch(input: string, init?: RequestInit): Promise<Response>;
  createAudioContext(): AudioContext;
  createMediaStream(tracks: MediaStreamTrack[]): MediaStream;
  createPeerConnection(configuration: RTCConfiguration): RTCPeerConnection;
  readVideoFrame(video: HTMLVideoElement): StreamCaptureFrameSample;
  now(): number;
  setInterval(callback: () => void, delay: number): number;
  clearInterval(handle: number): void;
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(handle: number): void;
}

function defaultEnvironment(): W2LanCaptureEnvironment {
  let analysisCanvas: HTMLCanvasElement | undefined;
  let analysisContext: CanvasRenderingContext2D | null | undefined;
  return {
    document,
    lifecycleTarget: window,
    fetch: (input, init) => fetch(input, init),
    createAudioContext: () => {
      const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error("Web Audio unavailable");
      }
      return new AudioContextConstructor();
    },
    createMediaStream: (tracks) => new MediaStream(tracks),
    createPeerConnection: (configuration) => new RTCPeerConnection(configuration),
    readVideoFrame: (video) => {
      if (video.readyState < 2) {
        return { readback: "not-ready", pixels: null, detail: null };
      }
      analysisCanvas ??= document.createElement("canvas");
      analysisCanvas.width = VIDEO_ANALYSIS_WIDTH;
      analysisCanvas.height = VIDEO_ANALYSIS_HEIGHT;
      analysisContext ??= analysisCanvas.getContext("2d", { alpha: false });
      if (!analysisContext) {
        return { readback: "failed", pixels: null, detail: "2d-context-unavailable" };
      }
      try {
        analysisContext.drawImage(video, 0, 0, VIDEO_ANALYSIS_WIDTH, VIDEO_ANALYSIS_HEIGHT);
        return {
          readback: "ok",
          pixels: new Uint8ClampedArray(
            analysisContext.getImageData(0, 0, VIDEO_ANALYSIS_WIDTH, VIDEO_ANALYSIS_HEIGHT).data
          ),
          detail: null
        };
      } catch (error) {
        return {
          readback: error instanceof DOMException && error.name === "SecurityError" ? "tainted" : "failed",
          pixels: null,
          detail: errorMessage(error)
        };
      }
    },
    now: () => performance.now(),
    setInterval: (callback, delay) => window.setInterval(callback, delay),
    clearInterval: (handle) => window.clearInterval(handle),
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
    clearTimeout: (handle) => window.clearTimeout(handle)
  };
}

export function readW2LanConfig(search: string): W2LanConfig | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const captureEnabled = params
    .getAll("captureSpike")
    .some((value) => value === "1" || value === "true");
  const roles = params.getAll("captureRole");
  const rooms = params.getAll("captureRoom");
  if (!captureEnabled || roles.length !== 1 || (roles[0] !== "host" && roles[0] !== "guest")) {
    return null;
  }
  if (rooms.length > 1 || (rooms.length === 1 && !SAFE_ROOM.test(rooms[0]))) {
    return null;
  }
  return { role: roles[0], room: rooms[0] ?? W2_LAN_DEFAULT_ROOM };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

class SignalingResponseError extends Error {
  constructor(readonly status: number) {
    super(`signaling ${status}`);
  }
}

function signalingUrl(room: string, revision?: number): string {
  const revisionQuery = revision === undefined ? "" : `&revision=${encodeURIComponent(String(revision))}`;
  return `${W2_LAN_SIGNALING_ROUTE}?room=${encodeURIComponent(room)}${revisionQuery}`;
}

function emptySnapshot(role: W2LanRole, room = W2_LAN_DEFAULT_ROOM): W2LanCaptureSnapshot {
  return {
    role,
    room,
    status: "idle",
    revision: 0,
    width: STREAM_CAPTURE_WIDTH,
    height: STREAM_CAPTURE_HEIGHT,
    fps: STREAM_CAPTURE_FPS,
    captureVideoTrackCount: 0,
    captureAudioTrackCount: 0,
    captureAudioContextState: "unavailable",
    captureAudioLevelRms: 0,
    captureAudioActivityObserved: false,
    receivedVideoTrackCount: 0,
    receivedAudioTrackCount: 0,
    receiverAudioContextState: "unavailable",
    receiverAudioLevelRms: 0,
    inboundVideoFramesDecoded: 0,
    inboundAudioPacketsReceived: 0,
    inboundAudioTotalEnergy: 0,
    previewAdvancing: false,
    previewContentVisible: false,
    previewContentChanging: false,
    currentVideoEvidence: false,
    currentAudioEvidence: false,
    audioDiagnostic: "checking",
    guestReady: false,
    ready: false,
    fallbackAvailable: false,
    fallbackUsed: false,
    error: null
  };
}

function waitForIceGathering(
  peer: RTCPeerConnection,
  environment: W2LanCaptureEnvironment,
  isCurrent: () => boolean,
  signal: AbortSignal
): Promise<void> {
  if (!isCurrent() || signal.aborted) {
    return Promise.reject(new DOMException("Operation aborted", "AbortError"));
  }
  if (peer.iceGatheringState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = environment.setTimeout(() => {
      cleanup();
      reject(new Error("ICE gathering timeout"));
    }, 10_000);
    const change = (): void => {
      if (!isCurrent()) {
        cleanup();
        reject(new Error("stale operation"));
      } else if (peer.iceGatheringState === "complete") {
        cleanup();
        resolve();
      }
    };
    const abort = (): void => {
      cleanup();
      reject(new DOMException("Operation aborted", "AbortError"));
    };
    const cleanup = (): void => {
      environment.clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", change);
      signal.removeEventListener("abort", abort);
    };
    peer.addEventListener("icegatheringstatechange", change);
    signal.addEventListener("abort", abort, { once: true });
  });
}

function countLiveTracks(tracks: Iterable<MediaStreamTrack>, kind: "audio" | "video"): number {
  let count = 0;
  for (const track of tracks) {
    if (track.kind === kind && track.readyState === "live") {
      count += 1;
    }
  }
  return count;
}

interface AudioRmsSample {
  rms: number;
  reliableThreshold: number;
}

function calculateRms(analyser: AnalyserNode | undefined): AudioRmsSample {
  if (!analyser) {
    return { rms: 0, reliableThreshold: Number.POSITIVE_INFINITY };
  }
  const floatReader = analyser.getFloatTimeDomainData;
  if (typeof floatReader === "function") {
    const samples = new Float32Array(analyser.fftSize);
    floatReader.call(analyser, samples);
    let sum = 0;
    for (const sample of samples) {
      if (!Number.isFinite(sample)) {
        return { rms: 0, reliableThreshold: Number.POSITIVE_INFINITY };
      }
      sum += sample * sample;
    }
    return {
      rms: samples.length === 0 ? 0 : Math.sqrt(sum / samples.length),
      reliableThreshold: AUDIO_ACTIVITY_THRESHOLD
    };
  }
  const samples = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(samples);
  let sum = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sum += normalized * normalized;
  }
  return {
    rms: samples.length === 0 ? 0 : Math.sqrt(sum / samples.length),
    reliableThreshold: Math.max(AUDIO_ACTIVITY_THRESHOLD, BYTE_AUDIO_SAMPLE_RESOLUTION)
  };
}

function calculateIntervalAudioRms(
  energy: number,
  previousEnergy: number,
  samplesDuration: number,
  previousSamplesDuration: number
): number | null {
  if (
    !Number.isFinite(energy) ||
    !Number.isFinite(previousEnergy) ||
    !Number.isFinite(samplesDuration) ||
    !Number.isFinite(previousSamplesDuration) ||
    energy < previousEnergy ||
    samplesDuration <= previousSamplesDuration
  ) {
    return null;
  }
  const meanSquare = (energy - previousEnergy) / (samplesDuration - previousSamplesDuration);
  return Number.isFinite(meanSquare) && meanSquare >= 0 ? Math.sqrt(meanSquare) : null;
}

function analyzeFrame(
  pixels: Uint8ClampedArray | null,
  previous: Uint8ClampedArray | null
): { visible: boolean; changing: boolean } {
  if (!pixels || pixels.length < 4 || pixels.length % 4 !== 0) {
    return { visible: false, changing: false };
  }
  const pixelCount = pixels.length / 4;
  const comparable = previous?.length === pixels.length ? previous : null;
  let visible = 0;
  let changed = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] > 16 || pixels[index + 1] > 16 || pixels[index + 2] > 16) {
      visible += 1;
    }
    if (
      comparable &&
      Math.abs(pixels[index] - comparable[index]) +
        Math.abs(pixels[index + 1] - comparable[index + 1]) +
        Math.abs(pixels[index + 2] - comparable[index + 2]) >=
        24
    ) {
      changed += 1;
    }
  }
  return {
    visible: visible / pixelCount >= 0.02,
    changing: comparable !== null && changed / pixelCount >= 0.01
  };
}

abstract class W2LanBaseHarness {
  protected snapshot: W2LanCaptureSnapshot;
  protected panel: HTMLDivElement | undefined;
  protected statusLine: HTMLPreElement | undefined;
  protected generation = 0;
  protected pollTimer: number | undefined;
  protected pollBusyGeneration: number | undefined;
  protected room = W2_LAN_DEFAULT_ROOM;
  private operationController = new AbortController();
  private lifecycleListening = false;
  private readonly pagehide = (): void => this.stop();

  protected constructor(
    role: W2LanRole,
    protected readonly environment: W2LanCaptureEnvironment
  ) {
    this.snapshot = emptySnapshot(role);
  }

  getSnapshot(): W2LanCaptureSnapshot {
    return { ...this.snapshot };
  }

  protected buildPanel(mount: HTMLElement, heading: string): HTMLDivElement {
    const panel = this.environment.document.createElement("div");
    panel.className = "capture-spike-panel w2-lan-capture-panel";
    panel.setAttribute("role", "status");
    const title = this.environment.document.createElement("strong");
    title.textContent = heading;
    const status = this.environment.document.createElement("pre");
    panel.append(title, status);
    mount.appendChild(panel);
    this.panel = panel;
    this.statusLine = status;
    this.render();
    if (!this.lifecycleListening) {
      this.environment.lifecycleTarget.addEventListener("pagehide", this.pagehide);
      this.lifecycleListening = true;
    }
    return panel;
  }

  protected render(): void {
    if (!this.statusLine) {
      return;
    }
    const statusLabel: Record<W2LanStatus, string> = {
      idle: "대기",
      starting: "시작 중",
      waiting: "연결 중",
      fallback: "소리 활성화 필요",
      ready: "정상",
      failed: "실패"
    };
    const renderedStatus =
      this.snapshot.role === "guest" &&
      this.snapshot.status === "ready" &&
      !this.snapshot.currentVideoEvidence
        ? "최근 정상"
        : statusLabel[this.snapshot.status];
    const audioLabel: Record<W2LanAudioDiagnostic, string> = {
      checking: "확인 중",
      normal: "정상",
      "recent-normal": "최근 정상",
      "source-silent": "게임 무음(전송 정상)",
      "rtp-stopped": "RTP 중단",
      "receiver-silent": "수신 출력 무음",
      "context-not-running": "오디오 context 중단",
      "track-ended": "오디오 track 종료"
    };
    this.statusLine.textContent = [
      `역할=${this.snapshot.role === "host" ? "Phone A 송신" : "Phone B 수신"}`,
      `상태=${renderedStatus} ready=${this.snapshot.ready ? "yes" : "no"}`,
      this.snapshot.role === "host"
        ? `capture v=${this.snapshot.captureVideoTrackCount} a=${this.snapshot.captureAudioTrackCount} · 소리=${audioLabel[this.snapshot.audioDiagnostic]} · guest=${this.snapshot.guestReady ? "ready" : "waiting"}`
        : `received v=${this.snapshot.receivedVideoTrackCount} a=${this.snapshot.receivedAudioTrackCount} · 영상=${this.snapshot.currentVideoEvidence ? "정상" : this.snapshot.ready ? "최근 정상" : "확인 중"} · 소리=${audioLabel[this.snapshot.audioDiagnostic]}`,
      this.snapshot.error ? `오류=${this.snapshot.error}` : "오류=없음"
    ].join("\n");
  }

  protected operationSignal(): AbortSignal {
    return this.operationController.signal;
  }

  protected async getSignalState(
    generation: number,
    isCurrent: () => boolean
  ): Promise<SignalState | null> {
    if (generation !== this.generation || !isCurrent()) {
      return null;
    }
    const signal = this.operationSignal();
    const response = await this.environment.fetch(signalingUrl(this.room), {
      cache: "no-store",
      signal
    });
    if (generation !== this.generation || !isCurrent()) {
      return null;
    }
    if (!response.ok) {
      throw new SignalingResponseError(response.status);
    }
    const state = (await response.json()) as SignalState;
    return generation === this.generation && isCurrent() ? state : null;
  }

  protected async postSignal(
    generation: number,
    isCurrent: () => boolean,
    body: Record<string, unknown>
  ): Promise<SignalState | null> {
    if (generation !== this.generation || !isCurrent()) {
      return null;
    }
    const signal = this.operationSignal();
    const response = await this.environment.fetch(W2_LAN_SIGNALING_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal,
      body: JSON.stringify(body)
    });
    if (generation !== this.generation || !isCurrent()) {
      return null;
    }
    if (!response.ok) {
      throw new SignalingResponseError(response.status);
    }
    const state = (await response.json()) as SignalState;
    return generation === this.generation && isCurrent() ? state : null;
  }

  protected bestEffortReadyFalse(room: string, revision: number): void {
    if (!SAFE_ROOM.test(room) || revision < 1) {
      return;
    }
    void this.environment
      .fetch(W2_LAN_SIGNALING_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({ action: "ready", room, revision, ready: false })
      })
      .catch(() => undefined);
  }

  protected bestEffortDelete(room: string, revision: number): void {
    if (!SAFE_ROOM.test(room) || revision < 1) {
      return;
    }
    void this.environment
      .fetch(signalingUrl(room, revision), {
        method: "DELETE",
        cache: "no-store",
        keepalive: true
      })
      .catch(() => undefined);
  }

  private invalidateOperation(): void {
    this.operationController.abort();
    this.operationController = new AbortController();
  }

  protected fail(error: unknown, generation: number): void {
    if (generation !== this.generation) {
      return;
    }
    // Invalidate every in-flight SDP, stats, play, and polling continuation
    // before releasing their owned resources. The panel remains mounted so the
    // physical-device operator can read the terminal error.
    this.generation += 1;
    this.invalidateOperation();
    if (this.pollTimer !== undefined) {
      this.environment.clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.cleanupOwnedAfterFailure();
    this.snapshot.status = "failed";
    this.snapshot.ready = false;
    this.snapshot.guestReady = false;
    this.snapshot.error = errorMessage(error);
    this.render();
  }

  protected abstract cleanupOwnedAfterFailure(): void;

  protected clearBase(): void {
    this.generation += 1;
    this.invalidateOperation();
    if (this.pollTimer !== undefined) {
      this.environment.clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.pollBusyGeneration = undefined;
    if (this.lifecycleListening) {
      this.environment.lifecycleTarget.removeEventListener("pagehide", this.pagehide);
      this.lifecycleListening = false;
    }
    this.panel?.remove();
    this.panel = undefined;
    this.statusLine = undefined;
  }

  abstract stop(): void;
}

export class W2LanHostHarness extends W2LanBaseHarness {
  private adapter: StreamCaptureAdapter | undefined;
  private session: StreamCaptureSession | undefined;
  private peer: RTCPeerConnection | undefined;
  private fallbackButton: HTMLButtonElement | undefined;
  private audioWatchdogTimer: number | undefined;
  private silentPolls = 0;
  private previousCaptureRms = 0;

  constructor(environment: W2LanCaptureEnvironment = defaultEnvironment()) {
    super("host", environment);
  }

  async start(adapter: StreamCaptureAdapter, mount: HTMLElement, room = W2_LAN_DEFAULT_ROOM): Promise<void> {
    this.stop();
    const generation = this.generation;
    this.room = room;
    this.snapshot = { ...emptySnapshot("host", room), status: "starting" };
    this.adapter = adapter;
    this.buildPanel(mount, "W2 LAN capture · Phone A");
    try {
      const session = adapter.start();
      if (generation !== this.generation || adapter !== this.adapter) {
        session.stop();
        return;
      }
      this.session = session;
      if (this.prepareCaptureAudio(generation, session, false)) {
        await this.startOffer(generation, session);
      }
    } catch (error) {
      this.fail(error, generation);
    }
  }

  private isCurrentSession(generation: number, session: StreamCaptureSession): boolean {
    return generation === this.generation && session === this.session;
  }

  private isCurrentOffer(
    generation: number,
    session: StreamCaptureSession,
    peer: RTCPeerConnection
  ): boolean {
    return this.isCurrentSession(generation, session) && peer === this.peer;
  }

  private readCaptureSnapshot(
    generation: number,
    session: StreamCaptureSession
  ): { active: boolean; prerequisites: boolean } | null {
    if (!this.isCurrentSession(generation, session)) {
      return null;
    }
    const capture = session.getSnapshot();
    if (!this.isCurrentSession(generation, session)) {
      return null;
    }
    const tracks = session.stream.getTracks();
    const rms = capture.audioLevelRms;
    const active =
      rms > AUDIO_ACTIVITY_THRESHOLD &&
      Math.abs(rms - this.previousCaptureRms) > AUDIO_CHANGE_THRESHOLD;
    this.previousCaptureRms = rms;
    this.snapshot.captureVideoTrackCount = countLiveTracks(tracks, "video");
    this.snapshot.captureAudioTrackCount = countLiveTracks(tracks, "audio");
    this.snapshot.captureAudioContextState = capture.audioContextState;
    this.snapshot.captureAudioLevelRms = rms;
    this.snapshot.captureAudioActivityObserved = this.snapshot.captureAudioActivityObserved || active;
    this.snapshot.audioDiagnostic =
      this.snapshot.captureAudioContextState !== "running"
        ? "context-not-running"
        : this.snapshot.captureAudioTrackCount === 0
          ? "track-ended"
          : rms > AUDIO_ACTIVITY_THRESHOLD
            ? "normal"
            : this.snapshot.captureAudioActivityObserved
              ? "source-silent"
              : "checking";
    return {
      active,
      prerequisites:
        this.snapshot.captureVideoTrackCount > 0 &&
        this.snapshot.captureAudioTrackCount > 0 &&
        this.snapshot.captureAudioContextState === "running"
    };
  }

  private prepareCaptureAudio(
    generation: number,
    session: StreamCaptureSession,
    afterFallback: boolean
  ): boolean {
    this.clearAudioWatchdog();
    this.silentPolls = 0;
    this.previousCaptureRms = 0;
    const sample = this.readCaptureSnapshot(generation, session);
    if (!sample) {
      return false;
    }
    if (!sample.prerequisites) {
      this.handleCaptureAudioFailure(generation, session, afterFallback);
      return false;
    }
    if (sample.active) {
      return true;
    }
    this.snapshot.status = "waiting";
    this.render();
    this.audioWatchdogTimer = this.environment.setInterval(() => {
      this.pollCaptureAudio(generation, session, afterFallback);
    }, POLL_INTERVAL_MS);
    return false;
  }

  private pollCaptureAudio(
    generation: number,
    session: StreamCaptureSession,
    afterFallback: boolean
  ): void {
    if (!this.isCurrentSession(generation, session)) {
      this.clearAudioWatchdog();
      return;
    }
    this.silentPolls += 1;
    const sample = this.readCaptureSnapshot(generation, session);
    if (!sample) {
      return;
    }
    this.render();
    if (!sample.prerequisites) {
      this.clearAudioWatchdog();
      this.handleCaptureAudioFailure(generation, session, afterFallback);
    } else if (sample.active) {
      this.clearAudioWatchdog();
      void this.startOffer(generation, session).catch((error: unknown) => this.fail(error, generation));
    } else if (this.silentPolls >= HOST_SILENT_POLL_LIMIT) {
      this.clearAudioWatchdog();
      this.handleCaptureAudioFailure(generation, session, afterFallback);
    }
  }

  private handleCaptureAudioFailure(
    generation: number,
    session: StreamCaptureSession,
    afterFallback: boolean
  ): void {
    if (!this.isCurrentSession(generation, session)) {
      return;
    }
    if (afterFallback || this.snapshot.fallbackUsed) {
      this.fail(new Error("capture audio silent after one fallback"), generation);
    } else {
      this.offerFallback(generation, session);
    }
  }

  private clearAudioWatchdog(): void {
    if (this.audioWatchdogTimer !== undefined) {
      this.environment.clearInterval(this.audioWatchdogTimer);
      this.audioWatchdogTimer = undefined;
    }
  }

  private offerFallback(generation: number, session: StreamCaptureSession): void {
    if (!this.isCurrentSession(generation, session) || this.snapshot.fallbackUsed) {
      return;
    }
    this.snapshot.status = "fallback";
    this.snapshot.fallbackAvailable = true;
    const button = this.environment.document.createElement("button");
    button.type = "button";
    button.textContent = "방 열고 소리 켜기";
    button.addEventListener(
      "click",
      () => {
        const captureAdapter = this.adapter;
        if (
          !this.isCurrentSession(generation, session) ||
          this.snapshot.fallbackUsed ||
          !captureAdapter
        ) {
          return;
        }
        this.snapshot.fallbackUsed = true;
        this.snapshot.fallbackAvailable = false;
        button.remove();
        this.fallbackButton = undefined;
        const resume = session.resumeAudio();
        void resume.then(
          async () => {
            if (
              !this.isCurrentSession(generation, session) ||
              captureAdapter !== this.adapter
            ) {
              return;
            }
            session.stop();
            if (!this.isCurrentSession(generation, session)) {
              return;
            }
            const restarted = captureAdapter.start();
            if (
              generation !== this.generation ||
              captureAdapter !== this.adapter ||
              session !== this.session
            ) {
              restarted.stop();
              return;
            }
            this.session = restarted;
            if (this.prepareCaptureAudio(generation, restarted, true)) {
              await this.startOffer(generation, restarted);
            }
          },
          (error: unknown) => this.fail(error, generation)
        ).catch((error: unknown) => this.fail(error, generation));
      },
      { once: true }
    );
    this.panel?.appendChild(button);
    this.fallbackButton = button;
    this.render();
  }

  private async startOffer(generation: number, session: StreamCaptureSession): Promise<void> {
    if (!this.isCurrentSession(generation, session)) {
      return;
    }
    this.fallbackButton?.remove();
    this.fallbackButton = undefined;
    this.snapshot.fallbackAvailable = false;
    this.snapshot.status = "waiting";
    this.snapshot.error = null;
    const peer = this.environment.createPeerConnection({ iceServers: [] });
    this.peer = peer;
    for (const track of session.stream.getTracks()) {
      peer.addTrack(track, session.stream);
    }
    const offer = await peer.createOffer();
    if (!this.isCurrentOffer(generation, session, peer)) {
      return;
    }
    await peer.setLocalDescription(offer);
    if (!this.isCurrentOffer(generation, session, peer)) {
      return;
    }
    await waitForIceGathering(
      peer,
      this.environment,
      () => this.isCurrentOffer(generation, session, peer),
      this.operationSignal()
    );
    if (!this.isCurrentOffer(generation, session, peer)) {
      return;
    }
    const description = peer.localDescription;
    if (!description || description.type !== "offer") {
      throw new Error("local offer unavailable");
    }
    const state = await this.publishOffer(generation, session, peer, description);
    if (!state || !this.isCurrentOffer(generation, session, peer)) {
      return;
    }
    this.snapshot.revision = state.revision;
    this.render();
    this.pollTimer = this.environment.setInterval(
      () => void this.pollAnswer(generation, session, peer),
      POLL_INTERVAL_MS
    );
    await this.pollAnswer(generation, session, peer);
  }

  private async publishOffer(
    generation: number,
    session: StreamCaptureSession,
    peer: RTCPeerConnection,
    description: RTCSessionDescription
  ): Promise<SignalState | null> {
    const isCurrent = (): boolean => this.isCurrentOffer(generation, session, peer);
    const observed = await this.getSignalState(generation, isCurrent);
    if (!observed || !isCurrent()) {
      return null;
    }
    const post = (expectedRevision: number): Promise<SignalState | null> => {
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new Error("invalid signaling revision");
      }
      return this.postSignal(generation, isCurrent, {
        action: "offer",
        room: this.room,
        expectedRevision,
        description: { type: "offer", sdp: description.sdp }
      });
    };
    try {
      return await post(observed.revision);
    } catch (error) {
      if (!isCurrent()) {
        return null;
      }
      if (!(error instanceof SignalingResponseError) || error.status !== 409) {
        throw error;
      }
      const refreshed = await this.getSignalState(generation, isCurrent);
      if (!refreshed || !isCurrent()) {
        return null;
      }
      return post(refreshed.revision);
    }
  }

  private async pollAnswer(
    generation: number,
    session: StreamCaptureSession,
    peer: RTCPeerConnection
  ): Promise<void> {
    if (!this.isCurrentOffer(generation, session, peer) || this.pollBusyGeneration === generation) {
      return;
    }
    this.pollBusyGeneration = generation;
    const revision = this.snapshot.revision;
    try {
      const state = await this.getSignalState(
        generation,
        () =>
          this.isCurrentOffer(generation, session, peer) && this.snapshot.revision === revision
      );
      if (!state || !this.isCurrentOffer(generation, session, peer)) {
        return;
      }
      if (state.revision !== revision) {
        this.snapshot.guestReady = false;
        this.snapshot.ready = false;
        this.snapshot.status = "waiting";
        this.render();
        return;
      }
      if (state.answer && !peer.remoteDescription) {
        await peer.setRemoteDescription(state.answer);
        if (!this.isCurrentOffer(generation, session, peer) || this.snapshot.revision !== revision) {
          return;
        }
      }
      const capture = this.readCaptureSnapshot(generation, session);
      if (!capture || !this.isCurrentOffer(generation, session, peer)) {
        return;
      }
      this.snapshot.guestReady = state.guestReady === true;
      this.snapshot.ready =
        this.snapshot.guestReady &&
        Boolean(peer.remoteDescription) &&
        capture.prerequisites &&
        this.snapshot.captureAudioActivityObserved;
      this.snapshot.status = this.snapshot.ready ? "ready" : "waiting";
      this.render();
    } catch (error) {
      this.fail(error, generation);
    } finally {
      if (this.pollBusyGeneration === generation) {
        this.pollBusyGeneration = undefined;
      }
    }
  }

  protected cleanupOwnedAfterFailure(): void {
    const revision = this.snapshot.revision;
    const room = this.room;
    this.clearAudioWatchdog();
    this.fallbackButton?.remove();
    this.fallbackButton = undefined;
    this.peer?.close();
    this.peer = undefined;
    this.session?.stop();
    this.session = undefined;
    this.adapter = undefined;
    this.bestEffortDelete(room, revision);
  }

  stop(): void {
    const room = this.room;
    const revision = this.snapshot.revision;
    this.clearBase();
    this.clearAudioWatchdog();
    this.fallbackButton?.remove();
    this.fallbackButton = undefined;
    this.peer?.close();
    this.peer = undefined;
    this.session?.stop();
    this.session = undefined;
    this.adapter = undefined;
    this.snapshot = emptySnapshot("host", room);
    this.bestEffortDelete(room, revision);
  }
}

export class W2LanGuestHarness extends W2LanBaseHarness {
  private peer: RTCPeerConnection | undefined;
  private preview: HTMLVideoElement | undefined;
  private joinButton: HTMLButtonElement | undefined;
  private receiverContext: AudioContext | undefined;
  private receiverSource: MediaStreamAudioSourceNode | undefined;
  private receiverAnalyser: AnalyserNode | undefined;
  private receivedTracks = new Set<MediaStreamTrack>();
  private previousFrame: Uint8ClampedArray | null = null;
  private previousFrameVisible = false;
  private previousPreviewTime = 0;
  private previousFrames = 0;
  private previousPackets = 0;
  private previousEnergy = 0;
  private previousSamplesDuration = 0;
  private previousEnergyStatsValid = false;
  private previousRms = 0;
  private lastVideoTransportAt: number | undefined;
  private lastVideoContentAt: number | undefined;
  private lastAudioTransportAt: number | undefined;
  private receiverSilenceMismatchStartedAt: number | undefined;
  private receiverContextStateListener: (() => void) | undefined;
  private receiverContextStateTarget: AudioContext | undefined;
  private readinessEpoch = 0;
  private readySendTail: Promise<void> = Promise.resolve();
  private previewPlayAttempts = 0;
  private previewPlayToken = 0;
  private previewRetryPending = false;

  constructor(environment: W2LanCaptureEnvironment = defaultEnvironment()) {
    super("guest", environment);
  }

  mount(mount: HTMLElement, room = W2_LAN_DEFAULT_ROOM): void {
    this.stop();
    const generation = this.generation;
    this.room = room;
    this.snapshot = emptySnapshot("guest", room);
    const panel = this.buildPanel(mount, "W2 LAN capture · Phone B");
    const preview = this.environment.document.createElement("video");
    preview.muted = true;
    preview.autoplay = true;
    preview.playsInline = true;
    preview.setAttribute("aria-label", "Phone A 게임 수신 영상");
    panel.insertBefore(preview, this.statusLine ?? null);
    this.preview = preview;
    const button = this.environment.document.createElement("button");
    button.type = "button";
    button.textContent = "참가하고 소리 켜기";
    button.addEventListener(
      "click",
      () => {
        if (generation !== this.generation || this.snapshot.status !== "idle") {
          return;
        }
        button.disabled = true;
        this.snapshot.status = "starting";
        this.render();
        try {
          const context = this.environment.createAudioContext();
          this.receiverContext = context;
          this.attachReceiverContextState(context, generation);
          const resume = context.resume();
          void resume.then(
            () => {
              if (
                generation !== this.generation ||
                context !== this.receiverContext ||
                preview !== this.preview
              ) {
                return;
              }
              button.remove();
              this.joinButton = undefined;
              this.snapshot.receiverAudioContextState = context.state;
              this.snapshot.status = "waiting";
              this.render();
              this.pollTimer = this.environment.setInterval(() => void this.pollOffer(generation), POLL_INTERVAL_MS);
              void this.pollOffer(generation);
            },
            (error: unknown) => this.fail(error, generation)
          );
        } catch (error) {
          this.fail(error, generation);
        }
      },
      { once: true }
    );
    panel.appendChild(button);
    this.joinButton = button;
  }

  private attachReceiverContextState(context: AudioContext, generation: number): void {
    this.detachReceiverContextState();
    const statechange = (): void => {
      if (generation !== this.generation || context !== this.receiverContext) {
        return;
      }
      this.snapshot.receiverAudioContextState = context.state;
      if (context.state === "running") {
        this.render();
        return;
      }
      const shouldPublishFalse = this.snapshot.ready || this.snapshot.guestReady;
      this.snapshot.audioDiagnostic = "context-not-running";
      const peer = this.peer;
      const revision = this.snapshot.revision;
      this.resetReceiverEvidence();
      this.snapshot.currentVideoEvidence = false;
      this.snapshot.currentAudioEvidence = false;
      this.snapshot.ready = false;
      this.snapshot.guestReady = false;
      if (peer && revision > 0) {
        this.snapshot.status = "waiting";
      }
      this.readinessEpoch += 1;
      const readinessEpoch = this.readinessEpoch;
      this.render();
      if (
        shouldPublishFalse &&
        peer &&
        this.isCurrentPeer(generation, peer, revision)
      ) {
        void this.publishReady(false, generation, peer, revision, readinessEpoch).catch(
          (error: unknown) => this.fail(error, generation)
        );
      }
    };
    context.addEventListener("statechange", statechange);
    this.receiverContextStateTarget = context;
    this.receiverContextStateListener = statechange;
  }

  private detachReceiverContextState(): void {
    if (this.receiverContextStateTarget && this.receiverContextStateListener) {
      this.receiverContextStateTarget.removeEventListener(
        "statechange",
        this.receiverContextStateListener
      );
    }
    this.receiverContextStateTarget = undefined;
    this.receiverContextStateListener = undefined;
  }

  private async pollOffer(generation: number): Promise<void> {
    const context = this.receiverContext;
    const preview = this.preview;
    if (
      generation !== this.generation ||
      !context ||
      !preview ||
      this.pollBusyGeneration === generation
    ) {
      return;
    }
    this.pollBusyGeneration = generation;
    try {
      const state = await this.getSignalState(
        generation,
        () =>
          generation === this.generation &&
          context === this.receiverContext &&
          preview === this.preview
      );
      if (
        !state ||
        generation !== this.generation ||
        context !== this.receiverContext ||
        preview !== this.preview
      ) {
        return;
      }
      if (state.offer && state.revision > 0 && state.revision !== this.snapshot.revision) {
        await this.acceptOffer(state.offer, state.revision, generation);
      }
      const peer = this.peer;
      const revision = this.snapshot.revision;
      if (
        generation !== this.generation ||
        context !== this.receiverContext ||
        preview !== this.preview
      ) {
        return;
      }
      if (peer && revision > 0) {
        await this.readReceiverState(generation, peer, revision);
      }
    } catch (error) {
      this.fail(error, generation);
    } finally {
      if (this.pollBusyGeneration === generation) {
        this.pollBusyGeneration = undefined;
      }
    }
  }

  private async acceptOffer(
    offer: RTCSessionDescriptionInit,
    revision: number,
    generation: number
  ): Promise<void> {
    this.closePeerOnly();
    if (generation !== this.generation || !this.preview || !this.receiverContext) {
      return;
    }
    const peer = this.environment.createPeerConnection({ iceServers: [] });
    this.peer = peer;
    this.snapshot.revision = revision;
    this.snapshot.status = "waiting";
    peer.addEventListener("track", (event) => {
      if (generation !== this.generation || peer !== this.peer) {
        return;
      }
      this.receiveTrack(event.track, generation, peer, revision);
    });
    await peer.setRemoteDescription(offer);
    if (!this.isCurrentPeer(generation, peer, revision)) {
      return;
    }
    const answer = await peer.createAnswer();
    if (!this.isCurrentPeer(generation, peer, revision)) {
      return;
    }
    await peer.setLocalDescription(answer);
    if (!this.isCurrentPeer(generation, peer, revision)) {
      return;
    }
    await waitForIceGathering(
      peer,
      this.environment,
      () => this.isCurrentPeer(generation, peer, revision),
      this.operationSignal()
    );
    if (!this.isCurrentPeer(generation, peer, revision)) {
      return;
    }
    const description = peer.localDescription;
    if (!description || description.type !== "answer") {
      throw new Error("local answer unavailable");
    }
    try {
      await this.postSignal(
        generation,
        () => this.isCurrentPeer(generation, peer, revision),
        {
          action: "answer",
          room: this.room,
          revision,
          description: { type: "answer", sdp: description.sdp }
        }
      );
    } catch (error) {
      if (!this.isCurrentPeer(generation, peer, revision)) {
        return;
      }
      if (error instanceof SignalingResponseError && error.status === 409) {
        this.closePeerOnly();
        this.snapshot.status = "waiting";
        this.snapshot.error = null;
        this.render();
        return;
      }
      throw error;
    }
  }

  private isCurrentPeer(
    generation: number,
    peer: RTCPeerConnection,
    revision: number
  ): boolean {
    return (
      generation === this.generation &&
      peer === this.peer &&
      revision === this.snapshot.revision
    );
  }

  private receiveTrack(
    track: MediaStreamTrack,
    generation: number,
    peer: RTCPeerConnection,
    revision: number
  ): void {
    if (!this.isCurrentPeer(generation, peer, revision)) {
      return;
    }
    this.receivedTracks.add(track);
    track.addEventListener("ended", () => {
      if (!this.isCurrentPeer(generation, peer, revision)) {
        return;
      }
      const shouldPublishFalse = this.snapshot.ready || this.snapshot.guestReady;
      this.receivedTracks.delete(track);
      this.resetReceiverEvidence();
      this.previousFrame = null;
      this.previousFrameVisible = false;
      this.previousPreviewTime = 0;
      this.previousFrames = 0;
      this.previousPackets = 0;
      this.previousEnergy = 0;
      this.previousSamplesDuration = 0;
      this.previousEnergyStatsValid = false;
      this.previousRms = 0;
      this.readinessEpoch += 1;
      this.snapshot.receivedVideoTrackCount = countLiveTracks(this.receivedTracks, "video");
      this.snapshot.receivedAudioTrackCount = countLiveTracks(this.receivedTracks, "audio");
      this.snapshot.ready = false;
      this.snapshot.guestReady = false;
      this.snapshot.currentVideoEvidence = false;
      this.snapshot.currentAudioEvidence = false;
      this.snapshot.audioDiagnostic = track.kind === "audio" ? "track-ended" : this.snapshot.audioDiagnostic;
      this.snapshot.status = "waiting";
      this.render();
      const epoch = this.readinessEpoch;
      if (shouldPublishFalse) {
        void this.publishReady(false, generation, peer, revision, epoch).catch(
          (error: unknown) => this.fail(error, generation)
        );
      }
    });
    if (track.kind === "video" && this.preview && !this.preview.srcObject) {
      const source = this.environment.createMediaStream([track]);
      this.preview.srcObject = source;
      this.attemptPreviewPlayback(generation, source);
    } else if (track.kind === "audio" && this.receiverContext && !this.receiverSource) {
      const source = this.receiverContext.createMediaStreamSource(
        this.environment.createMediaStream([track])
      );
      const analyser = this.receiverContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyser.connect(this.receiverContext.destination);
      this.receiverSource = source;
      this.receiverAnalyser = analyser;
    }
    this.snapshot.receivedVideoTrackCount = countLiveTracks(this.receivedTracks, "video");
    this.snapshot.receivedAudioTrackCount = countLiveTracks(this.receivedTracks, "audio");
    this.render();
  }

  private attemptPreviewPlayback(generation: number, source: MediaProvider): void {
    const preview = this.preview;
    if (
      !preview ||
      generation !== this.generation ||
      preview.srcObject !== source ||
      this.previewPlayAttempts >= 2 ||
      (this.previewPlayAttempts > 0 && !this.previewRetryPending)
    ) {
      return;
    }
    this.previewRetryPending = false;
    const attempt = ++this.previewPlayAttempts;
    const token = ++this.previewPlayToken;
    const reject = (error: unknown): void => {
      if (
        generation !== this.generation ||
        preview !== this.preview ||
        preview.srcObject !== source ||
        token !== this.previewPlayToken
      ) {
        return;
      }
      if (isAbortError(error) && attempt === 1) {
        this.previewRetryPending = true;
        const retry = (): void => this.attemptPreviewPlayback(generation, source);
        preview.addEventListener("loadedmetadata", retry, { once: true });
        preview.addEventListener("canplay", retry, { once: true });
        return;
      }
      this.fail(error, generation);
    };
    try {
      void preview.play().then(
        () => {
          if (
            generation === this.generation &&
            preview === this.preview &&
            preview.srcObject === source &&
            token === this.previewPlayToken
          ) {
            this.previewRetryPending = false;
          }
        },
        reject
      );
    } catch (error) {
      reject(error);
    }
  }

  private async readReceiverState(
    generation: number,
    peer: RTCPeerConnection,
    revision: number
  ): Promise<void> {
    const preview = this.preview;
    if (!preview || !this.isCurrentPeer(generation, peer, revision)) {
      return;
    }
    let frames = 0;
    let packets = 0;
    let energy = 0;
    let samplesDuration = 0;
    let audioInboundCount = 0;
    let energyStatsComplete = true;
    const reports = await peer.getStats();
    reports.forEach((report) => {
      const stat = report as RTCStats & {
        framesDecoded?: number;
        isRemote?: boolean;
        kind?: string;
        mediaType?: string;
        packetsReceived?: number;
        totalAudioEnergy?: number;
        totalSamplesDuration?: number;
      };
      if (stat.type !== "inbound-rtp" || stat.isRemote) {
        return;
      }
      if (stat.kind === "video" || stat.mediaType === "video") {
        frames += stat.framesDecoded ?? 0;
      } else if (stat.kind === "audio" || stat.mediaType === "audio") {
        audioInboundCount += 1;
        packets += stat.packetsReceived ?? 0;
        if (
          Number.isFinite(stat.totalAudioEnergy) &&
          Number.isFinite(stat.totalSamplesDuration)
        ) {
          energy += stat.totalAudioEnergy ?? 0;
          samplesDuration += stat.totalSamplesDuration ?? 0;
        } else {
          energyStatsComplete = false;
        }
      }
    });
    if (
      !this.isCurrentPeer(generation, peer, revision) ||
      preview !== this.preview
    ) {
      return;
    }
    const sample = this.environment.readVideoFrame(preview);
    const pixels = sample.readback === "ok" ? sample.pixels : null;
    const frame = analyzeFrame(pixels, this.previousFrame);
    const rmsSample = calculateRms(this.receiverAnalyser);
    const rms = rmsSample.rms;
    const previewAdvancing = preview.currentTime > this.previousPreviewTime;
    const framesGrowing = frames > this.previousFrames;
    const packetsGrowing = packets > this.previousPackets;
    const energyStatsValid = audioInboundCount > 0 && energyStatsComplete;
    const intervalEnergyRms =
      energyStatsValid && this.previousEnergyStatsValid
        ? calculateIntervalAudioRms(
            energy,
            this.previousEnergy,
            samplesDuration,
            this.previousSamplesDuration
          )
        : null;
    const energyEvidence =
      intervalEnergyRms === null
        ? "unknown"
        : intervalEnergyRms > rmsSample.reliableThreshold
          ? "material"
          : "silent";
    const rmsChanging =
      rms > AUDIO_ACTIVITY_THRESHOLD && Math.abs(rms - this.previousRms) > AUDIO_CHANGE_THRESHOLD;
    this.snapshot.receivedVideoTrackCount = countLiveTracks(this.receivedTracks, "video");
    this.snapshot.receivedAudioTrackCount = countLiveTracks(this.receivedTracks, "audio");
    this.snapshot.receiverAudioContextState = this.receiverContext?.state ?? "unavailable";
    this.snapshot.receiverAudioLevelRms = rms;
    this.snapshot.inboundVideoFramesDecoded = frames;
    this.snapshot.inboundAudioPacketsReceived = packets;
    this.snapshot.inboundAudioTotalEnergy = energy;
    this.snapshot.previewAdvancing = previewAdvancing;
    this.snapshot.previewContentVisible = frame.visible;
    this.snapshot.previewContentChanging = frame.changing;
    const videoHardGuardReady = this.snapshot.receivedVideoTrackCount > 0;
    const audioHardGuardReady =
      this.snapshot.receivedAudioTrackCount > 0 &&
      this.snapshot.receiverAudioContextState === "running";
    const hardGuardsReady = videoHardGuardReady && audioHardGuardReady;
    if (this.snapshot.receiverAudioContextState !== "running") {
      this.snapshot.audioDiagnostic = "context-not-running";
    } else if (this.snapshot.receivedAudioTrackCount === 0) {
      this.snapshot.audioDiagnostic = "track-ended";
    }
    const videoContentObserved =
      this.previousFrameVisible && frame.visible && frame.changing;
    const videoTransportObserved = framesGrowing && previewAdvancing;
    const audioTransportObserved = packetsGrowing;
    const audioContentObserved = rms > AUDIO_ACTIVITY_THRESHOLD;
    this.snapshot.currentVideoEvidence =
      videoHardGuardReady && videoTransportObserved && videoContentObserved;
    this.snapshot.currentAudioEvidence =
      audioHardGuardReady && audioTransportObserved && audioContentObserved;
    const strictAcquisitionReady =
      hardGuardsReady &&
      frames > 0 &&
      framesGrowing &&
      previewAdvancing &&
      videoContentObserved &&
      packets > 0 &&
      packetsGrowing &&
      rmsChanging;
    this.snapshot.ready = this.evaluateReceiverReadiness(
      this.environment.now(),
      hardGuardsReady,
      strictAcquisitionReady,
      {
        videoTransport: videoTransportObserved,
        videoContent: videoContentObserved,
        audioTransport: audioTransportObserved,
        audioContent: audioContentObserved,
        audioEnergy: energyEvidence
      }
    );
    this.snapshot.status = this.snapshot.ready ? "ready" : "waiting";
    this.previousFrame = pixels ? new Uint8ClampedArray(pixels) : null;
    this.previousFrameVisible = frame.visible;
    this.previousPreviewTime = preview.currentTime;
    this.previousFrames = frames;
    this.previousPackets = packets;
    this.previousEnergy = energy;
    this.previousSamplesDuration = samplesDuration;
    this.previousEnergyStatsValid = energyStatsValid;
    this.previousRms = rms;
    this.readinessEpoch += 1;
    const readinessEpoch = this.readinessEpoch;
    this.render();
    await this.publishReady(
      this.snapshot.ready,
      generation,
      peer,
      revision,
      readinessEpoch
    );
  }

  private evaluateReceiverReadiness(
    now: number,
    hardGuardsReady: boolean,
    strictAcquisitionReady: boolean,
    evidence: {
      videoTransport: boolean;
      videoContent: boolean;
      audioTransport: boolean;
      audioContent: boolean;
      audioEnergy: "unknown" | "silent" | "material";
    }
  ): boolean {
    if (!hardGuardsReady) {
      this.resetReceiverEvidence();
      return false;
    }
    if (!this.snapshot.ready) {
      if (!strictAcquisitionReady) {
        this.resetReceiverEvidence();
        return false;
      }
      this.lastVideoTransportAt = now;
      this.lastVideoContentAt = now;
      this.lastAudioTransportAt = now;
      this.receiverSilenceMismatchStartedAt = undefined;
      this.snapshot.audioDiagnostic = "normal";
      return true;
    }
    const isRecent = (lastObserved: number | undefined): boolean =>
      lastObserved !== undefined && now - lastObserved < READINESS_EVIDENCE_MAX_AGE_MS;
    const wasFresh =
      isRecent(this.lastVideoTransportAt) &&
      isRecent(this.lastVideoContentAt) &&
      isRecent(this.lastAudioTransportAt);
    if (!wasFresh) {
      this.snapshot.audioDiagnostic = !isRecent(this.lastAudioTransportAt)
        ? "rtp-stopped"
        : this.snapshot.audioDiagnostic;
      this.resetReceiverEvidence();
      return false;
    }
    if (evidence.videoTransport) {
      this.lastVideoTransportAt = now;
    }
    if (evidence.videoContent) {
      this.lastVideoContentAt = now;
    }
    if (evidence.audioTransport) {
      this.lastAudioTransportAt = now;
    }
    if (!evidence.audioTransport) {
      this.receiverSilenceMismatchStartedAt = undefined;
      this.snapshot.audioDiagnostic = "recent-normal";
    } else if (evidence.audioContent) {
      this.receiverSilenceMismatchStartedAt = undefined;
      this.snapshot.audioDiagnostic = "normal";
    } else if (evidence.audioEnergy === "silent") {
      this.receiverSilenceMismatchStartedAt = undefined;
      this.snapshot.audioDiagnostic = "source-silent";
    } else if (evidence.audioEnergy === "material") {
      this.receiverSilenceMismatchStartedAt ??= now;
      this.snapshot.audioDiagnostic = "receiver-silent";
      if (now - this.receiverSilenceMismatchStartedAt >= READINESS_EVIDENCE_MAX_AGE_MS) {
        this.resetReceiverEvidence();
        return false;
      }
    } else {
      this.receiverSilenceMismatchStartedAt = undefined;
      this.snapshot.audioDiagnostic = "recent-normal";
    }
    return true;
  }

  private resetReceiverEvidence(): void {
    this.lastVideoTransportAt = undefined;
    this.lastVideoContentAt = undefined;
    this.lastAudioTransportAt = undefined;
    this.receiverSilenceMismatchStartedAt = undefined;
  }

  private publishReady(
    ready: boolean,
    generation: number,
    peer: RTCPeerConnection,
    revision: number,
    readinessEpoch: number
  ): Promise<void> {
    const previous = this.readySendTail;
    const operation = previous.catch(() => undefined).then(async () => {
      if (
        !this.isCurrentPeer(generation, peer, revision) ||
        readinessEpoch !== this.readinessEpoch ||
        this.snapshot.ready !== ready
      ) {
        return;
      }
      const state = await this.postSignal(
        generation,
        () =>
          this.isCurrentPeer(generation, peer, revision) &&
          readinessEpoch === this.readinessEpoch &&
          this.snapshot.ready === ready,
        {
          action: "ready",
          room: this.room,
          revision,
          ready
        }
      );
      if (
        !state ||
        !this.isCurrentPeer(generation, peer, revision) ||
        readinessEpoch !== this.readinessEpoch ||
        this.snapshot.ready !== ready
      ) {
        return;
      }
      this.snapshot.guestReady =
        state.revision === revision && state.guestReady === true && ready;
      this.render();
    });
    this.readySendTail = operation.catch(() => undefined);
    return operation;
  }

  private closePeerOnly(): void {
    this.peer?.close();
    this.peer = undefined;
    this.receiverSource?.disconnect();
    this.receiverSource = undefined;
    this.receiverAnalyser?.disconnect();
    this.receiverAnalyser = undefined;
    for (const track of this.receivedTracks) {
      track.stop();
    }
    this.receivedTracks.clear();
    if (this.preview) {
      this.previewPlayToken += 1;
      this.previewPlayAttempts = 0;
      this.previewRetryPending = false;
      this.preview.pause();
      this.preview.srcObject = null;
    }
    this.previousFrame = null;
    this.previousFrameVisible = false;
    this.previousPreviewTime = 0;
    this.previousFrames = 0;
    this.previousPackets = 0;
    this.previousEnergy = 0;
    this.previousSamplesDuration = 0;
    this.previousEnergyStatsValid = false;
    this.previousRms = 0;
    this.resetReceiverEvidence();
    this.readinessEpoch += 1;
    this.snapshot.receivedVideoTrackCount = 0;
    this.snapshot.receivedAudioTrackCount = 0;
    this.snapshot.receiverAudioLevelRms = 0;
    this.snapshot.inboundVideoFramesDecoded = 0;
    this.snapshot.inboundAudioPacketsReceived = 0;
    this.snapshot.inboundAudioTotalEnergy = 0;
    this.snapshot.previewAdvancing = false;
    this.snapshot.previewContentVisible = false;
    this.snapshot.previewContentChanging = false;
    this.snapshot.currentVideoEvidence = false;
    this.snapshot.currentAudioEvidence = false;
    this.snapshot.audioDiagnostic = "checking";
    this.snapshot.ready = false;
    this.snapshot.guestReady = false;
  }

  protected cleanupOwnedAfterFailure(): void {
    const room = this.room;
    const revision = this.snapshot.revision;
    this.joinButton?.remove();
    this.joinButton = undefined;
    this.closePeerOnly();
    const context = this.receiverContext;
    this.detachReceiverContextState();
    this.receiverContext = undefined;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
    this.bestEffortReadyFalse(room, revision);
  }

  stop(): void {
    const room = this.room;
    const revision = this.snapshot.revision;
    this.clearBase();
    this.joinButton?.remove();
    this.joinButton = undefined;
    this.closePeerOnly();
    const context = this.receiverContext;
    this.detachReceiverContextState();
    this.receiverContext = undefined;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
    this.preview = undefined;
    this.snapshot = emptySnapshot("guest", room);
    this.bestEffortReadyFalse(room, revision);
  }
}
