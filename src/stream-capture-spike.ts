import {
  STREAM_CAPTURE_FPS,
  STREAM_CAPTURE_HEIGHT,
  STREAM_CAPTURE_WIDTH,
  StreamCaptureAdapter,
  type StreamCaptureFrameReadback,
  type StreamCaptureFrameSample,
  type StreamCaptureSession
} from "./stream-capture";

const AUDIO_ACTIVITY_THRESHOLD = 0.001;
const BLACK_VIDEO_POLL_LIMIT = 10;
const SILENT_POLL_LIMIT = 10;
const STATS_POLL_INTERVAL_MS = 500;
const VIDEO_ACTIVITY_GRACE_POLLS = 2;
const VIDEO_ANALYSIS_HEIGHT = 28;
const VIDEO_ANALYSIS_WIDTH = 32;
const VIDEO_CHANGED_PIXEL_RATIO = 0.01;
const VIDEO_VISIBLE_PIXEL_RATIO = 0.02;
const FALLBACK_LABEL = "방 열고 소리 켜기";

type SpikeStatus = "idle" | "starting" | "waiting" | "ready" | "fallback" | "failed";
type VideoPipelineDiagnosis =
  | "pending"
  | "ok"
  | "source-capture-failed"
  | "staging-copy-failed"
  | "downstream-capture-failed"
  | "source-readback-unavailable"
  | "bridge-readback-unavailable"
  | "staging-readback-unavailable"
  | "receiver-readback-unavailable";
type VideoProbeVerdict = "pending" | "ok" | "black" | "static" | "unreadable";
type VideoProbeStage = "source" | "bridge" | "staging" | "receiver";

export interface VideoProbeStageSnapshot {
  verdict: VideoProbeVerdict;
  readback: StreamCaptureFrameReadback;
  visiblePixelRatio: number | null;
  changedPixelRatio: number | null;
  detail: string | null;
}

export interface VideoPipelineSnapshot {
  diagnosis: VideoPipelineDiagnosis;
  source: VideoProbeStageSnapshot;
  bridge: VideoProbeStageSnapshot;
  staging: VideoProbeStageSnapshot;
  receiver: VideoProbeStageSnapshot;
}

export interface StreamCaptureSpikeSnapshot {
  status: SpikeStatus;
  width: number;
  height: number;
  fps: number;
  captureVideoTrackCount: number;
  captureAudioTrackCount: number;
  receivedVideoTrackCount: number;
  receivedAudioTrackCount: number;
  captureAudioContextState: AudioContextState | "unavailable";
  captureAudioLevelRms: number;
  receiverAudioContextState: AudioContextState | "unavailable";
  receiverAudioLevelRms: number;
  inboundVideoFramesDecoded: number;
  inboundAudioPacketsReceived: number;
  inboundAudioTotalEnergy: number;
  inboundAudioEnergyChanging: boolean;
  audioActivityChanging: boolean;
  previewCurrentTime: number;
  previewPaused: boolean;
  previewPlayError: string | null;
  previewPresentationReady: boolean;
  previewReadyState: number;
  previewTimeChanging: boolean;
  previewVideoHeight: number;
  previewVideoWidth: number;
  receivedVideoActivityChanging: boolean;
  receivedVideoBlack: boolean;
  receivedVideoContentVisible: boolean;
  videoPath: "bridge";
  bridgeReady: boolean;
  bridgePlayError: string | null;
  sourceContextType: "webgl2" | "webgl" | "2d" | "unknown";
  sourcePreserveDrawingBuffer: boolean | null;
  videoPipeline: VideoPipelineSnapshot;
  ready: boolean;
  fallbackAvailable: boolean;
  fallbackUsed: boolean;
  error: string | null;
}

interface InboundStatsTotals {
  audioPacketsReceived: number;
  audioTotalEnergy: number;
  videoFramesDecoded: number;
}

interface SpikeDocument {
  createElement(tagName: "button"): HTMLButtonElement;
  createElement(tagName: "canvas"): HTMLCanvasElement;
  createElement(tagName: "div"): HTMLDivElement;
  createElement(tagName: "pre"): HTMLPreElement;
  createElement(tagName: "video"): HTMLVideoElement;
}

export interface StreamCaptureSpikeEnvironment {
  document: SpikeDocument;
  createAudioContext(): AudioContext;
  createMediaStream(tracks: MediaStreamTrack[]): MediaStream;
  createPeerConnection(configuration: RTCConfiguration): RTCPeerConnection;
  readVideoFrame(video: HTMLVideoElement): StreamCaptureFrameSample;
  setInterval(callback: () => void, delay: number): number;
  clearInterval(handle: number): void;
}

function defaultEnvironment(): StreamCaptureSpikeEnvironment {
  let analysisCanvas: HTMLCanvasElement | undefined;
  let analysisContext: CanvasRenderingContext2D | null | undefined;

  return {
    document,
    createAudioContext: () => {
      const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error("Web Audio is unavailable for the capture spike receiver");
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
        return {
          readback: "failed",
          pixels: null,
          detail: "2d-context-unavailable"
        };
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
        const name = error instanceof DOMException ? error.name : errorMessage(error);
        return {
          readback: name === "SecurityError" ? "tainted" : "failed",
          pixels: null,
          detail: name
        };
      }
    },
    setInterval: (callback, delay) => window.setInterval(callback, delay),
    clearInterval: (handle) => window.clearInterval(handle)
  };
}

function analyzeVideoFrame(
  current: Uint8ClampedArray | null,
  previous: Uint8ClampedArray | null
): {
  changedPixelRatio: number | null;
  changing: boolean;
  contentVisible: boolean;
  visiblePixelRatio: number | null;
} {
  if (!current || current.length < 4 || current.length % 4 !== 0) {
    return {
      changedPixelRatio: null,
      changing: false,
      contentVisible: false,
      visiblePixelRatio: null
    };
  }

  let changedPixels = 0;
  let visiblePixels = 0;
  const pixelCount = current.length / 4;
  const comparableFrame = previous?.length === current.length ? previous : null;
  for (let index = 0; index < current.length; index += 4) {
    const red = current[index];
    const green = current[index + 1];
    const blue = current[index + 2];
    if (red > 16 || green > 16 || blue > 16) {
      visiblePixels += 1;
    }
    if (
      comparableFrame &&
      Math.abs(red - comparableFrame[index]) +
        Math.abs(green - comparableFrame[index + 1]) +
        Math.abs(blue - comparableFrame[index + 2]) >= 24
    ) {
      changedPixels += 1;
    }
  }

  const changedPixelRatio = comparableFrame ? changedPixels / pixelCount : null;
  const visiblePixelRatio = visiblePixels / pixelCount;
  return {
    changedPixelRatio,
    changing:
      changedPixelRatio !== null && changedPixelRatio >= VIDEO_CHANGED_PIXEL_RATIO,
    contentVisible: visiblePixelRatio >= VIDEO_VISIBLE_PIXEL_RATIO,
    visiblePixelRatio
  };
}

interface VideoProbeHistory {
  blackPolls: number;
  previousFrame: Uint8ClampedArray | null;
  recentActivityPolls: number;
}

function createVideoProbeHistory(): VideoProbeHistory {
  return { blackPolls: 0, previousFrame: null, recentActivityPolls: 0 };
}

function createPendingVideoProbeStage(): VideoProbeStageSnapshot {
  return {
    verdict: "pending",
    readback: "not-ready",
    visiblePixelRatio: null,
    changedPixelRatio: null,
    detail: null
  };
}

function createPendingVideoPipeline(): VideoPipelineSnapshot {
  return {
    diagnosis: "pending",
    source: createPendingVideoProbeStage(),
    bridge: createPendingVideoProbeStage(),
    staging: createPendingVideoProbeStage(),
    receiver: createPendingVideoProbeStage()
  };
}

function diagnoseVideoPipeline(
  stages: Omit<VideoPipelineSnapshot, "diagnosis">
): VideoPipelineDiagnosis {
  if (stages.bridge.verdict === "unreadable") {
    return "bridge-readback-unavailable";
  }
  if (stages.bridge.verdict === "black") {
    return "source-capture-failed";
  }
  if (stages.staging.verdict === "unreadable") {
    return "staging-readback-unavailable";
  }
  if (stages.bridge.verdict === "ok" && stages.staging.verdict === "black") {
    return "staging-copy-failed";
  }
  if (stages.receiver.verdict === "unreadable") {
    return "receiver-readback-unavailable";
  }
  if (stages.staging.verdict === "ok" && stages.receiver.verdict === "black") {
    return "downstream-capture-failed";
  }
  if (
    stages.bridge.verdict === "ok" &&
    stages.staging.verdict === "ok" &&
    stages.receiver.verdict === "ok"
  ) {
    return "ok";
  }
  if (stages.source.verdict === "unreadable") {
    return "source-readback-unavailable";
  }
  return "pending";
}

function videoDiagnosisLabel(diagnosis: VideoPipelineDiagnosis): string {
  switch (diagnosis) {
    case "ok":
      return "정상";
    case "source-capture-failed":
      return "원본 캡처 실패";
    case "staging-copy-failed":
      return "512x448 복사 실패";
    case "downstream-capture-failed":
      return "캔버스 캡처/전송 실패";
    case "source-readback-unavailable":
      return "원본 판독 불가";
    case "bridge-readback-unavailable":
      return "원본 캡처 판독 불가";
    case "staging-readback-unavailable":
      return "512x448 판독 불가";
    case "receiver-readback-unavailable":
      return "수신 판독 불가";
    default:
      return "확인 중";
  }
}

export function isStreamCaptureSpikeEnabled(search: string): boolean {
  const values = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).getAll(
    "captureSpike"
  );
  return values.some((value) => value === "1" || value === "true");
}

function calculateRms(analyser: AnalyserNode | undefined): number {
  if (!analyser) {
    return 0;
  }

  const samples = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(samples);
  let sumOfSquares = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sumOfSquares += normalized * normalized;
  }
  return samples.length === 0 ? 0 : Math.sqrt(sumOfSquares / samples.length);
}

function readInboundStats(report: RTCStatsReport): InboundStatsTotals {
  const totals: InboundStatsTotals = {
    audioPacketsReceived: 0,
    audioTotalEnergy: 0,
    videoFramesDecoded: 0
  };

  report.forEach((rawStat) => {
    const stat = rawStat as RTCStats & {
      framesDecoded?: number;
      kind?: string;
      mediaType?: string;
      packetsReceived?: number;
      totalAudioEnergy?: number;
    };
    if (stat.type !== "inbound-rtp" || ("isRemote" in stat && stat.isRemote)) {
      return;
    }

    const kind = stat.kind ?? stat.mediaType;
    if (kind === "audio") {
      totals.audioPacketsReceived += stat.packetsReceived ?? 0;
      totals.audioTotalEnergy += stat.totalAudioEnergy ?? 0;
    } else if (kind === "video") {
      totals.videoFramesDecoded += stat.framesDecoded ?? 0;
    }
  });
  return totals;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export class StreamCaptureSpikeHarness {
  private adapter: StreamCaptureAdapter | undefined;
  private session: StreamCaptureSession | undefined;
  private senderPeer: RTCPeerConnection | undefined;
  private receiverPeer: RTCPeerConnection | undefined;
  private receiverAudioContext: AudioContext | undefined;
  private receiverAudioSource: MediaStreamAudioSourceNode | undefined;
  private receiverAnalyser: AnalyserNode | undefined;
  private preview: HTMLVideoElement | undefined;
  private root: HTMLDivElement | undefined;
  private statusOutput: HTMLPreElement | undefined;
  private fallbackMount: HTMLDivElement | undefined;
  private fallbackButton: HTMLButtonElement | undefined;
  private statsTimer = 0;
  private pollGeneration = 0;
  private receivedTracks = new Set<MediaStreamTrack>();
  private previewPlayAttempts = 0;
  private previewPlayAttemptToken = 0;
  private previewPlayInFlight = false;
  private previewPlaybackConfirmed = false;
  private previewRetryPending = false;
  private previewPlaySource: MediaProvider | null = null;
  private audioActivityObserved = false;
  private silentPolls = 0;
  private previousInboundAudioPackets = 0;
  private previousInboundAudioEnergy = 0;
  private previousPreviewCurrentTime: number | null = null;
  private recentPreviewTimePolls = 0;
  private recentVideoActivityPolls = 0;
  private blackVideoPolls = 0;
  private videoProbeHistories: Record<VideoProbeStage, VideoProbeHistory> =
    this.createVideoProbeHistories();
  private snapshot: StreamCaptureSpikeSnapshot = this.createInitialSnapshot();

  constructor(private readonly environment: StreamCaptureSpikeEnvironment = defaultEnvironment()) {}

  attemptReceiverAudioArm(): Promise<boolean> {
    const context =
      this.receiverAudioContext && this.receiverAudioContext.state !== "closed"
        ? this.receiverAudioContext
        : this.environment.createAudioContext();
    this.receiverAudioContext = context;

    // Invoke resume before this method yields so Safari can use transient activation when the
    // caller still has it. The menu path may already have awaited autosave lookup, so the later
    // one-shot fallback remains the authoritative compatibility path.
    const resume = context.state === "suspended" ? context.resume() : Promise.resolve();
    this.updateSnapshot({ receiverAudioContextState: context.state });
    return resume.then(
      () => {
        this.updateSnapshot({ receiverAudioContextState: context.state });
        return context.state === "running";
      },
      (error: unknown) => {
        this.updateSnapshot({
          error: errorMessage(error),
          receiverAudioContextState: context.state
        });
        return false;
      }
    );
  }

  async start(adapter: StreamCaptureAdapter, mount: HTMLElement): Promise<void> {
    if (!this.receiverAudioContext || this.receiverAudioContext.state === "closed") {
      throw new Error("Receiver audio must be prepared before start()");
    }

    this.teardownLoopback(true);
    this.adapter = adapter;
    this.snapshot = this.createInitialSnapshot();
    this.snapshot.receiverAudioContextState = this.receiverAudioContext.state;
    this.snapshot.status = "starting";
    this.buildUi(mount);
    this.render();

    try {
      await this.startLoopback();
    } catch (error) {
      this.updateSnapshot({ error: errorMessage(error), status: "failed" });
      this.teardownLoopback(true);
      throw error;
    }
  }

  stop(): void {
    this.teardownLoopback(true);
    this.adapter?.stop();
    this.adapter = undefined;

    this.receiverAudioSource?.disconnect();
    this.receiverAudioSource = undefined;
    this.receiverAnalyser?.disconnect();
    this.receiverAnalyser = undefined;
    const receiverAudioContext = this.receiverAudioContext;
    this.receiverAudioContext = undefined;
    if (receiverAudioContext && receiverAudioContext.state !== "closed") {
      void receiverAudioContext.close();
    }

    if (this.preview) {
      this.preview.srcObject = null;
    }
    this.preview = undefined;
    this.fallbackButton = undefined;
    this.fallbackMount = undefined;
    this.statusOutput = undefined;
    this.root?.remove();
    this.root = undefined;
    this.snapshot = this.createInitialSnapshot();
  }

  getSnapshot(): StreamCaptureSpikeSnapshot {
    return { ...this.snapshot };
  }

  private createInitialSnapshot(): StreamCaptureSpikeSnapshot {
    return {
      status: "idle",
      width: STREAM_CAPTURE_WIDTH,
      height: STREAM_CAPTURE_HEIGHT,
      fps: STREAM_CAPTURE_FPS,
      captureVideoTrackCount: 0,
      captureAudioTrackCount: 0,
      receivedVideoTrackCount: 0,
      receivedAudioTrackCount: 0,
      captureAudioContextState: "unavailable",
      captureAudioLevelRms: 0,
      receiverAudioContextState: "unavailable",
      receiverAudioLevelRms: 0,
      inboundVideoFramesDecoded: 0,
      inboundAudioPacketsReceived: 0,
      inboundAudioTotalEnergy: 0,
      inboundAudioEnergyChanging: false,
      audioActivityChanging: false,
      previewCurrentTime: 0,
      previewPaused: true,
      previewPlayError: null,
      previewPresentationReady: false,
      previewReadyState: 0,
      previewTimeChanging: false,
      previewVideoHeight: 0,
      previewVideoWidth: 0,
      receivedVideoActivityChanging: false,
      receivedVideoBlack: false,
      receivedVideoContentVisible: false,
      videoPath: "bridge",
      bridgeReady: false,
      bridgePlayError: null,
      sourceContextType: "unknown",
      sourcePreserveDrawingBuffer: null,
      videoPipeline: createPendingVideoPipeline(),
      ready: false,
      fallbackAvailable: false,
      fallbackUsed: false,
      error: null
    };
  }

  private createVideoProbeHistories(): Record<VideoProbeStage, VideoProbeHistory> {
    return {
      source: createVideoProbeHistory(),
      bridge: createVideoProbeHistory(),
      staging: createVideoProbeHistory(),
      receiver: createVideoProbeHistory()
    };
  }

  private probeVideoStage(
    stage: VideoProbeStage,
    sample: StreamCaptureFrameSample,
    countPoll = true
  ): { analysis: ReturnType<typeof analyzeVideoFrame>; snapshot: VideoProbeStageSnapshot } {
    const history = this.videoProbeHistories[stage];
    const analysis = analyzeVideoFrame(sample.pixels, history.previousFrame);

    if (sample.readback === "ok" && sample.pixels) {
      history.previousFrame = new Uint8ClampedArray(sample.pixels);
      if (analysis.contentVisible) {
        history.blackPolls = 0;
      } else if (countPoll) {
        history.blackPolls += 1;
      }
      if (analysis.contentVisible && analysis.changing) {
        history.recentActivityPolls = VIDEO_ACTIVITY_GRACE_POLLS;
      } else if (countPoll && history.recentActivityPolls > 0) {
        history.recentActivityPolls -= 1;
      }
    } else if (sample.readback !== "not-ready") {
      history.previousFrame = null;
      history.blackPolls = 0;
      history.recentActivityPolls = 0;
    }

    let verdict: VideoProbeVerdict = "pending";
    if (sample.readback === "tainted" || sample.readback === "failed") {
      verdict = "unreadable";
    } else if (sample.readback === "ok") {
      if (history.blackPolls >= BLACK_VIDEO_POLL_LIMIT) {
        verdict = "black";
      } else if (analysis.contentVisible && history.recentActivityPolls > 0) {
        verdict = "ok";
      } else if (analysis.contentVisible && analysis.changedPixelRatio !== null) {
        verdict = "static";
      }
    }

    return {
      analysis,
      snapshot: {
        verdict,
        readback: sample.readback,
        visiblePixelRatio: analysis.visiblePixelRatio,
        changedPixelRatio: analysis.changedPixelRatio,
        detail: sample.detail
      }
    };
  }

  private buildUi(mount: HTMLElement): void {
    const root = this.environment.document.createElement("div");
    root.dataset.streamCaptureSpike = "true";
    const preview = this.environment.document.createElement("video");
    preview.muted = true;
    preview.autoplay = true;
    preview.playsInline = true;
    preview.width = STREAM_CAPTURE_WIDTH;
    preview.height = STREAM_CAPTURE_HEIGHT;
    preview.addEventListener("playing", () => {
      if (
        preview === this.preview &&
        preview.srcObject !== null &&
        preview.srcObject === this.previewPlaySource
      ) {
        this.confirmPreviewPlayback();
      }
    });
    preview.addEventListener("loadedmetadata", () => this.attemptPreviewPlayback());
    preview.addEventListener("canplay", () => this.attemptPreviewPlayback());
    const statusOutput = this.environment.document.createElement("pre");
    const fallbackMount = this.environment.document.createElement("div");
    root.append(preview, statusOutput, fallbackMount);
    mount.appendChild(root);
    this.root = root;
    this.preview = preview;
    this.statusOutput = statusOutput;
    this.fallbackMount = fallbackMount;
  }

  private async startLoopback(): Promise<boolean> {
    const adapter = this.adapter;
    if (!adapter) {
      throw new Error("Stream capture adapter is unavailable");
    }
    const generation = ++this.pollGeneration;
    const isCurrent = (): boolean => generation === this.pollGeneration;

    try {
      const session = adapter.start();
      this.session = session;
      const capture = session.getSnapshot();
      this.updateSnapshot({
        status: "waiting",
        captureVideoTrackCount: session.stream.getVideoTracks().length,
        captureAudioTrackCount: session.stream.getAudioTracks().length,
        captureAudioContextState: capture.audioContextState,
        captureAudioLevelRms: capture.audioLevelRms,
        videoPath: capture.videoPath,
        bridgeReady: capture.bridgeReady,
        bridgePlayError: capture.bridgePlayError,
        sourceContextType: capture.sourceContextType,
        sourcePreserveDrawingBuffer: capture.sourcePreserveDrawingBuffer,
        fallbackAvailable:
          session.stream.getAudioTracks().length === 0 || capture.audioContextState !== "running"
      });

      const senderPeer = this.environment.createPeerConnection({ iceServers: [] });
      const receiverPeer = this.environment.createPeerConnection({ iceServers: [] });
      this.senderPeer = senderPeer;
      this.receiverPeer = receiverPeer;

      const candidatesForReceiver: RTCIceCandidate[] = [];
      const candidatesForSender: RTCIceCandidate[] = [];
      let receiverHasRemoteDescription = false;
      let senderHasRemoteDescription = false;
      senderPeer.onicecandidate = (event) => {
        if (!isCurrent() || !event.candidate) {
          return;
        }
        if (receiverHasRemoteDescription) {
          void receiverPeer.addIceCandidate(event.candidate).catch(() => undefined);
        } else {
          candidatesForReceiver.push(event.candidate);
        }
      };
      receiverPeer.onicecandidate = (event) => {
        if (!isCurrent() || !event.candidate) {
          return;
        }
        if (senderHasRemoteDescription) {
          void senderPeer.addIceCandidate(event.candidate).catch(() => undefined);
        } else {
          candidatesForSender.push(event.candidate);
        }
      };
      receiverPeer.ontrack = (event) => {
        if (isCurrent()) {
          this.receiveTrack(event.track);
        }
      };

      for (const track of session.stream.getTracks()) {
        senderPeer.addTrack(track, session.stream);
      }

      const offer = await senderPeer.createOffer();
      if (!isCurrent()) return false;
      await senderPeer.setLocalDescription(offer);
      if (!isCurrent()) return false;
      await receiverPeer.setRemoteDescription(offer);
      if (!isCurrent()) return false;
      receiverHasRemoteDescription = true;
      await Promise.all(
        candidatesForReceiver
          .splice(0)
          .map((candidate) => receiverPeer.addIceCandidate(candidate))
      );
      if (!isCurrent()) return false;
      const answer = await receiverPeer.createAnswer();
      if (!isCurrent()) return false;
      await receiverPeer.setLocalDescription(answer);
      if (!isCurrent()) return false;
      await senderPeer.setRemoteDescription(answer);
      if (!isCurrent()) return false;
      senderHasRemoteDescription = true;
      await Promise.all(
        candidatesForSender.splice(0).map((candidate) => senderPeer.addIceCandidate(candidate))
      );
      if (!isCurrent()) return false;

      if (this.snapshot.fallbackAvailable) {
        this.showFallback();
      }
      this.statsTimer = this.environment.setInterval(() => {
        void this.pollStats(generation);
      }, STATS_POLL_INTERVAL_MS);
      await this.pollStats(generation, false);
      return isCurrent();
    } catch (error) {
      if (!isCurrent()) {
        return false;
      }
      throw error;
    }
  }

  private receiveTrack(track: MediaStreamTrack): void {
    this.receivedTracks.add(track);
    const videoTracks = [...this.receivedTracks].filter((item) => item.kind === "video");
    const audioTracks = [...this.receivedTracks].filter((item) => item.kind === "audio");
    if (track.kind === "video" && this.preview && this.preview.srcObject === null) {
      const previewStream = this.environment.createMediaStream([track]);
      this.resetPreviewPlayback(previewStream);
      this.preview.srcObject = previewStream;
      if (this.preview.readyState >= 1) {
        this.attemptPreviewPlayback();
      }
    }

    if (track.kind === "audio") {
      this.connectReceiverAudio(audioTracks);
    }
    this.updateSnapshot({
      receivedVideoTrackCount: videoTracks.length,
      receivedAudioTrackCount: audioTracks.length
    });
  }

  private resetPreviewPlayback(source: MediaProvider | null = null): void {
    this.previewPlayAttempts = 0;
    this.previewPlayAttemptToken += 1;
    this.previewPlayInFlight = false;
    this.previewPlaybackConfirmed = false;
    this.previewRetryPending = false;
    this.previewPlaySource = source;
  }

  private confirmPreviewPlayback(): void {
    this.previewPlayInFlight = false;
    this.previewPlaybackConfirmed = true;
    this.previewRetryPending = false;
    if (this.snapshot.previewPlayError !== null) {
      this.updateSnapshot({ previewPlayError: null });
    }
  }

  private attemptPreviewPlayback(): void {
    const preview = this.preview;
    const source = this.previewPlaySource;
    if (
      !preview ||
      !source ||
      preview.srcObject !== source ||
      this.previewPlaybackConfirmed ||
      this.previewPlayInFlight ||
      this.previewPlayAttempts >= 2 ||
      preview.readyState < (this.previewPlayAttempts === 0 ? 1 : 2) ||
      (this.previewPlayAttempts > 0 && !this.previewRetryPending)
    ) {
      return;
    }

    this.previewRetryPending = false;
    this.previewPlayInFlight = true;
    const generation = this.pollGeneration;
    const attempt = ++this.previewPlayAttempts;
    const token = ++this.previewPlayAttemptToken;
    const isCurrent = (): boolean =>
      generation === this.pollGeneration &&
      preview === this.preview &&
      source === this.previewPlaySource &&
      preview.srcObject === source &&
      token === this.previewPlayAttemptToken;
    const reject = (error: unknown): void => {
      if (!isCurrent() || this.previewPlaybackConfirmed) {
        return;
      }
      this.previewPlayInFlight = false;
      if (isAbortError(error) && attempt < 2) {
        this.previewRetryPending = true;
        this.updateSnapshot({ previewPlayError: null, ready: false });
        return;
      }
      this.updateSnapshot({ previewPlayError: errorMessage(error), ready: false });
    };

    try {
      void preview.play().then(
        () => {
          if (isCurrent()) {
            this.confirmPreviewPlayback();
          }
        },
        reject
      );
    } catch (error) {
      reject(error);
    }
  }

  private connectReceiverAudio(audioTracks: MediaStreamTrack[]): void {
    const context = this.receiverAudioContext;
    if (!context || audioTracks.length === 0) {
      return;
    }

    this.receiverAudioSource?.disconnect();
    this.receiverAnalyser?.disconnect();
    const source = context.createMediaStreamSource(this.environment.createMediaStream(audioTracks));
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(context.destination);
    this.receiverAudioSource = source;
    this.receiverAnalyser = analyser;
  }

  private async pollStats(generation: number, countSilence = true): Promise<void> {
    const receiverPeer = this.receiverPeer;
    const session = this.session;
    if (!receiverPeer || !session || generation !== this.pollGeneration) {
      return;
    }

    try {
      const [report, capture] = await Promise.all([
        receiverPeer.getStats(),
        Promise.resolve(session.getSnapshot())
      ]);
      if (generation !== this.pollGeneration) {
        return;
      }
      const totals = readInboundStats(report);
      const rms = calculateRms(this.receiverAnalyser);
      const preview = this.preview;
      if (this.previewRetryPending && preview?.readyState && preview.readyState >= 2) {
        this.attemptPreviewPlayback();
      }
      const captureStageSamples = session.sampleVideoStages();
      const sourceProbe = this.probeVideoStage(
        "source",
        captureStageSamples.source,
        countSilence
      );
      const bridgeProbe = this.probeVideoStage(
        "bridge",
        captureStageSamples.bridge,
        countSilence
      );
      const stagingProbe = this.probeVideoStage(
        "staging",
        captureStageSamples.staging,
        countSilence
      );
      const receiverRead: StreamCaptureFrameSample = preview
        ? this.environment.readVideoFrame(preview)
        : { readback: "not-ready", pixels: null, detail: null };
      const receiverProbe = this.probeVideoStage("receiver", receiverRead, countSilence);
      const videoFrameAnalysis = receiverProbe.analysis;
      const videoPipelineStages = {
        source: sourceProbe.snapshot,
        bridge: bridgeProbe.snapshot,
        staging: stagingProbe.snapshot,
        receiver: receiverProbe.snapshot
      };
      const videoPipeline: VideoPipelineSnapshot = {
        ...videoPipelineStages,
        diagnosis: diagnoseVideoPipeline(videoPipelineStages)
      };
      if (receiverRead.readback !== "ok") {
        // A failed or unavailable pixel readback is not evidence that the
        // received video is black. Drop any prior black latch so the panel
        // reports the current unreadable condition instead.
        this.blackVideoPolls = 0;
      } else if (videoFrameAnalysis.contentVisible) {
        this.blackVideoPolls = 0;
      } else if (
        countSilence &&
        totals.videoFramesDecoded > 0
      ) {
        this.blackVideoPolls += 1;
      }
      if (videoFrameAnalysis.changing && videoFrameAnalysis.contentVisible) {
        this.recentVideoActivityPolls = VIDEO_ACTIVITY_GRACE_POLLS;
      } else if (countSilence && this.recentVideoActivityPolls > 0) {
        this.recentVideoActivityPolls -= 1;
      }
      const previewCurrentTime = preview?.currentTime ?? 0;
      const previewTimeChanging =
        this.previousPreviewCurrentTime !== null &&
        previewCurrentTime > this.previousPreviewCurrentTime + 0.001;
      this.previousPreviewCurrentTime = previewCurrentTime;
      if (previewTimeChanging) {
        this.recentPreviewTimePolls = VIDEO_ACTIVITY_GRACE_POLLS;
      } else if (countSilence && this.recentPreviewTimePolls > 0) {
        this.recentPreviewTimePolls -= 1;
      }
      const liveVideoTrackCount = this.receivedTrackCount("video", true);
      const liveAudioTrackCount = this.receivedTrackCount("audio", true);
      const previewPresentationReady = Boolean(
        preview &&
        liveVideoTrackCount > 0 &&
        !preview.paused &&
        preview.readyState >= 2 &&
        preview.currentTime > 0 &&
        preview.videoWidth > 0 &&
        preview.videoHeight > 0 &&
        this.recentPreviewTimePolls > 0
      );
      if (previewPresentationReady) {
        this.previewPlaybackConfirmed = true;
        this.previewPlayInFlight = false;
        this.previewRetryPending = false;
      }
      const previewPlayError = previewPresentationReady ? null : this.snapshot.previewPlayError;
      const receivedVideoBlack = this.blackVideoPolls >= BLACK_VIDEO_POLL_LIMIT;
      const packetsChanging = totals.audioPacketsReceived > this.previousInboundAudioPackets;
      const energyChanging = totals.audioTotalEnergy > this.previousInboundAudioEnergy;
      const audioActivityChanging =
        rms > AUDIO_ACTIVITY_THRESHOLD && (packetsChanging || energyChanging);
      this.previousInboundAudioPackets = totals.audioPacketsReceived;
      this.previousInboundAudioEnergy = totals.audioTotalEnergy;

      if (audioActivityChanging) {
        this.audioActivityObserved = true;
        this.silentPolls = 0;
      } else if (countSilence) {
        this.silentPolls += 1;
      }
      const ready =
        liveVideoTrackCount > 0 &&
        liveAudioTrackCount > 0 &&
        totals.videoFramesDecoded > 0 &&
        previewPresentationReady &&
        videoFrameAnalysis.contentVisible &&
        this.recentVideoActivityPolls > 0 &&
        !receivedVideoBlack &&
        this.receiverAudioContext?.state === "running" &&
        this.audioActivityObserved &&
        capture.bridgeReady &&
        !capture.bridgePlayError &&
        !previewPlayError;
      const needsFallback =
        liveAudioTrackCount === 0 ||
        capture.audioTrackCount === 0 ||
        capture.audioContextState !== "running" ||
        this.receiverAudioContext?.state !== "running" ||
        (!this.audioActivityObserved && this.silentPolls >= SILENT_POLL_LIMIT);
      const failed =
        (this.snapshot.fallbackUsed && needsFallback) ||
        receivedVideoBlack ||
        Boolean(previewPlayError) ||
        Boolean(capture.bridgePlayError) ||
        [
          "source-capture-failed",
          "staging-copy-failed",
          "downstream-capture-failed",
          "bridge-readback-unavailable",
          "staging-readback-unavailable",
          "receiver-readback-unavailable"
        ].includes(videoPipeline.diagnosis);

      this.updateSnapshot({
        status: ready ? "ready" : failed ? "failed" : needsFallback ? "fallback" : "waiting",
        captureVideoTrackCount: capture.videoTrackCount,
        captureAudioTrackCount: capture.audioTrackCount,
        captureAudioContextState: capture.audioContextState,
        captureAudioLevelRms: capture.audioLevelRms,
        videoPath: capture.videoPath,
        bridgeReady: capture.bridgeReady,
        bridgePlayError: capture.bridgePlayError,
        sourceContextType: capture.sourceContextType,
        sourcePreserveDrawingBuffer: capture.sourcePreserveDrawingBuffer,
        receiverAudioContextState: this.receiverAudioContext?.state ?? "unavailable",
        receiverAudioLevelRms: rms,
        inboundVideoFramesDecoded: totals.videoFramesDecoded,
        inboundAudioPacketsReceived: totals.audioPacketsReceived,
        inboundAudioTotalEnergy: totals.audioTotalEnergy,
        inboundAudioEnergyChanging: energyChanging,
        audioActivityChanging,
        previewCurrentTime,
        previewPaused: preview?.paused ?? true,
        previewPlayError,
        previewPresentationReady,
        previewReadyState: preview?.readyState ?? 0,
        previewTimeChanging,
        previewVideoHeight: preview?.videoHeight ?? 0,
        previewVideoWidth: preview?.videoWidth ?? 0,
        receivedAudioTrackCount: liveAudioTrackCount,
        receivedVideoActivityChanging: videoFrameAnalysis.changing,
        receivedVideoBlack,
        receivedVideoContentVisible: videoFrameAnalysis.contentVisible,
        receivedVideoTrackCount: liveVideoTrackCount,
        videoPipeline,
        ready,
        fallbackAvailable: needsFallback && !this.snapshot.fallbackUsed
      });
      if (needsFallback && !this.snapshot.fallbackUsed) {
        this.showFallback();
      } else {
        this.removeFallback();
      }
    } catch (error) {
      if (generation !== this.pollGeneration) {
        return;
      }
      this.updateSnapshot({ error: errorMessage(error), ready: false, status: "failed" });
    }
  }

  private showFallback(): void {
    if (this.snapshot.fallbackUsed || this.fallbackButton || !this.fallbackMount) {
      return;
    }
    const button = this.environment.document.createElement("button");
    button.type = "button";
    button.textContent = FALLBACK_LABEL;
    button.addEventListener("click", () => {
      void this.runFallback();
    });
    this.fallbackMount.appendChild(button);
    this.fallbackButton = button;
    this.updateSnapshot({ fallbackAvailable: true, status: "fallback" });
  }

  private removeFallback(): void {
    this.fallbackButton?.remove();
    this.fallbackButton = undefined;
  }

  private async runFallback(): Promise<void> {
    if (this.snapshot.fallbackUsed) {
      return;
    }
    this.updateSnapshot({
      fallbackAvailable: false,
      fallbackUsed: true,
      ready: false,
      status: "waiting"
    });
    this.removeFallback();

    const fallbackGeneration = this.pollGeneration;
    const adapter = this.adapter;
    const receiverAudioContext = this.receiverAudioContext;
    const errors: string[] = [];
    // Invoke both resume operations before yielding so the fallback click remains the
    // initiating user gesture for both the emulator and receiver audio contexts.
    const adapterResume = adapter?.resumeAudio() ?? Promise.resolve(false);
    const receiverResume =
      receiverAudioContext?.state === "suspended"
        ? receiverAudioContext.resume()
        : Promise.resolve();
    const resumeResults = await Promise.allSettled([adapterResume, receiverResume]);
    if (
      fallbackGeneration !== this.pollGeneration ||
      adapter !== this.adapter ||
      receiverAudioContext !== this.receiverAudioContext
    ) {
      return;
    }
    for (const result of resumeResults) {
      if (result.status === "rejected") {
        errors.push(errorMessage(result.reason));
      }
    }

    this.teardownLoopback(true);
    try {
      const restarted = await this.startLoopback();
      if (!restarted) {
        return;
      }
      if (errors.length > 0) {
        this.updateSnapshot({ error: errors.join("; ") });
      }
    } catch (error) {
      errors.push(errorMessage(error));
      this.updateSnapshot({ error: errors.join("; "), ready: false, status: "failed" });
    }
  }

  private teardownLoopback(stopSession: boolean): void {
    this.pollGeneration += 1;
    if (this.statsTimer !== 0) {
      this.environment.clearInterval(this.statsTimer);
      this.statsTimer = 0;
    }
    this.senderPeer?.close();
    this.receiverPeer?.close();
    this.senderPeer = undefined;
    this.receiverPeer = undefined;
    this.receiverAudioSource?.disconnect();
    this.receiverAudioSource = undefined;
    this.receiverAnalyser?.disconnect();
    this.receiverAnalyser = undefined;
    this.receivedTracks.clear();
    this.resetPreviewPlayback();
    this.previousInboundAudioPackets = 0;
    this.previousInboundAudioEnergy = 0;
    this.previousPreviewCurrentTime = null;
    this.recentPreviewTimePolls = 0;
    this.recentVideoActivityPolls = 0;
    this.blackVideoPolls = 0;
    this.videoProbeHistories = this.createVideoProbeHistories();
    this.audioActivityObserved = false;
    this.silentPolls = 0;
    this.updateSnapshot({
      audioActivityChanging: false,
      captureAudioLevelRms: 0,
      inboundAudioPacketsReceived: 0,
      inboundAudioTotalEnergy: 0,
      inboundAudioEnergyChanging: false,
      inboundVideoFramesDecoded: 0,
      previewCurrentTime: 0,
      previewPaused: true,
      previewPlayError: null,
      previewPresentationReady: false,
      previewReadyState: 0,
      previewTimeChanging: false,
      previewVideoHeight: 0,
      previewVideoWidth: 0,
      ready: false,
      receivedAudioTrackCount: 0,
      receivedVideoActivityChanging: false,
      receivedVideoBlack: false,
      receivedVideoContentVisible: false,
      receivedVideoTrackCount: 0,
      receiverAudioLevelRms: 0,
      bridgeReady: false,
      bridgePlayError: null,
      sourceContextType: "unknown",
      sourcePreserveDrawingBuffer: null,
      videoPipeline: createPendingVideoPipeline()
    });
    if (this.preview) {
      this.preview.srcObject = null;
    }
    if (stopSession) {
      this.session?.stop();
      this.session = undefined;
    }
  }

  private receivedTrackCount(kind: "audio" | "video", liveOnly = false): number {
    return [...this.receivedTracks].filter(
      (track) => track.kind === kind && (!liveOnly || track.readyState === "live")
    ).length;
  }

  private updateSnapshot(update: Partial<StreamCaptureSpikeSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...update };
    this.render();
  }

  private render(): void {
    if (!this.statusOutput) {
      return;
    }
    const snapshot = this.snapshot;
    this.statusOutput.textContent = [
      `영상 경로: ${videoDiagnosisLabel(snapshot.videoPipeline.diagnosis)}`,
      `pipeline source=${snapshot.videoPipeline.source.verdict} bridge=${snapshot.videoPipeline.bridge.verdict} staging=${snapshot.videoPipeline.staging.verdict} receiver=${snapshot.videoPipeline.receiver.verdict}`,
      `${snapshot.width}x${snapshot.height} @ ${snapshot.fps}fps`,
      `capture path=${snapshot.videoPath} bridgeReady=${snapshot.bridgeReady} source=${snapshot.sourceContextType} preserve=${snapshot.sourcePreserveDrawingBuffer ?? "unknown"}`,
      `tracks capture(v=${snapshot.captureVideoTrackCount}, a=${snapshot.captureAudioTrackCount}) received(v=${snapshot.receivedVideoTrackCount}, a=${snapshot.receivedAudioTrackCount})`,
      `contexts capture=${snapshot.captureAudioContextState} receiver=${snapshot.receiverAudioContextState}`,
      `energy capture=${snapshot.captureAudioLevelRms.toFixed(4)} receiver=${snapshot.receiverAudioLevelRms.toFixed(4)} changing=${snapshot.audioActivityChanging}`,
      `inbound videoFrames=${snapshot.inboundVideoFramesDecoded} audioPackets=${snapshot.inboundAudioPacketsReceived} audioEnergy=${snapshot.inboundAudioTotalEnergy.toFixed(4)} changing=${snapshot.inboundAudioEnergyChanging}`,
      `preview paused=${snapshot.previewPaused} readyState=${snapshot.previewReadyState} time=${snapshot.previewCurrentTime.toFixed(2)} advancing=${snapshot.previewTimeChanging} size=${snapshot.previewVideoWidth}x${snapshot.previewVideoHeight}`,
      `video visible=${snapshot.receivedVideoContentVisible} changing=${snapshot.receivedVideoActivityChanging} black=${snapshot.receivedVideoBlack}`,
      `status=${snapshot.status} ready=${snapshot.ready} fallback=${snapshot.fallbackAvailable ? "available" : snapshot.fallbackUsed ? "used" : "none"}`,
      ...(snapshot.bridgePlayError ? [`bridgeError=${snapshot.bridgePlayError}`] : []),
      ...(snapshot.previewPlayError ? [`previewError=${snapshot.previewPlayError}`] : []),
      ...(snapshot.error ? [`error=${snapshot.error}`] : [])
    ].join("\n");
  }
}
